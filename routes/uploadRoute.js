const express = require("express");
const router = express.Router();
const { uploadToS3 ,deleteFileFromS3 } = require("../lib/s3");
const User = require("../models/Users");


const multer = require("multer");

// memory storage (S3 ke liye best)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") // sirf image allow
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});




router.post("/upload-profile-pic/:id", upload.single("file"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // 1️⃣ user find karo
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ purani image delete karo (agar hai)
   // 2️⃣ purani image delete karo (safe way)
try {
  if (user.profilePicture && user.profilePicture !== "") {
    await deleteFileFromS3(user.profilePicture);
  }
} catch (e) {
  console.warn("Old image delete failed:", e.message);
}

    // 3️⃣ new image upload karo S3 me
    const imageUrl = await uploadToS3(req.file, "profile-pictures");

    // 4️⃣ db update
    user.profilePicture = imageUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      profilePicture: imageUrl,
    });

  } catch (error) {
    console.error("❌ Upload Profile Pic Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});


// API: Remove Profile Picture
router.delete("/remove-profile-pic/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. User ko find karein taaki purani photo ka URL mil sake
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // 2. Agar user ki pehle se koi photo hai, toh usey S3 se delete karein
    try {
  if (user.profilePicture) {
    await deleteFileFromS3(user.profilePicture);
  }
} catch (e) {
  console.warn("Delete failed:", e.message);
}

    // 3. Database mein field ko reset karein
    user.profilePicture = "";
    await user.save();

    res.status(200).json({
      message: "Profile picture removed successfully!",
      success: true,
      profilePicture: ""
    });

  } catch (error) {
    console.error("Error removing profile pic:", error);
    res.status(500).json({
      message: "Server error while removing profile picture",
      success: false
    });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: "File too large (max 10MB)",
    });
  }

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
});


module.exports = router;