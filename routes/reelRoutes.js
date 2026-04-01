const express = require("express");
const mongoose = require('mongoose');
const router = express.Router();
const Comment = require("../models/Comment");
const Reel = require("../models/Reel");
const User = require("../models/Users");
const Music = require("../models/Music"); // <-- import Music model
const multer = require("multer");
const logUserAction = require("../utils/logUserAction");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const tmp = require("tmp");
const http = require("http");
const https = require("https");
const os = require("os");
const ffprobeStatic = require('ffprobe-static');
const { uploadToS3 } = require("../lib/s3");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const adminAuth = require("../middleware/adminAuth");
const checkPermission = require("../middleware/checkPermission");
const createNotification = require("../utils/createNotification");
const logError = require("../utils/logError");
const { generateShortLink } = require("../utils/shortLink");
// ---------- Adaptive compressor (paste after ffmpeg.setFfmpegPath(...)) ----------
async function compressVideo(inputPath, outputPath) {
    const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });

    const video = metadata.streams.find(s => s.codec_type === "video");
    const width = video.width;
    const height = video.height;
    const duration = parseFloat(video.duration); // seconds

    const originalSizeMB = (fs.statSync(inputPath).size / (1024 * 1024));

    let crf, bps, scaleFilter;

    // ---------------------------
    // ⭐ 1 to 3 minute category ⭐
    // ---------------------------
    if (duration >= 60 && duration <= 180) {

        if (originalSizeMB <= 40) {
            // Small source → high quality
            crf = 23;
            bps = 1100;
        }

        else if (originalSizeMB <= 100) {
            // Medium source → balanced
            crf = 25;
            bps = 900;
        }
        else {
            // ⭐ Large source → MORE compression but SAFE ⭐
            crf = 27;
            bps = 700;   // reduce bitrate
        }

        scaleFilter = "scale=720:-2";
    }

    // ---------------------------
    // ⭐ Other durations ⭐
    // ---------------------------
    else if (duration < 60) {
        // Short videos
        crf = 22;
        bps = 1500;
        scaleFilter = "scale=720:-2";
    }
    else if (duration > 180) {
        // Long videos
        crf = 28;
        bps = 650;
        scaleFilter = "scale=720:-2";
    }

    // If video resolution already low → use lower scale
    if (width < 1280) {
        scaleFilter = "scale=540:-2";
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoFilters(scaleFilter)
            .outputOptions([
                "-c:v libx264",
                `-b:v ${bps}k`,
                `-maxrate ${bps}k`,
                `-bufsize ${bps * 2}k`,
                `-crf ${crf}`,
                "-preset veryfast",
                "-c:a aac",
                "-b:a 128k",
                "-movflags +faststart",
                "-y"
            ])
            .save(outputPath)
            .on("end", resolve)
            .on("error", reject);
    });
}


// -------------------------------------------------------------------------------

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 } // allow up to 200MB
});
/**
 * Uses ffprobe to get the duration of an audio/video file.
 * @param {string} filePath - Path to the local file.
 * @returns {Promise<number>} Duration in seconds (rounded).
 */
ffmpeg.setFfprobePath(ffprobeStatic.path);
function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            const duration = metadata?.format?.duration;
            if (duration && !isNaN(parseFloat(duration))) {
                resolve(Math.round(parseFloat(duration)));
            } else {
                // If duration cannot be determined, resolve to 0 or a sensible default
                resolve(0);
            }
        });
    });
}

// =================================================================
// === 1. DOWNLOAD HELPER (Unchanged) ===
// =================================================================

async function downloadFileToTemp(url, ext = '.tmp') {
    const MAX_REDIRECTS = 5;
    let redirects = 0;
    let currentUrl = url;
    const tmpFile = tmp.fileSync({ postfix: ext });

    return new Promise((resolve, reject) => {

        function getFile(fileUrl) {
            if (redirects >= MAX_REDIRECTS) {
                tmpFile.removeCallback();
                return reject(new Error('Exceeded maximum redirects.'));
            }

            const getter = (fileUrl.startsWith("http://") ? http : https);
            getter.get(fileUrl, (response) => {
                const statusCode = response.statusCode;

                // 1. Handle Redirects (3xx)
                if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
                    redirects++;
                    currentUrl = new URL(response.headers.location, fileUrl).href; // Resolve relative redirects
                    response.resume(); // Consume the response data
                    return getFile(currentUrl); // Recursive call to follow the redirect
                }

                // 2. Handle Success (200)
                if (statusCode === 200) {
                    const file = fs.createWriteStream(tmpFile.name);
                    response.pipe(file);
                    file.on("finish", () => {
                        file.close(() => resolve(tmpFile));
                    });
                    file.on("error", (err) => {
                        tmpFile.removeCallback();
                        reject(err);
                    });
                    return;
                }

                // 3. Handle Other Errors
                tmpFile.removeCallback();
                return reject(new Error(`Failed to download file, Status Code: ${statusCode}`));

            }).on("error", (err) => {
                tmpFile.removeCallback();
                reject(err);
            });
        }

        getFile(currentUrl);
    });
}

async function convertMp4UrlToHlsAndUpdateReel(reelId, mp4Url) {
    const tempFiles = [];
    let hlsDir = null;
    try {
        const ext = path.extname(new URL(mp4Url).pathname) || ".mp4";
        const videoTmpObj = await downloadFileToTemp(mp4Url, ext);
        tempFiles.push(videoTmpObj);

        hlsDir = path.join(os.tmpdir(), `hls-${reelId}`);
        fs.mkdirSync(hlsDir, { recursive: true });

        const qualityVariants = [
            { name: "240p", resolution: "426x240", videoBitrate: "250k", audioBitrate: "48k", bandwidth: 380000, hlsTime: 2 },
            { name: "480p", resolution: "854x480", videoBitrate: "800k", audioBitrate: "96k", bandwidth: 1150000, hlsTime: 2 },
            { name: "720p", resolution: "1280x720", videoBitrate: "1400k", audioBitrate: "128k", bandwidth: 2100000, hlsTime: 2 },
        ];

        const generateHLS = async (variant) => {
            const variantDir = path.join(hlsDir, variant.name);
            fs.mkdirSync(variantDir, { recursive: true });

            const segmentPattern = path.join(variantDir, "segment_%03d.ts").replace(/\\/g, '/');
            const outputPath = path.join(variantDir, "index.m3u8").replace(/\\/g, '/');

            return new Promise((resolve, reject) => {
                ffmpeg(videoTmpObj.name)
                    .videoFilters(`scale=${variant.resolution}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .addOutputOptions([
                        "-preset", "veryfast",
                        `-b:v ${variant.videoBitrate}`,
                        `-maxrate ${variant.videoBitrate}`,
                        `-bufsize ${parseInt(variant.videoBitrate) * 2}k`,
                        `-b:a ${variant.audioBitrate}`,
                        "-sc_threshold", "0",
                        "-g", `${24 * variant.hlsTime}`,
                        "-keyint_min", `${24 * variant.hlsTime}`,
                        "-force_key_frames", `expr:gte(t,n_forced*${variant.hlsTime})`,
                        "-hls_time", `${variant.hlsTime}`,
                        "-hls_playlist_type", "vod",
                        "-hls_list_size", "0",
                        "-hls_flags", "independent_segments",
                        "-hls_segment_type", "mpegts",
                        `-hls_segment_filename`, segmentPattern,
                        "-f", "hls",
                        "-y",
                    ])
                    .output(outputPath)
                    .on("end", resolve)
                    .on("error", reject)
                    .run();
            });
        };

        await Promise.all(qualityVariants.map(generateHLS));

        const masterPlaylistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
${qualityVariants.map(variant =>
            `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.resolution}
${variant.name}/index.m3u8`
        ).join('\n')}
`;

        fs.writeFileSync(path.join(hlsDir, "master.m3u8"), masterPlaylistContent);

        for (const variant of qualityVariants) {
            const variantDir = path.join(hlsDir, variant.name);
            const files = fs.readdirSync(variantDir).filter(f => fs.statSync(path.join(variantDir, f)).isFile());
            for (const file of files) {
                const filePath = path.join(variantDir, file);
                const buffer = fs.readFileSync(filePath);
                await uploadToS3(
                    {
                        buffer,
                        originalname: file,
                        mimetype: file.endsWith(".m3u8")
                            ? "application/vnd.apple.mpegurl"
                            : file.endsWith(".ts")
                                ? "video/mp2t"
                                : "application/octet-stream",
                    },
                    `videos/reels/${reelId}/${variant.name}`,
                    true
                );
            }
        }

        const masterBuffer = fs.readFileSync(path.join(hlsDir, "master.m3u8"));
        await uploadToS3(
            { buffer: masterBuffer, originalname: "master.m3u8", mimetype: "application/vnd.apple.mpegurl" },
            `videos/reels/${reelId}`,
            true
        );

        const videoUrl = `https://${process.env.CLOUDFRONT_URL}/videos/reels/${reelId}/master.m3u8`;
        await Reel.findByIdAndUpdate(reelId, {
            videoUrl,
            status: "Published",
            qualityVariants: qualityVariants.map(q => q.name),
        });
    } catch (err) {
        await Reel.findByIdAndUpdate(reelId, { status: "Processing" });
          err.statusCode = err.statusCode || 500;
        await logError(req, err);
        console.error("MP4->HLS migration failed:", err);
    } finally {
        tempFiles.forEach((t) => { try { if (t) t.removeCallback(); } catch (e) { } });
        if (hlsDir) { try { fs.rmSync(hlsDir, { recursive: true, force: true }); } catch (e) { } }
    }
}

// =================================================================
// === 2. WORKER FUNCTION (Updated Logic in Step 3) ===
// =================================================================

/**
 * Executes the full video processing, HLS conversion, and S3 upload.
 */
async function processReelUpload(jobData) {
    console.log(`===== [WORKER: FULL UPLOAD JOB STARTED for user ${jobData.userid}] =====`);
    // --- UPDATED DESTRUCTURING to include externalAudioData ---
    const { videoBuffer, videoOriginalname, thumbBuffer, externalAudioData, ...reelMetadata } = jobData;
    const { user, userid, username, name, caption, musicId, videoStartTime, videoEndTime } = reelMetadata;

    const tempFiles = [];
    let videoFileWithFinalAudioPath = null;
    let finalMusicId = musicId || null;
    let newReelId = null;
    let hlsDir = null;

    try {
        // Step 1: Write uploaded video buffer to temp file
        const inputTmp = tmp.fileSync({ postfix: path.extname(videoOriginalname) });
        tempFiles.push(inputTmp);
        fs.writeFileSync(inputTmp.name, videoBuffer);

        // Step 2: Trim (if requested) + adaptive compress
        const outputTmp = tmp.fileSync({ postfix: ".mp4" });
        tempFiles.push(outputTmp);

        // 1) Trim if user requested a time range
        let videoToCompressPath = inputTmp.name;
        if (videoStartTime && videoEndTime) {
            const startSec = parseFloat(videoStartTime) / 1000;
            const dur = (parseFloat(videoEndTime) - parseFloat(videoStartTime)) / 1000;
            if (dur > 0) {
                const trimmedTmp = tmp.fileSync({ postfix: ".mp4" });
                tempFiles.push(trimmedTmp);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputTmp.name)
                        .seekInput(startSec)
                        .duration(dur)
                        .outputOptions(["-c", "copy", "-y"])
                        .save(trimmedTmp.name)
                        .on("end", resolve)
                        .on("error", reject);
                });

                videoToCompressPath = trimmedTmp.name;
            }
        }

        // 2) Adaptive compression: choose smaller targetBps to reach ~12-15MB for long videos
        // You can tweak targetBps value or pass explicit third arg to compressVideo for custom control
        await compressVideo(videoToCompressPath, outputTmp.name);

        // 3) Log sizes
        try {
            const originalSize = (fs.statSync(inputTmp.name).size / (1024 * 1024)).toFixed(2);
            const compressedSize = (fs.statSync(outputTmp.name).size / (1024 * 1024)).toFixed(2);
            console.log(`📹 Video compression stats for ${videoOriginalname}:`);
            console.log(`   Original size  : ${originalSize} MB`);
            console.log(`   Compressed size: ${compressedSize} MB`);
        } catch (e) {
            e.statusCode = e.statusCode || 500;
            await logError(req, e);
            console.warn("Could not stat files for logging:", e.message);
        }


        // ** Initial path uses the trimmed video with original audio **
        videoFileWithFinalAudioPath = outputTmp.name;


        // Step 3: Handle Audio Logic (Replacement OR Extraction)

        let shouldReplaceAudio = false;
        let audioInputPath = null;
        let audioDuration = 0; // Will be set by ffprobe or video length calculation

        // SCENARIO 1: External Audio Data provided, and no valid Music ID
        if (externalAudioData && externalAudioData.url && (!musicId || !mongoose.Types.ObjectId.isValid(musicId))) {
            console.log("[STEP 3.0] Processing external audio data from body (new Music track)...");

            try {
                const title = externalAudioData.title || "External Sound";
                const artist = externalAudioData.artist || "Unknown Artist";

                // ✅ First check duplicates before downloading
                const existingMusic = await Music.findOne({ title, artist });

                if (existingMusic) {
                    console.log("[INFO] Music already exists. Reusing:", existingMusic._id);

                    finalMusicId = existingMusic._id;
                    shouldReplaceAudio = true;

                    // ✅ MUST download the existing music file for FFmpeg
                    const ext = path.extname(existingMusic.url) || '.mp3';
                    const musicTmpObj = await downloadFileToTemp(existingMusic.url, ext);
                    tempFiles.push(musicTmpObj);
                    audioInputPath = musicTmpObj.name;  // ✅ VALID path for FFmpeg

                } else {
                    // a. Download external audio file
                    const ext = path.extname(new URL(externalAudioData.url).pathname) || '.mp3';
                    const musicTmpObj = await downloadFileToTemp(externalAudioData.url, ext);
                    tempFiles.push(musicTmpObj);
                    audioInputPath = musicTmpObj.name;

                    // b. Get duration
                    audioDuration = await getAudioDuration(audioInputPath);

                    // c. Upload audio
                    const audioBuffer = fs.readFileSync(audioInputPath);
                    const audioUploadResult = await uploadToS3(
                        {
                            buffer: audioBuffer,
                            originalname: `external-sound-${userid}-${Date.now()}${ext}`,
                            mimetype: ext === '.mp3' ? "audio/mp3" : "audio/mpeg",
                        },
                        `audio`
                    );

                    const musicUrl = audioUploadResult;

                    // d. Save NEW music
                    const newMusic = new Music({
                        title,
                        artist,
                        url: musicUrl,
                        duration: audioDuration,
                        uploadedBy: user,
                        thumbnail: externalAudioData.artwork || "",
                    });

                    const savedMusic = await newMusic.save();
                    finalMusicId = savedMusic._id;
                    shouldReplaceAudio = true;
                }

            } catch (e) {
                console.warn("[WARNING] External audio failed:", e.message);
                e.statusCode = e.statusCode || 500;
                await logError(req, e);
                audioInputPath = null;
                finalMusicId = musicId || null;
            }
        }


        // SCENARIO 2: Valid Music ID was provided originally (or was set in SCENARIO 1)
        if (!shouldReplaceAudio && finalMusicId && mongoose.Types.ObjectId.isValid(finalMusicId)) {
            const musicDoc = await Music.findById(finalMusicId);
            if (musicDoc?.url) {
                // Download the music if it's a known track
                console.log("[STEP 3.1] Replacing original audio with existing music...");
                const ext = path.extname(musicDoc.url) || '.mp3';
                const musicTmpObj = await downloadFileToTemp(musicDoc.url, ext);
                tempFiles.push(musicTmpObj);
                audioInputPath = musicTmpObj.name;
                shouldReplaceAudio = true;
            }
        }
        if (shouldReplaceAudio) {
            // Audio Replacement with LOOP till video end
            const replacedTmp = tmp.fileSync({ postfix: ".mp4" });
            tempFiles.push(replacedTmp);

            // 🔑 Get VIDEO duration (seconds)
            const videoDuration = await getAudioDuration(outputTmp.name);

            await new Promise((resolve, reject) => {
                ffmpeg(outputTmp.name)
                    .input(audioInputPath)
                    .inputOptions([
                        "-stream_loop", "-1"   // 🔁 LOOP MUSIC infinitely
                    ])
                    .outputOptions([
                        "-map 0:v:0",          // video from input 0
                        "-map 1:a:0",          // audio from input 1
                        "-c:v copy",           // no re-encode video
                        "-c:a aac",
                        "-b:a 128k",
                        "-t", `${videoDuration}`, // ⏱️ stop at video duration
                        "-y"
                    ])
                    .save(replacedTmp.name)
                    .on("end", resolve)
                    .on("error", reject);
            });

            videoFileWithFinalAudioPath = replacedTmp.name;
        }
        else {
            // SCENARIO 3: No valid Music ID/External Data -> EXTRACT original audio
            // This is the original "else" block, now SCENARIO 3
            console.log("[STEP 3.2] Extracting and saving original audio...");

            // a. Extract audio from the trimmed video (outputTmp.name)
            const extractedAudioTmp = tmp.fileSync({ postfix: ".mp3" });
            tempFiles.push(extractedAudioTmp);

            await new Promise((resolve, reject) => {
                ffmpeg(outputTmp.name)
                    .outputOptions([
                        "-vn",
                        "-c:a libmp3lame",
                        "-b:a 128k",
                        "-y",
                    ])
                    .save(extractedAudioTmp.name)
                    .on("end", resolve)
                    .on("error", reject);
            });

            // b. Upload the audio file to S3
            const audioBuffer = fs.readFileSync(extractedAudioTmp.name);
            const audioUploadResult = await uploadToS3(
                {
                    buffer: audioBuffer,
                    originalname: `original-sound-${userid}-${Date.now()}.mp3`,
                    mimetype: "audio/mp3",
                },
                `audio`
            );

            if (!audioUploadResult) {
                throw new Error("S3 Upload failed to return a URL for the extracted audio.");
            }
            const musicUrl = audioUploadResult;

            // c. Determine audio duration for the Music model
            let originalAudioDuration = 0;
            const videoDurationMs = (parseFloat(videoEndTime) - parseFloat(videoStartTime));
            if (!isNaN(videoDurationMs) && videoDurationMs > 0) {
                originalAudioDuration = Math.round(videoDurationMs / 1000);
            }

            // d. Save new Music document
            const newMusic = new Music({
                title: caption ? `${caption.substring(0, 50)}... (Original Sound)` : "Original Video Sound",
                artist: name || username || 'Unknown User',
                url: musicUrl,
                duration: originalAudioDuration,
                uploadedBy: user,
                thumbnail: '',
            });

            const savedMusic = await newMusic.save();
            finalMusicId = savedMusic._id;
            // videoFileWithFinalAudioPath remains outputTmp.name (trimmed video with original audio)
        }

        const uploaderUser = await User.findById(user);

        // Step 4: Save reel metadata first (to get _id)
        const newReel = new Reel({
            ...reelMetadata,
            music: finalMusicId,
            videoUrl: "",
            thumbnailUrl: "",
            seller_id: uploaderUser?.seller_id || "",
            userseller_id: uploaderUser?.userseller_id || "",

        });
        const savedReel = await newReel.save();
        newReelId = savedReel._id;

        // Step 4.5: Generate and save short link for sharing
     try {
    const uploaderUser = await User.findById(user); // ✅ direct DB se lo

    if (uploaderUser) {
        const realUserId = uploaderUser.userid; // ✅ always correct (UUID ya number jo bhi ho)

        const { slug, shortLink } = generateShortLink(
            savedReel._id,
            realUserId
        );

        savedReel.shortLinks.push({
            slug,
            shortLink,
            generatedForUser: uploaderUser._id,
            generatedAt: new Date()
        });

        await savedReel.save();

        console.log(`[STEP 4.5] Short link generated and saved: ${shortLink}`);
    }
} catch (shortLinkError) {
    shortLinkError.statusCode = shortLinkError.statusCode || 500;
    await logError(req, shortLinkError);
    console.warn("[WARNING] Failed to generate short link (non-blocking):", shortLinkError.message);
}

        console.log("[STEP 5] Generating HLS segments with multiple quality variants...");
        const hlsDir = path.join(os.tmpdir(), `hls-${newReelId}`);
        fs.mkdirSync(hlsDir, { recursive: true });

        // Define quality variants for adaptive streaming
        // Optimized quality variants
        const qualityVariants = [
            {
                name: "240p",
                resolution: "426x240",
                videoBitrate: "250k",
                audioBitrate: "48k",
                bandwidth: 380000,
                hlsTime: 2
            },
            {
                name: "480p",
                resolution: "854x480",
                videoBitrate: "800k",
                audioBitrate: "96k",
                bandwidth: 1150000,
                hlsTime: 2
            },
            {
                name: "720p",
                resolution: "1280x720",
                videoBitrate: "1400k",
                audioBitrate: "128k",
                bandwidth: 2100000,
                hlsTime: 2
            }
        ];





        // Function to generate HLS for one variant
        const generateHLS = async (variant) => {
            const variantDir = path.join(hlsDir, variant.name);
            fs.mkdirSync(variantDir, { recursive: true });

            const segmentPattern = path.join(variantDir, "segment_%03d.ts").replace(/\\/g, '/');
            const outputPath = path.join(variantDir, "index.m3u8").replace(/\\/g, '/');

            return new Promise((resolve, reject) => {
                ffmpeg(videoFileWithFinalAudioPath)
                    .videoFilters(`scale=${variant.resolution}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .addOutputOptions([
                        "-preset", "veryfast",
                        `-b:v ${variant.videoBitrate}`,
                        `-maxrate ${variant.videoBitrate}`,
                        `-bufsize ${parseInt(variant.videoBitrate) * 2}k`,
                        `-b:a ${variant.audioBitrate}`,
                        "-sc_threshold", "0",
                        "-g", `${24 * variant.hlsTime}`,       // Keyframe interval
                        "-keyint_min", `${24 * variant.hlsTime}`,
                        "-force_key_frames", `expr:gte(t,n_forced*${variant.hlsTime})`,
                        "-hls_time", `${variant.hlsTime}`,
                        "-hls_playlist_type", "vod",
                        "-hls_list_size", "0",
                        "-hls_flags", "independent_segments",
                        "-hls_segment_type", "mpegts",
                        `-hls_segment_filename`, segmentPattern,
                        "-f", "hls",
                        "-y",
                    ])
                    .output(outputPath)
                    .on("start", (cmd) => console.log(`[FFmpeg] Command for ${variant.name}: ${cmd}`))
                    .on("end", () => {
                        console.log(`[FFmpeg] Generated ${variant.name} variant`);
                        resolve();
                    })
                    .on("error", (err, stdout, stderr) => {
                        console.error(`[FFmpeg] ERROR for ${variant.name}:`, err.message);
                        console.error(stderr);
                        reject(err);
                    })
                    .run();
            });
        };

        // Run all variants in parallel
        await Promise.all(qualityVariants.map(generateHLS));
        console.log("[STEP 5] All HLS variants generated successfully!");

        // Create master playlist referencing all variants
        console.log("[STEP 5] Creating master playlist...");
        const masterPlaylistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
${qualityVariants.map(variant =>
            `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.resolution}
${variant.name}/index.m3u8`
        ).join('\n')}
`;

        fs.writeFileSync(path.join(hlsDir, "master.m3u8"), masterPlaylistContent);
        console.log("[STEP 5] Master playlist created successfully!");

        // Step 6: Handle thumbnail (upload or generate)
        console.log("[STEP 6] Handling thumbnail...");
        let thumbnailUrl = null;
        if (thumbBuffer) {
            thumbnailUrl = await uploadToS3({ buffer: thumbBuffer, originalname: `thumb-${newReelId}.jpg`, mimetype: "image/jpeg" }, "thumbnails");
        } else {
            const thumbTmp = tmp.fileSync({ postfix: ".jpg" });
            tempFiles.push(thumbTmp);
            await new Promise((resolve, reject) => {
                ffmpeg(videoFileWithFinalAudioPath).screenshots({ timestamps: [0], filename: path.basename(thumbTmp.name), folder: path.dirname(thumbTmp.name), size: "640x?", })
                    .on("end", resolve).on("error", reject);
            });
            const thumbBufferFromFile = fs.readFileSync(thumbTmp.name);
            thumbnailUrl = await uploadToS3({ buffer: thumbBufferFromFile, originalname: `thumb-${newReelId}.jpg`, mimetype: "image/jpeg", }, "thumbnails");
        }

        // Optional: If an original sound was created in Step 3, update its thumbnail
        // This is now covered for both newly created external audio (SCENARIO 1) and extracted audio (SCENARIO 3)
        // because we check if the original musicId was *not* provided, but finalMusicId *was* set.
        if (!musicId && finalMusicId) {
            await Music.findByIdAndUpdate(finalMusicId, { thumbnail: thumbnailUrl });
        }


        // -------------------- STEP 7 (REPLACE EXISTING CODE) --------------------
        // Upload all HLS files to S3 (preserve filenames under videos/reels/<newReelId>/...)
        console.log("[STEP 7] Uploading HLS files to S3...");

        try {
            // Get list of variant folders (skip non-directories)
            const variantFolders = fs.readdirSync(hlsDir).filter((name) => {
                const p = path.join(hlsDir, name);
                return fs.existsSync(p) && fs.statSync(p).isDirectory();
            });

            // Small concurrency control: number of parallel uploads
            const MAX_CONCURRENT = 4;
            const uploadQueue = [];

            // Helper to upload a single file buffer -> S3 under a folder preserving filename
            const uploadFileBuffer = async (buffer, filename, s3Folder) => {
                const mimetype = filename.endsWith(".m3u8")
                    ? "application/vnd.apple.mpegurl"
                    : filename.endsWith(".ts")
                        ? "video/mp2t"
                        : filename.endsWith(".mp4")
                            ? "video/mp4"
                            : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                                ? "image/jpeg"
                                : filename.endsWith(".png")
                                    ? "image/png"
                                    : "application/octet-stream";

                await uploadToS3(
                    {
                        buffer,
                        originalname: filename,
                        mimetype,
                    },
                    s3Folder,
                    true // preserve filename
                );
            };

            // Upload each variant folder's files
            for (const folderName of variantFolders) {
                const variantDir = path.join(hlsDir, folderName);
                const files = fs.readdirSync(variantDir).filter(f => fs.statSync(path.join(variantDir, f)).isFile());

                console.log(`[STEP 7] Preparing upload for variant: ${folderName} (${files.length} files)`);

                for (const file of files) {
                    const filePath = path.join(variantDir, file);
                    const buffer = fs.readFileSync(filePath);
                    const s3Folder = `videos/reels/${newReelId}/${folderName}`; // e.g. videos/reels/abcd123/360p

                    // push upload promise to queue, but throttle concurrency
                    const p = (async () => {
                        try {
                            await uploadFileBuffer(buffer, file, s3Folder);
                            console.log(`[STEP 7] Uploaded ${folderName}/${file}`);
                        } catch (err) {
                            console.error(`[STEP 7] Failed upload ${folderName}/${file}:`, err.message || err);
                            throw err;
                        }
                    })();

                    uploadQueue.push(p);

                    // throttle: if queue length hits MAX_CONCURRENT, await the first to finish
                    if (uploadQueue.length >= MAX_CONCURRENT) {
                        // wait for any one to finish (Promise.race), then remove finished ones
                        await Promise.race(uploadQueue).catch(e => { /* allow individual upload errors to bubble below */ });
                        // remove settled promises from array
                        const settled = await Promise.allSettled(uploadQueue);
                        // keep only pending ones
                        const pending = [];
                        for (let i = 0; i < settled.length; i++) {
                            if (settled[i].status === "pending") pending.push(uploadQueue[i]);
                        }
                        // replace queue with pending (note: in Node Promise.allSettled returns resolved immediately — we instead
                        // rebuild by filtering out fulfilled/rejected entries)
                        uploadQueue.length = 0;
                        // Rebuild with only unresolved promises is tricky; simpler approach: await all to finish in next step.
                        // To keep implementation simple and robust, if we've hit concurrency limit we await Promise.all of current queue
                        await Promise.allSettled(uploadQueue);
                        uploadQueue.length = 0;
                    }
                } // end files loop

                // After iterating files, flush any remaining in queue
                if (uploadQueue.length > 0) {
                    await Promise.allSettled(uploadQueue);
                    uploadQueue.length = 0;
                }

                console.log(`[STEP 7] Finished uploading variant: ${folderName}`);
            } // end variantFolders loop

            // -------------------- Upload master playlist last --------------------
            const masterPath = path.join(hlsDir, "master.m3u8");
            if (!fs.existsSync(masterPath)) {
                throw new Error("master.m3u8 not found in HLS directory");
            }

            const masterBuffer = fs.readFileSync(masterPath);
            await uploadToS3(
                {
                    buffer: masterBuffer,
                    originalname: "master.m3u8",
                    mimetype: "application/vnd.apple.mpegurl",
                },
                `videos/reels/${newReelId}`,
                true
            );

            console.log("[STEP 7] Uploaded master.m3u8 and all variants to S3");
        } catch (uploadErr) {
            console.error("[STEP 7] Error uploading HLS files to S3:", uploadErr);
             uploadErr.statusCode = uploadErr.statusCode || 500;
            await logError(req, uploadErr);
            throw uploadErr; // rethrow to trigger outer catch & mark reel as failed
        }


        // Step 8: Final update of Reel document with master playlist URL
        const videoUrl = `https://${process.env.CLOUDFRONT_URL}/videos/reels/${newReelId}/master.m3u8`;
        savedReel.videoUrl = videoUrl;
        savedReel.thumbnailUrl = thumbnailUrl;
        savedReel.status = 'Published'; // Mark as published after successful processing
        await savedReel.save();

        console.log("===== [WORKER: FULL UPLOAD SUCCESS] =====");
    } catch (err) {
        console.error("===== [WORKER: FULL UPLOAD ERROR] =====");
        console.error(err);
        err.statusCode = err.statusCode || 500;
        await logError(req, err);
        if (newReelId) {
            await Reel.findByIdAndUpdate(newReelId, { status: 'failed', error: err.message });
        }
        throw err;
    } finally {
        // Step 9: Cleanup temporary files and directory
        tempFiles.forEach((t) => { try { if (t) t.removeCallback(); } catch (e) { console.warn("Could not remove temp file:", e.message); } });
        if (hlsDir) { try { fs.rmSync(hlsDir, { recursive: true, force: true }); } catch (e) { console.warn("Could not remove HLS directory:", e.message); } }
    }
}


// =================================================================
// === 3. EXPRESS ROUTE (Updated Logic for audioData) ===
// =================================================================
router.post(
    "/full-upload",
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    async (req, res) => {
        console.log("===== [FULL UPLOAD API HIT] =====");
        try {
            const {
                user, userid, username, name, caption, musicId, audioData,
                videoStartTime, videoEndTime, musicStartTime, musicEndTime,
            } = req.body;

            // 🚫 ================= SUSPEND CHECK (UPLOAD BLOCK) =================
            let uploaderUser = null;

            // try by ObjectId
            if (user && mongoose.isValidObjectId(user)) {
                uploaderUser = await User.findById(user).select("isSuspended").lean();
            }

            // fallback by userid string
            if (!uploaderUser && userid) {
                uploaderUser = await User.findOne({ userid }).select("isSuspended").lean();
            }

            if (uploaderUser?.isSuspended) {
                return res.status(403).json({
                    success: false,
                    message: "Your account is suspended. You cannot upload videos."
                });
            }
            // 🚫 ===============================================================


            // --- NEW: Safely parse audioData into an object ---
            let parsedAudioData = null;
            if (audioData) {
                try {
                    parsedAudioData = JSON.parse(audioData);
                } catch (e) {
                    await logError(req, e);
                    console.error("Error parsing audioData:", e);
                }
            }
            // -------------------------------------------------

            console.log(audioData, musicId);

            if (!user || !req.files || !req.files.video) {
                return res.status(400).json({
                    success: false,
                    message: "User or video file missing!"
                });
            }

            // ✅ Ensure latest username fetched from DB (fix for old username issue)
            let currentUsername = username || "";
            let currentName = name || "";

            try {
                let dbUser = null;

                // If userid is an ObjectId, find by _id
                if (userid && mongoose.isValidObjectId(userid)) {
                    dbUser = await User.findById(userid)
                        .select("username name")
                        .lean();
                }

                // If not found, try find by userid field or user field
                if (!dbUser) {
                    dbUser = await User.findOne({
                        $or: [{ userid: userid }, { userid: user }, { _id: user }],
                    })
                        .select("username name")
                        .lean();
                }

                // If username found in DB, use it
                if (dbUser && dbUser.username) {
                    currentUsername = dbUser.username;
                }

                if (dbUser && dbUser.name) {
                    currentName = dbUser.name;
                }
            } catch (err) {
                console.warn("⚠ Could not fetch latest username from DB:", err.message);
            }

            const videoFile = req.files.video[0];
            const thumbFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

            // Prepare job data
            const jobData = {
                videoBuffer: videoFile.buffer,
                videoOriginalname: videoFile.originalname,
                thumbBuffer: thumbFile ? thumbFile.buffer : null,
                user,
                userid,
                username: currentUsername,
                name: currentName,
                caption,
                musicId,
                videoStartTime,
                videoEndTime,
                musicStartTime,
                musicEndTime,

                // --- NEW: Pass the parsed external audio object ---
                externalAudioData: parsedAudioData,
                // -------------------------------------------------
            };

            // *** WARNING: In production, replace this direct call with a queue enqueue ***
            processReelUpload(jobData).catch(err => {
                console.error("Worker failed after API responded:", err);
            });

            // Immediate Response to Client (202 Accepted)
            console.log("-> Job initiated. Responding with 202 Accepted.");
            return res.status(202).json({
                success: true,
                message: "Upload initiated. Video is being processed asynchronously.",
            });

        } catch (err) {
            console.error("===== [FULL UPLOAD API ERROR] =====");
            console.error(err);
            err.statusCode = err.statusCode || 500;
            await logError(req, err);
            res.status(500).json({
                success: false,
                message: "Server error during reel upload initiation.",
            });
        }
    }
);


router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
                success: false
            });
        }

        const folder = req.body.folder || "uploads";

        // ✅ Check if uploaded file is video
        if (req.file.mimetype.startsWith("video/")) {
            // Save uploaded buffer to a temp file
            const inputTmp = tmp.fileSync({ postfix: path.extname(req.file.originalname) });
            fs.writeFileSync(inputTmp.name, req.file.buffer);

            // Create another temp file for compressed video
            const outputTmp = tmp.fileSync({ postfix: ".mp4" });

            // Run ffmpeg compression
            // Use adaptive compress for single-file uploads as well
            await compressVideo(inputTmp.name, outputTmp.name);


            // Read compressed file back into buffer
            const compressedBuffer = fs.readFileSync(outputTmp.name);

            // Upload to S3
            const uploadedFileUrl = await uploadToS3(
                { buffer: compressedBuffer, originalname: "compressed-" + req.file.originalname, mimetype: "video/mp4" },
                folder
            );

            // Cleanup
            inputTmp.removeCallback();
            outputTmp.removeCallback();

            console.log("video", uploadedFileUrl)
            return res.status(200).json({
                message: "Video compressed & uploaded successfully!",
                success: true,
                file: uploadedFileUrl
            });

        } else {
            // ✅ If file is NOT a video, upload directly
            const uploadedFileUrl = await uploadToS3(req.file, folder);
            console.log("image", uploadedFileUrl)

            return res.status(200).json({
                message: "File uploaded successfully!",
                success: true,
                file: uploadedFileUrl
            });
        }

    } catch (error) {
        console.error("Error on file upload:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({
            message: "Error on file upload!",
            success: false
        });
    }
});


router.post("/upload", async (req, res) => {
    try {
        const data = await req.body;

        if (!data.user || !data.videoUrl) {
            res.status(400).json({ message: "User ID or Video Url missing!" });
        }

        const newReel = new Reel(
            data
        );

        const savedReel = await newReel.save();

        // Generate and save short link for sharing
        try {
            const uploaderUser = await User.findById(savedReel.user);
            if (uploaderUser && savedReel.userid) {
                const { slug, shortLink } = generateShortLink(savedReel._id, savedReel.userid);
                savedReel.shortLinks.push({
                    slug,
                    shortLink,
                    generatedForUser: uploaderUser._id,
                    generatedAt: new Date()
                });
                await savedReel.save();
                console.log(`Short link generated and saved for reel ${savedReel._id}: ${shortLink}`);
            }
        } catch (shortLinkError) {
            console.warn("Failed to generate short link (non-blocking):", shortLinkError.message);
        }

        if (typeof savedReel.videoUrl === "string" && savedReel.videoUrl.toLowerCase().includes(".mp4")) {
            await Reel.findByIdAndUpdate(savedReel._id, { status: "Processing" });
            convertMp4UrlToHlsAndUpdateReel(savedReel._id, savedReel.videoUrl).catch(() => { });
            return res.status(202).json({
                message: "Reel saved. Video is being optimized for streaming.",
                data: { id: savedReel._id, savedReel }
            });
        }

        // Safely log user action (even if log fails, app continues)
        try {

            await logUserAction({
                user: savedReel.user,
                action: "upload_reel",
                targetType: "Reel",
                targetId: savedReel._id,
                device: req.headers["user-agent"],
                location: {
                    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
                    country: req.headers["cf-ipcountry"] || "",
                    city: "", // Optional: Use IP geolocation later
                    pincode: ""
                }
            });
        } catch (logError) {
            console.error("Log error (non-blocking):", logError.message);
        }
        res.status(201).json({
            message: "Reels Saved Successfully",
            data: {
                id: savedReel._id,
                savedReel
            }
        });


    } catch (error) {
        res.status(500).json({ message: "An Error occure in Upload Reel!" });
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        console.log("Error in upload reel", error);
    }
});

router.get("/by-music/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // 1️⃣ Validate music id
        if (!id || id === "null" || id === "undefined") {
            return res.status(400).json({
                message: "Valid Music ID is required"
            });
        }

        // 2️⃣ Find reels using this music
        // 🔥 BLOCKED REELS HIDE
        const reels = await Reel.find({
            music: id,
            status: { $ne: "Blocked" }   // 👈 IMPORTANT LINE
        })
            .populate("music")                 // music details
            .populate("user", "username")      // reel owner username
            .populate("comments");             // comments

        // 3️⃣ No reels found
        if (!reels || reels.length === 0) {
            return res.status(404).json({
                message: "No reels found for this music"
            });
        }

        // 4️⃣ Success response
        return res.status(200).json({
            message: "Reels fetched successfully",
            data: reels
        });

    } catch (error) {
        console.error("Error fetching reels by music:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        return res.status(500).json({
            message: "Error fetching reels",
            error: error.message
        });
    }
});


router.get(
  "/",
 
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const search = req.query.search || "";
      const status = req.query.status || "all";
      const startDate = req.query.startDate || "";
      const endDate = req.query.endDate || "";

      const skip = (page - 1) * limit;

      // ✅ BUILD QUERY
      const query = {};

      // 🔍 SEARCH FILTER
      if (search) {
        query.$or = [
    { caption: { $regex: search, $options: "i" } },
    { username: { $regex: search, $options: "i" } }
  ];
      }

      // 🎯 STATUS FILTER
      if (status !== "all") {
        query.status = status;
      }

      // 📅 DATE RANGE FILTER
      if (startDate || endDate) {
        query.createdAt = {};

        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // full end day include
          query.createdAt.$lte = end;
        }
      }

      // ✅ TOTAL COUNT (WITH FILTER)
      const total = await Reel.countDocuments(query);

      // ✅ FETCH DATA
      const reels = await Reel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        data: reels,
        total: total,
        page,
        limit,
      });

    } catch (error) {
      console.error("Error fetching reels:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({
        message: "Error fetching reels",
      });
    }
  }
);

router.get(
  "/admin_reels",
  adminAuth,
    checkPermission("VIEW_REELS"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const search = req.query.search || "";
      const status = req.query.status || "all";
      const startDate = req.query.startDate || "";
      const endDate = req.query.endDate || "";

      const skip = (page - 1) * limit;

      // ✅ BUILD QUERY
      const query = {};

      // 🔍 SEARCH FILTER
      if (search) {
        query.$or = [
    { caption: { $regex: search, $options: "i" } },
    { username: { $regex: search, $options: "i" } }
  ];
      }

      // 🎯 STATUS FILTER
      if (status !== "all") {
        query.status = status;
      }

      // 📅 DATE RANGE FILTER
      if (startDate || endDate) {
        query.createdAt = {};

        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // full end day include
          query.createdAt.$lte = end;
        }
      }

      // ✅ TOTAL COUNT (WITH FILTER)
      const total = await Reel.countDocuments(query);

      // ✅ FETCH DATA
      const reels = await Reel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        data: reels,
        total: total,
        page,
        limit,
      });

    } catch (error) {
      console.error("Error fetching reels:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({
        message: "Error fetching reels",
      });
    }
  }
);

router.get("/show", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || "1", 10);
        const exclude = req.query.exclude?.split(",").filter(Boolean) || [];

        const matchStage = exclude.length
            ? { _id: { $nin: exclude.map((id) => new mongoose.Types.ObjectId(id)) } }
            : {};

        const reels = await Reel.aggregate([
            { $match: matchStage },
            { $sample: { size: limit } }, // still returns random reel(s)
        ]);

        return res.status(200).json({ reels });
    } catch (error) {
        console.error("Error fetching reels:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        return res.status(500).json({ message: "Error fetching reels" });
    }
});

// router.get("/shownew", async (req, res) => {
//     try {
//         const limit = parseInt(req.query.limit || "2", 10);
//         const exclude = req.query.exclude?.split(",").filter(Boolean) || [];
//         const currentUserId = req.query.userId;
//         const direction = req.query.direction || "next";

//         if (!currentUserId) {
//             return res.status(400).json({ message: "Missing userId" });
//         }

//         const matchStage = exclude.length
//             ? { _id: { $nin: exclude.map((id) => new mongoose.Types.ObjectId(id)) } }
//             : {};

//         // 🎬 Sample random reels
//         const reels = await Reel.aggregate([
//             { $match: matchStage },
//             { $sample: { size: limit } },
//         ]);

//         // 👤 Fetch current user's profile picture
//         const currentUser = await User.findById(currentUserId, "profilePicture").lean();
//         const currentUserProfilePic = currentUser?.profilePicture || "";

//         // 🔁 Add isFollowing + current user + reel owner profile picture
//         const reelsWithFollow = await Promise.all(
//             reels.map(async (reel) => {
//                 const [isFollowing, reelOwner] = await Promise.all([
//                     User.exists({
//                         _id: reel.user,
//                         followers: new mongoose.Types.ObjectId(currentUserId),
//                     }),
//                     User.findById(reel.user, "profilePicture").lean(),
//                 ]);

//                 const reelUserProfilePic = reelOwner?.profilePicture || "";

//                 return {
//                     ...reel, // ✅ keep original reel fields
//                     isFollowing: !!isFollowing,
//                     currentUserProfilePic, // ✅ current user’s picture
//                     reelUserProfilePic,    // ✅ reel owner's picture
//                 };
//             })
//         );

//         res.json({ reels: reelsWithFollow, direction });
//     } catch (e) {
//         console.error("Error fetching reels:", e);
// e.statusCode = e.statusCode || 500;
// await logError(req, e);
//         res.status(500).json({ message: "Error fetching reels" });
//     }
// });


router.get("/shownew", async (req, res) => { 
    try {
        const limit = parseInt(req.query.limit || "2", 10);
        const exclude = req.query.exclude?.split(",").filter(Boolean) || [];
        const currentUserId = req.query.userId;
        const direction = req.query.direction || "next";

        if (!currentUserId) {
            return res.status(400).json({ message: "Missing userId" });
        }

        const matchStage = exclude.length
            ? { _id: { $nin: exclude.map((id) => new mongoose.Types.ObjectId(id)) } }
            : {};

        // 🎬 Sample random reels
        const reels = await Reel.aggregate([
            { $match: matchStage },
            { $sample: { size: limit } },
        ]);

        // 👤 Fetch current user's profile picture
        const currentUser = await User.findById(currentUserId, "profilePicture").lean();
        const currentUserProfilePic = currentUser?.profilePicture || "";

        // 🔁 Add isFollowing + current user + reel owner profile picture + seller_id
        const reelsWithFollow = await Promise.all(
            reels.map(async (reel) => {
                const [isFollowing, reelOwner] = await Promise.all([
                    User.exists({
                        _id: reel.user,
                        followers: new mongoose.Types.ObjectId(currentUserId),
                    }),
                    User.findById(
                        reel.user,
                        "profilePicture seller_id userseller_id"
                    ).lean(),
                ]);

                const reelUserProfilePic = reelOwner?.profilePicture || "";

                return {
                    ...reel, // keep original reel fields
                    isFollowing: !!isFollowing,
                    currentUserProfilePic,
                    reelUserProfilePic,

                    // ✅ NEW FIELDS ADDED IN RESPONSE
                    seller_id: reel.seller_id || reelOwner?.seller_id || "",
                    userseller_id: reel.userseller_id || reelOwner?.userseller_id || "",
                };
            })
        );

        res.json({ reels: reelsWithFollow, direction });
    } catch (e) {
        console.error("Error fetching reels:", e);
        e.statusCode = e.statusCode || 500;
        await logError(req, e);
        res.status(500).json({ message: "Error fetching reels" });
    }
});


router.post("/view", async (req, res) => {
    try {
        const { reelId, userId } = req.body;

        if (!reelId || !userId) {
            return res.status(400).json({ message: "reelId and userId are required" });
        }

        if (!mongoose.isValidObjectId(reelId) || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid reelId or userId" });
        }


        const user = await User.findById(userId).select("isSuspended").lean();

        if (user?.isSuspended) {
            return res.status(200).json({
                message: "View ignored"
            });
        }

        // Atomically add user to viewsdata only if not present, and increment views only in that case
        const updated = await Reel.findOneAndUpdate(
            { _id: reelId, viewsdata: { $ne: userId } },
            { $addToSet: { viewsdata: userId }, $inc: { views: 1 } },
            { new: true }
        );

        if (!updated) {
            // Either reel not found, or user already counted (can't distinguish without another query)
            const reelExists = await Reel.exists({ _id: reelId });
            if (!reelExists) return res.status(404).json({ message: "Reel not found" });
            return res.status(200).json({ message: "View already counted" });
        }

        return res.status(200).json({
            message: "View added",
            views: updated.views,
        });
    } catch (error) {
        console.error("Error incrementing reel view:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Error incrementing reel view" });
    }
});

// Get current reel quickly
router.get("/current/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { currentUserId } = req.query; // current logged-in user

        // 1️⃣ Validate Reel ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid reel ID" });
        }

        // 2️⃣ Fetch reel
        const currentReel = await Reel.findById(id).lean();
        if (!currentReel) {
            return res.status(404).json({ message: "Reel not found!" });
        }

        // 🔥 3️⃣ BLOCK CHECK (MOST IMPORTANT)
        if (currentReel.status === "Blocked") {
            return res.status(404).json({ message: "Reel not available" });
        }

        // 4️⃣ Fetch current user's profile picture
        let currentUserProfilePic = "";
        if (currentUserId && mongoose.isValidObjectId(currentUserId)) {
            const currentUser = await User.findById(
                currentUserId,
                "profilePicture"
            ).lean();
            currentUserProfilePic = currentUser?.profilePicture || "";
        }

        // 5️⃣ Fetch reel owner info
        const reelOwner = await User.findById(
            currentReel.user,
            "profilePicture followers"
        ).lean();

        const reelUserProfilePic = reelOwner?.profilePicture || "";

        // 6️⃣ Check follow status
        const isFollowing = reelOwner?.followers?.some(
            (followerId) => followerId.toString() === currentUserId
        );

        // 7️⃣ Final response object
        const reelWithProfiles = {
            ...currentReel,
            reelUserProfilePic,
            currentUserProfilePic,
            isFollowing: !!isFollowing,
        };

        // 8️⃣ Send response
        res.status(200).json(reelWithProfiles);

    } catch (error) {
        console.error("Error in /current/:id →", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/admin_current/:id", adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentUserId } = req.query; // current logged-in user

        // 1️⃣ Validate Reel ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid reel ID" });
        }

        // 2️⃣ Fetch reel
        const currentReel = await Reel.findById(id).lean();
        if (!currentReel) {
            return res.status(404).json({ message: "Reel not found!" });
        }

        // 🔥 3️⃣ BLOCK CHECK (MOST IMPORTANT)
        if (currentReel.status === "Blocked") {
            return res.status(404).json({ message: "Reel not available" });
        }

        // 4️⃣ Fetch current user's profile picture
        let currentUserProfilePic = "";
        if (currentUserId && mongoose.isValidObjectId(currentUserId)) {
            const currentUser = await User.findById(
                currentUserId,
                "profilePicture"
            ).lean();
            currentUserProfilePic = currentUser?.profilePicture || "";
        }

        // 5️⃣ Fetch reel owner info
        const reelOwner = await User.findById(
            currentReel.user,
            "profilePicture followers"
        ).lean();

        const reelUserProfilePic = reelOwner?.profilePicture || "";

        // 6️⃣ Check follow status
        const isFollowing = reelOwner?.followers?.some(
            (followerId) => followerId.toString() === currentUserId
        );

        // 7️⃣ Final response object
        const reelWithProfiles = {
            ...currentReel,
            reelUserProfilePic,
            currentUserProfilePic,
            isFollowing: !!isFollowing,
        };

        // 8️⃣ Send response
        res.status(200).json(reelWithProfiles);

    } catch (error) {
        console.error("Error in /current/:id →", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Server error" });
    }
});


// Get other reels
router.get("/others/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            limit = 10,
            skip = 0,
            excludeId,
            reelType,
            currentUserId,
            musicId
        } = req.query;

        let query = {};

        // 🔥 BLOCKED REELS HIDE (USER SIDE)
        query.status = { $ne: "Blocked" };

        // 🎯 Decide which reels to fetch
        if (reelType === "liked") {
            if (!currentUserId) {
                return res.status(400).json({
                    message: "currentUserId is required for liked reels"
                });
            }
            query.likes = currentUserId;

        } else if (reelType === "music") {
            if (!musicId) {
                return res.status(400).json({
                    message: "musicId is required for music reels"
                });
            }
            query.music = musicId;

        } else {
            query.user = userId;
        }

        // 🚫 Exclude a reel (for infinite scroll)
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        // 📦 Fetch reels
        const reels = await Reel.find(query)
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        if (!reels.length) {
            return res.status(200).json([]);
        }

        // 👤 Fetch current user's profile picture
        let currentUserProfilePic = "";
        if (currentUserId && mongoose.isValidObjectId(currentUserId)) {
            const currentUser = await User.findById(
                currentUserId,
                "profilePicture"
            ).lean();
            currentUserProfilePic = currentUser?.profilePicture || "";
        }

        // 🔁 Enhance reels with follow status + profile pics
        const enhancedReels = await Promise.all(
            reels.map(async (reel) => {
                const reelOwner = await User.findById(
                    reel.user,
                    "profilePicture followers"
                ).lean();

                const reelUserProfilePic = reelOwner?.profilePicture || "";

                const isFollowing = reelOwner?.followers?.some(
                    (followerId) =>
                        followerId.toString() === currentUserId
                );

                return {
                    ...reel,
                    reelUserProfilePic,
                    currentUserProfilePic,
                    isFollowing: !!isFollowing,
                };
            })
        );

        res.status(200).json(enhancedReels);

    } catch (error) {
        console.error(error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Server error" });
    }
});


//delete video

router.delete("/delete/:reelId/:userid", async (req, res) => {
        try {
            const { reelId, userid } = req.params;

            // 1️⃣ Validate reelId
            if (!mongoose.isValidObjectId(reelId)) {
                return res.status(400).json({ message: "Invalid reel id" });
            }

            // 2️⃣ Find reel
            const reel = await Reel.findById(reelId);
            if (!reel) {
                return res.status(404).json({ message: "Reel not found" });
            }

            // 3️⃣ OWNER CHECK (string based)
            if (reel.userid !== userid) {
                return res.status(403).json({
                    message: "You are not allowed to delete this reel"
                });
            }

            // 4️⃣ LOG (✅ ObjectId)
            try {
                await logUserAction({
                    user: req.user._id,
                    userName: req.userName,
                    userRole: req.userRole,
                    action: "delete_reel",
                    targetType: "Reel",
                    targetId: reelId,
                    targetName: `Reel ID: ${reelId}`,
                    device: req.headers["user-agent"],
                    location: {
                        ip:
                            req.headers["x-forwarded-for"] ||
                            req.socket.remoteAddress ||
                            "",
                        country: req.headers["cf-ipcountry"] || "",
                    }
                });
            } catch (e) {
                console.error("Log error:", e.message);
            }

            // 5️⃣ Delete comments
            await Comment.deleteMany({ reel: reelId });

            // 6️⃣ Delete reel
            await reel.deleteOne();

            return res.status(200).json({
                success: true,
                message: "Reel + comments + likes + views deleted successfully"
            });

        } catch (error) {
            console.error("Delete reel error:", error);
            error.statusCode = error.statusCode || 500;
            await logError(req, error);
            return res.status(500).json({ message: "Error deleting reel" });
        }
    });

router.delete("/admin_delete/:reelId/:userid",adminAuth,
    checkPermission("DELETE_REEL"), async (req, res) => {
        try {
            const { reelId, userid } = req.params;

            // 1️⃣ Validate reelId
            if (!mongoose.isValidObjectId(reelId)) {
                return res.status(400).json({ message: "Invalid reel id" });
            }

            // 2️⃣ Find reel
            const reel = await Reel.findById(reelId);
            if (!reel) {
                return res.status(404).json({ message: "Reel not found" });
            }

            // 3️⃣ OWNER CHECK (string based)
            if (reel.userid !== userid) {
                return res.status(403).json({
                    message: "You are not allowed to delete this reel"
                });
            }

            // 4️⃣ LOG (✅ ObjectId)
            try {
                await logUserAction({
                    user: req.user._id,
                    userName: req.userName,
                    userRole: req.userRole,
                    action: "delete_reel",
                    targetType: "Reel",
                    targetId: reelId,
                    targetName: `Reel ID: ${reelId}`,
                    device: req.headers["user-agent"],
                    location: {
                        ip:
                            req.headers["x-forwarded-for"] ||
                            req.socket.remoteAddress ||
                            "",
                        country: req.headers["cf-ipcountry"] || "",
                    }
                });
            } catch (e) {
                console.error("Log error:", e.message);
            }

            // 5️⃣ Delete comments
            await Comment.deleteMany({ reel: reelId });

            // 6️⃣ Delete reel
            await reel.deleteOne();

            return res.status(200).json({
                success: true,
                message: "Reel + comments + likes + views deleted successfully"
            });

        } catch (error) {
            error.statusCode = error.statusCode || 500;
            console.error("Delete reel error:", error);
            await logError(req, error);
            return res.status(500).json({ message: "Error deleting reel" });
        }
    });

router.put("/update/:id", async (req, res) => {
    try {
        const { videoUrl, thumbnailUrl, caption, duration, music } = await req.body;
        const video = await Reel.findById(req.params.id);
        if (!video) { res.status(404).json({ message: "Video not found!" }) };
        if (videoUrl) { video.videoUrl = videoUrl };
        if (thumbnailUrl) { video.thumbnailUrl = thumbnailUrl };
        if (caption) { video.caption = caption };
        if (duration) { video.duration = duration };
        if (music) { video.music = music };

        const updatedReel = await video.save();


        // Safely log user action (even if log fails, app continues)
        try {
            await logUserAction({
                user: video.user,
                action: "update_reel",
                targetType: "Reel",
                targetId: req.params.id,
                device: req.headers["user-agent"],
                location: {
                    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
                    country: req.headers["cf-ipcountry"] || "",
                    city: "", // Optional: Use IP geolocation later
                    pincode: ""
                }
            });
        } catch (logError) {
            console.error("Log error (non-blocking):", logError.message);
        }
        res.status(200).json({
            _id: updatedReel._id,
            videoUrl: updatedReel.videoUrl,
            thumbnailUrl: updatedReel.thumbnailUrl,
            caption: updatedReel.caption,
            duration: updatedReel.duration,
            music: updatedReel.music,
        });


    } catch (error) {
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({
            message: "Error in updation!"
        });
        console.log("Error in updateion reel", error);
    }
});

// Like or Unlike a Reel
router.put("/like/:id", async (req, res) => {
    try {
        const { userId } = req.body; // who is liking
        const reelId = req.params.id;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        // ✅ Fetch user
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.userid) return res.status(500).json({ message: "User.userid missing" });

        if (user.isSuspended) {
            // user reel dekh sakta hai, but like/unlike count nahi badhega
            return res.status(200).json({
                message: "Like ignored"
            });
        }

        // ✅ Fetch reel
        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: "Reel not found" });
        if (!reel.userid) return res.status(500).json({ message: "Reel.userid missing" });

        const alreadyLiked = reel.likes.includes(userId);

        // // ✅ Log user action (non-blocking)
        // // ✅ Log user action (non-blocking)
        // try {
        //     await logUserAction({
        //         user: user._id,
        //         userName: user.username || user.name || "User",
        //         userRole: "user",                 // 🔥 FIXED RULE

        //         action: alreadyLiked ? "unlike_reel" : "like_reel",
        //         targetType: "Reel",
        //         targetId: reelId,

        //         device: req.headers["user-agent"],
        //         location: {
        //             ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
        //             country: req.headers["cf-ipcountry"] || "",
        //         }
        //     });
        // } catch (logError) {
        //     console.error("Log error (non-blocking):", logError.message);
        // }


        if (alreadyLiked) {
            // ❌ UNLIKE (NO NOTIFICATION)
            reel.likes = reel.likes.filter(id => id.toString() !== userId);
            await reel.save();

            return res.status(200).json({
                message: "Reel unliked",
                likes: reel.likes.length
            });

        } else {
            // ❤️ LIKE
            reel.likes.push(userId);
            await reel.save();

            // 🔔 CREATE LIKE NOTIFICATION
            try {
                console.log("Creating like notification:", {
                    recipientUserId: reel.userid,
                    senderUserId: user.userid,
                    type: "like",
                    reel: reelId
                });

                await createNotification({
                    recipientObjectId: reel.user,   // Mongo ObjectId of reel owner
                    senderObjectId: user._id,       // Mongo ObjectId of liker
                    recipientUserId: reel.userid,   // userid string
                    senderUserId: user.userid,      // userid string
                    type: "like",
                    reel: reelId,
                    message: "liked your reel"
                });

            } catch (notifError) {
                console.error("Like notification failed:", notifError.message);
            }

            return res.status(200).json({
                message: "Reel liked",
                likes: reel.likes.length
            });
        }

    } catch (error) {
        console.error("Error in liking/unliking reel:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Something went wrong" });
    }
});


// return total likes of all users
router.get("/totallikes",adminAuth ,  async (req, res) => {
    try {
        // Sirf likes field uthao (fast)
        const reels = await Reel.find({}, "likes");

        let totalLikes = 0;

        for (const reel of reels) {
            totalLikes += reel.likes.length;
        }

        res.status(200).json({
            totalLikes, // 👈 ALL USERS TOTAL LIKES
        });
    } catch (error) {
        console.error("Error fetching total likes:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Server error" });
    }
});

// return this api total views of all users
router.get("/totalviews",adminAuth ,  async (req, res) => {
    try {
        // Sirf views field uthao (fast query)
        const reels = await Reel.find({}, "views");

        let totalViews = 0;

        for (const reel of reels) {
            totalViews += reel.views || 0;
        }

        res.status(200).json({
            totalViews, // 👈 ALL USERS TOTAL VIEWS
        });
    } catch (error) {
        console.error("Error fetching total views:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        res.status(500).json({ message: "Server error" });
    }
});


//  ADMIN: BLOCK / UNBLOCK REEL
router.put("/block/:id",   async (req, res) => {
        try {
            const { id } = req.params;
            const { action, reason } = req.body;
            // action = "block" | "unblock"

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: "Invalid reel id" });
            }

            if (!["block", "unblock"].includes(action)) {
                return res.status(400).json({ message: "Invalid action" });
            }

            let updateData = {};

            if (action === "block") {
                updateData = {
                    status: "Blocked",
                    blockedAt: new Date(),                 // ✅ auto time
                    blockReason: reason || "Policy violation"
                };
            } else {
                updateData = {
                    status: "Published",
                    blockedAt: null,                       // ✅ reset
                    blockReason: null
                };
            }

            const reel = await Reel.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );
            try {
                await logUserAction({
                    user: req.user._id,
                    userName: req.userName,
                    userRole: req.userRole,

                    action: action === "block" ? "block_reel" : "unblock_reel",

                    targetType: "Reel",
                    targetId: reel._id,
                    targetName: `Reel ID: ${reel._id}`,
                    device: req.headers["user-agent"],
                    location: {
                        ip:
                            req.headers["x-forwarded-for"] ||
                            req.socket.remoteAddress ||
                            "",
                        country: req.headers["cf-ipcountry"] || "",
                    },
                });
            } catch (e) {
                console.error("Log error:", e.message);
            }
            if (!reel) {
                return res.status(404).json({ message: "Reel not found" });
            }

            return res.status(200).json({
                success: true,
                message: `Reel ${action === "block" ? "blocked" : "unblocked"} successfully`,
                reel
            });

        } catch (error) {
            console.error("Error blocking/unblocking reel:", error);
            error.statusCode = error.statusCode || 500;
            await logError(req, error);
            res.status(500).json({ message: "Server error" });
        }
    });


 router.put("/admin_block/:id", adminAuth,
    checkPermission("BLOCK_REEL"), async (req, res) => {
        try {
            const { id } = req.params;
            const { action, reason } = req.body;
            // action = "block" | "unblock"

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: "Invalid reel id" });
            }

            if (!["block", "unblock"].includes(action)) {
                return res.status(400).json({ message: "Invalid action" });
            }

            let updateData = {};

            if (action === "block") {
                updateData = {
                    status: "Blocked",
                    blockedAt: new Date(),                 // ✅ auto time
                    blockReason: reason || "Policy violation"
                };
            } else {
                updateData = {
                    status: "Published",
                    blockedAt: null,                       // ✅ reset
                    blockReason: null
                };
            }

            const reel = await Reel.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );
            try {
                await logUserAction({
                    user: req.user._id,
                    userName: req.userName,
                    userRole: req.userRole,

                    action: action === "block" ? "block_reel" : "unblock_reel",

                    targetType: "Reel",
                    targetId: reel._id,
                    targetName: `Reel ID: ${reel._id}`,
                    device: req.headers["user-agent"],
                    location: {
                        ip:
                            req.headers["x-forwarded-for"] ||
                            req.socket.remoteAddress ||
                            "",
                        country: req.headers["cf-ipcountry"] || "",
                    },
                });
            } catch (e) {
                console.error("Log error:", e.message);
            }
            if (!reel) {
                return res.status(404).json({ message: "Reel not found" });
            }

            return res.status(200).json({
                success: true,
                message: `Reel ${action === "block" ? "blocked" : "unblocked"} successfully`,
                reel
            });

        } catch (error) {
            console.error("Error blocking/unblocking reel:", error);
            error.statusCode = error.statusCode || 500;
            await logError(req, error);
            res.status(500).json({ message: "Server error" });
        }
    });

router.get("/admin/users/:userid/liked-reels", adminAuth ,  async (req, res) => {
    try {
        const { userid } = req.params;

        // pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;

        // 1️⃣ Find the user admin clicked
        const user = await User.findOne({ userid });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2️⃣ Count total liked reels
        const total = await Reel.countDocuments({
            likes: user._id,
        });

        // 3️⃣ Fetch paginated liked reels
        const reels = await Reel.find({
            likes: user._id,
        })
            .populate("user", "userid username profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + reels.length < total,
            reels,
        });
    } catch (error) {
        console.error("Error fetching liked reels:", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        return res.status(500).json({ message: "Server error" });
    }
});


router.get("/users/:userId/music", adminAuth , async (req, res) => {
    try {
        const { userId } = req.params;
        const page = Number(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        // safety check
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const totalItems = await Music.countDocuments({
            uploadedBy: userId
        });

        const music = await Music.find({
            uploadedBy: userId
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            music,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages: Math.ceil(totalItems / limit),
                limit
            }
        });
    } catch (err) {
        console.error("Fetch user music error:", err);
        err.statusCode = err.statusCode || 500;
        await logError(req, err);
        res.status(500).json({ message: "Failed to fetch user music" });
    }
});

module.exports = router;