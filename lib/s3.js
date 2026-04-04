// s3.js
const { S3Client, PutObjectCommand, GetObjectCommand , DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { pipeline } = require("stream/promises");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function guessContentTypeByName(name) {
  const ext = (path.extname(name) || "").toLowerCase();
  switch (ext) {
    case ".m3u8": return "application/vnd.apple.mpegurl";
    case ".ts": return "video/mp2t";
    case ".mp4": return "video/mp4";
    case ".mp3": return "audio/mpeg";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    default: return "application/octet-stream";
  }
}

const uploadToS3 = async (file, folder = "uploads", preserveFilename = false) => {
  // file.originalname is expected; when file is a buffer-like object, it should carry originalname & mimetype
  const safeOriginal = file.originalname || `file-${Date.now()}`;
  const key = preserveFilename
    ? `${folder}/${safeOriginal}`
    : `${folder}/${uuidv4()}-${safeOriginal}`;

  const contentType = file.mimetype || guessContentTypeByName(safeOriginal);

  // Use aggressive cache for static segments and immutable content (long TTL)
  // For playlists (.m3u8) we want a short TTL to allow updates if needed.
let cacheControl = "public, max-age=31536000, immutable"; // static files

if (key.endsWith(".m3u8")) {
  cacheControl = "public, max-age=86400, stale-while-revalidate=86400";
}


if (key.endsWith(".ts")) {
  cacheControl = "public, max-age=31536000, immutable";
}

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
  }));

  const cloudfrontDomain = process.env.CLOUDFRONT_URL;
  return `https://${cloudfrontDomain}/${key}`;
};

const getFileFromS3 = async (key, destinationPath) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });
  const response = await s3.send(command);
  const writeStream = fs.createWriteStream(destinationPath);
  await pipeline(response.Body, writeStream);
};
const deleteFileFromS3 = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    // URL se S3 Key extract karna (e.g., thumbnails/abc.jpg)
    // Agar URL https://d123.cloudfront.net/thumbnails/abc.jpg hai toh pathname "/thumbnails/abc.jpg" dega
    const url = new URL(fileUrl);
    const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }));
    
    console.log("✅ File deleted from S3:", key);
  } catch (error) {
    console.error("❌ S3 Delete Error:", error);
  }
};
module.exports = { s3, uploadToS3, getFileFromS3 ,deleteFileFromS3};











// // s3.js
// const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
// const { v4: uuidv4 } = require("uuid");
// const fs = require("fs");
// const { pipeline } = require("stream/promises");
// const path = require("path");

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// function guessContentTypeByName(name) {
//   const ext = (path.extname(name) || "").toLowerCase();
//   switch (ext) {
//     case ".m3u8": return "application/vnd.apple.mpegurl";
//     case ".ts": return "video/mp2t";
//     case ".mp4": return "video/mp4";
//     case ".mp3": return "audio/mpeg";
//     case ".jpg":
//     case ".jpeg": return "image/jpeg";
//     case ".png": return "image/png";
//     default: return "application/octet-stream";
//   }
// }

// const uploadToS3 = async (file, folder = "uploads", preserveFilename = false) => {
//   const safeOriginal = file.originalname || `file-${Date.now()}`;
//   const key = preserveFilename
//     ? `${folder}/${safeOriginal}`
//     : `${folder}/${uuidv4()}-${safeOriginal}`;

//   const contentType = file.mimetype || guessContentTypeByName(safeOriginal);

//   // Correct caching logic
//   let cacheControl;

//   if (key.endsWith(".m3u8")) {
//     // 🎯 Playlist should be cached longer for fast play
//     cacheControl = "public, max-age=600, must-revalidate";   // 10 min
//   } 
//   else if (key.endsWith(".ts")) {
//     // 🎯 Segments are immutable
//     cacheControl = "public, max-age=31536000, immutable";
//   } 
//   else {
//     // 🎯 Images / thumbnails / mp4 backups etc.
//     cacheControl = "public, max-age=31536000, immutable";
//   }

//   await s3.send(new PutObjectCommand({
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: key,
//     Body: file.buffer,
//     ContentType: contentType,
//     CacheControl: cacheControl,
//   }));

//   const cloudfrontDomain = process.env.CLOUDFRONT_URL;
//   return `https://${cloudfrontDomain}/${key}`;
// };

// const getFileFromS3 = async (key, destinationPath) => {
//   const command = new GetObjectCommand({
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: key,
//   });
//   const response = await s3.send(command);
//   const writeStream = fs.createWriteStream(destinationPath);
//   await pipeline(response.Body, writeStream);
// };

// module.exports = { s3, uploadToS3, getFileFromS3 };