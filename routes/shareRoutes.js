const { generateShortLink } = require("../utils/shortLink");
const express = require("express");
const router = express.Router();
const path = require("path");
const Reel = require("../models/Reel");
const logError = require("../utils/logError");
const logUserAction = require("../utils/logUserAction"); 
require("dotenv").config();

const os = require("os");
const DESKTOP = path.join(os.homedir(), "Desktop");

router.get('/deeplink-test.html', (req, res) => {
    res.sendFile(path.join(DESKTOP, 'deeplink-test.html'));
});

router.get('/r/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // ✅ FULL reelId + UUID safe
        const match = slug.match(/^([a-f0-9]{24})-(.+)$/i);
        if (!match) {
            return res.status(400).send("Invalid slug format");
        }

        const reelId = match[1];
        const ownerUserId = decodeURIComponent(match[2]);

        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).send("Reel not found");

        // ✅ 🔥 FIX: STRING COMPARE (UUID / number dono handle karega)
        if (String(reel.userid) !== String(ownerUserId)) {
            return res.status(404).send("Invalid user");
        }

        await Reel.findByIdAndUpdate(reel._id, {
            $inc: { plays: 1 }
        });

        return res.redirect(
            `${process.env.BASE_URL}/api/plays/dl/reel/${reel._id}/user/${reel.userid}`
        );

    } catch (err) {
        console.error("Error in /r/:slug →", err);
        err.statusCode = err.statusCode || 500;
        await logError(req, err);
        res.status(500).send("Server error");
    }
});

router.get('/dl/reel/:reelId/user/:userId', (req, res) => {
    const { reelId, userId } = req.params;

    const deepLink = `welfog://Play/sepreel/${reelId}?u=${userId}`;

    const playStoreUrl =
        `https://play.google.com/store/apps/details?id=com.parm27.welfog` +
        `&referrer=${encodeURIComponent(`reelId=${reelId}&userId=${userId}`)}`;

    const html = `
<html>
<head>
<script>
    let openApp = true;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) openApp = false;
    });

    window.location.href = "${deepLink}";

    setTimeout(() => {
        if (openApp) window.location.href = "${playStoreUrl}";
    }, 3000);
</script>
</head>
<body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;text-align:center;">
    Opening WELFOG App...<br><br>
    If not installed, Play Store will open.
</body>
</html>
    `;

    res.send(html);
});

router.get('/reel/:reelId/share/:userId', async (req, res) => {
    try {
        const { reelId } = req.params;

        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).send("Reel not found");

        const { slug, shortLink } = generateShortLink(
            reel._id,
            reel.userid
        );

        if (!reel.shortLinks || reel.shortLinks.length === 0) {
            reel.shortLinks.push({
                slug,
                shortLink,
                generatedForUser: reel.user,
                generatedAt: new Date()
            });
            await reel.save();
        }

        return res.json({ shortLink });

    } catch (error) {
        console.error("Error generating short link →", error);
        error.statusCode = error.statusCode || 500;
        await logError(req, error);
        return res.status(500).send("Server error");
    }
});

router.get('/admin/fix-shortlinks-v2', async (req, res) => {
    try {
        const reels = await Reel.find({}, { _id: 1, userid: 1, user: 1 });

        for (const reel of reels) {
            const slug = `${reel._id}-${encodeURIComponent(reel.userid)}`;
            const shortLink = `https://api.welfog.com/api/plays/r/${slug}`;

            await Reel.updateOne(
                { _id: reel._id },
                {
                    $set: {
                        shortLinks: [{
                            slug,
                            shortLink,
                            generatedForUser: reel.user,
                            generatedAt: new Date()
                        }]
                    }
                }
            );
        }

        res.send("✅ All shortLinks upgraded to FULL reelId");

    } catch (err) {
        console.error(err);
        err.statusCode = err.statusCode || 500;
        await logError(req, err);
        res.status(500).send("Migration error");
    }
});



module.exports = router;