const express = require("express");
const User = require("../models/Users");
const router = express.Router();
const logUserAction = require("../utils/logUserAction");

router.post("/external/suspend-user", async (req, res) => {
  try {
    const { userId, isSuspended, reason, suspendedBy } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const user = await User.findOne({ userid: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (typeof isSuspended === "boolean") {
      user.isSuspended = isSuspended;

      if (isSuspended) {
        user.suspendReason = reason || "No reason provided";
        user.suspendedBy = suspendedBy || "external_admin";
        user.suspendedAt = new Date();
      } else {
        user.suspendReason = "";
        user.suspendedBy = null;
        user.suspendedAt = null;
      }
    }

    await user.save();

    // 🔥 log bhi kar
    await logUserAction({
      user: suspendedBy || "external",
      action: isSuspended ? "account_suspended" : "account_reactivated",
      targetType: "User",
      targetId: user._id,
      targetName: user.username,
      metadata: {
        reason: reason || "",
        source: "shopping_app",
      },
    });

    res.json({
      success: true,
      message: `User ${isSuspended ? "suspended" : "activated"} successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
