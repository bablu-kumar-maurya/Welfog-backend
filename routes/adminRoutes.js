
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Staff = require("../models/Staff");
const adminAuth = require("../middleware/adminAuth"); // 🔥 common auth (admin + staff)
const checkPermission = require("../middleware/checkPermission");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const UserLog = require("../models/UserLog");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images allowed"), false);
    }
    cb(null, true);
  },
});

router.post("/login", async (req, res) => {
  try {
    const { loginType, username, email, password } = req.body;

    if (!loginType || !password) {
      return res.status(400).json({
        success: false,
        message: "loginType and password are required",
      });
    }

    let user;
    let permissions = [];

    /* ================= ADMIN LOGIN ================= */
    if (loginType === "admin") {
      if (!username) {
        return res.status(400).json({
          success: false,
          message: "Username required for admin login",
        });
      }

      const admin = await Admin.findOne({ username });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      admin.lastLogin = new Date();
      await admin.save();

      permissions = admin.roles.flatMap(r => r.permissions);

      user = {
        _id: admin._id,
        name: admin.username,
        email: admin.email,
        role: admin.role,
        userType: "admin",
        profileImage: admin.profileImage || null,
      };
    }

    /* ================= STAFF LOGIN ================= */
    else if (loginType === "staff") {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email required for staff login",
        });
      }

      const staff = await Staff.findOne({ email });
      if (!staff) {
        return res.status(401).json({
          success: false,
          message: "Invalid staff credentials",
        });
      }

      const isMatch = await bcrypt.compare(password, staff.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid staff credentials",
        });
      }

      const superAdmin = await Admin.findOne({ role: "superadmin" });
      const role = superAdmin.roles.id(staff.role._id);
      if (!role) {
        return res.status(403).json({
          success: false,
          message: "Role not found",
        });
      }

      permissions = role.permissions;

      user = {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: {
          _id: role._id,
          name: role.name,
        },
        userType: "staff",
        profileImage: staff.profileImage || null,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid loginType (admin | staff)",
      });
    }

    /* ================= JWT (NO PERMISSIONS) ================= */
    const token = jwt.sign(
      {
        id: user._id,
        userType: user.userType,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        userType: user.userType,
        role: user.role,
        permissions, // ✅ frontend ke liye
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

router.get("/verify", adminAuth, async (req, res) => {
  try {
    const userObj = req.user?.toObject ? req.user.toObject() : req.user;

    res.json({
      success: true,
      userType: req.userType,
      user: {
        ...userObj,
        permissions: req.permissions || [],
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists. Use login.",
      });
    }

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password and email required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const admin = new Admin({
      username,
      password,
      email,
      role: "superadmin",
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Superadmin created successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin creation error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during admin creation",
    });
  }
});

router.put(
  "/change-password",
  adminAuth,
  checkPermission("EDIT_SETTINGS"),
  async (req, res) => {
    try {
      if (req.userType !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admin can change password",
        });
      }

      const currentPassword = (req.body.currentPassword || "").trim();
      const newPassword = (req.body.newPassword || "").trim();

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current and new password required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      const admin = await Admin.findById(req.user._id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // ✅ CORRECT PASSWORD CHECK
      const isMatch = await bcrypt.compare(
        currentPassword,
        admin.password
      );

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password incorrect",
        });
      }

      // ✅ SET PLAIN PASSWORD — Admin model pre("save") hashes once; manual hash here caused double-hash and login failure
      admin.password = newPassword;

      await admin.save();
      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during password change",
      });
    }
  }
);


router.get(
  "/activity-logs",
  adminAuth,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const { action, targetType, search, startDate, endDate } = req.query;

      const query = {};

      if (action) query.action = action;
      if (targetType) query.targetType = targetType;

      // 📅 Date Filter Logic
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Din ke aakhri waqt tak
          query.createdAt.$lte = end;
        }
      }

      if (search) {
        const searchRegex = { $regex: search, $options: "i" };
        query.$or = [
          { userName: searchRegex },
          { targetName: searchRegex },
          { action: searchRegex },
          { "metadata.userName": searchRegex },
          { "metadata.staffName": searchRegex },
          { "metadata.roleName": searchRegex }
        ];
      }

      const [logs, totalLogs] = await Promise.all([
        UserLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserLog.countDocuments(query)
      ]);

      res.json({
        success: true,
        logs,
        pagination: {
          totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
          currentPage: page,
          limit
        }
      });
    } catch (err) {
      console.error("Activity log error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch logs" });
    }
  }
);





// UPDATE GENERAL SETTINGS
router.put(
  "/settings",
  adminAuth,
  checkPermission("EDIT_SETTINGS"),
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.userType !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admin can update general settings",
        });
      }

      const { siteName, maintenanceMode, allowNewRegistrations, maxUploadSize, videoQuality } = req.body;

      // Find admin and update these fields
      // Note: Agar aapne Admin model mein ye fields nahi banayi hain, 
      // toh aapko model file mein ye fields add karni hongi.
      const admin = await Admin.findById(req.user._id);
      
      if (!admin) {
        return res.status(404).json({ success: false, message: "Admin not found" });
      }

      // Update values if they exist in request body
      if (siteName !== undefined) admin.siteName = siteName;
      if (maintenanceMode !== undefined) admin.maintenanceMode = maintenanceMode;
      if (allowNewRegistrations !== undefined) admin.allowNewRegistrations = allowNewRegistrations;
      if (maxUploadSize !== undefined) admin.maxUploadSize = maxUploadSize;
      if (videoQuality !== undefined) admin.videoQuality = videoQuality;

      await admin.save();

      res.json({
        success: true,
        message: "Settings updated successfully",
        settings: {
          siteName: admin.siteName,
          maintenanceMode: admin.maintenanceMode,
          allowNewRegistrations: admin.allowNewRegistrations,
          maxUploadSize: admin.maxUploadSize,
          videoQuality: admin.videoQuality
        }
      });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during settings update",
      });
    }
  }
);



router.put(
  "/update-profile",
  adminAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, email } = req.body;

      let user;
      if (req.userType === "admin") {
        user = await Admin.findById(req.user._id);
      } else if (req.userType === "staff") {
        user = await Staff.findById(req.user._id);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Email duplicate check (admin + staff both)
      if (email && email !== user.email) {
        const emailExists =
          (await Admin.findOne({ email })) ||
          (await Staff.findOne({ email }));

        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
      }

      // Update name
      if (name) {
        if (req.userType === "admin") {
          user.username = name;
        } else {
          user.name = name;
        }
      }

      // Update email
      if (email) {
        user.email = email;
      }

      // If new image uploaded
      if (req.file) {
        // delete old image
        if (user.profileImage) {
          const oldPath = path.join(__dirname, "..", user.profileImage);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        user.profileImage = `/uploads/${req.file.filename}`;
      }
await user.save();

let roleData = user.role;
let permissions = [];

// If staff, fetch permissions again
if (req.userType === "staff") {
  const superAdmin = await Admin.findOne({ role: "superadmin" });
  const roleObj = superAdmin.roles.id(user.role._id);
  permissions = roleObj?.permissions || [];
}

res.json({
  success: true,
  message: "Profile updated successfully",
  user: {
    id: user._id,
    name: user.username || user.name,
    email: user.email,
    profileImage: user.profileImage,
    userType: req.userType,
    role: roleData,
    permissions,
  },
});
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating profile",
      });
    }
  }
);


router.put(
  "/remove-profile-image",
  adminAuth,
  async (req, res) => {
    try {
      let user;

      if (req.userType === "admin") {
        user = await Admin.findById(req.user._id);
      } else {
        user = await Staff.findById(req.user._id);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.profileImage) {
        const imagePath = path.join(__dirname, "..", user.profileImage);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }

        user.profileImage = null;
        await user.save();
      }

      res.json({
        success: true,
        message: "Profile image removed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
