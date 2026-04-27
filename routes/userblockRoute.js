const express = require("express");
const router = express.Router();
const User = require("../models/Users");
const Reel4test = require("../models/Reel");
const ReelInteraction = require("../models/ReelInteraction");

router.post("/block-user", async (req, res) => {
  try {
    const { blockerId, targetUserId } = req.body; 

    if (!blockerId || !targetUserId) {
      return res.status(400).json({ success: false, message: "Both blockerId and targetUserId are required." });
    }

    if (blockerId === targetUserId) {
      return res.status(400).json({ success: false, message: "You cannot block yourself." });
    }

    // Find both users in the database
    const blocker = await User.findById(blockerId);
    const target = await User.findById(targetUserId);

    if (!blocker || !target) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if already blocked
    if (blocker.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: "User is already blocked." });
    }

    // 1. Add to blocked list
    blocker.blockedUsers.push(targetUserId);

    // 2. Mutual Unfollow (Instagram style)
    // Remove target from blocker's following and followers
    blocker.following = blocker.following.filter(id => id.toString() !== targetUserId);
    blocker.followers = blocker.followers.filter(id => id.toString() !== targetUserId);

    // Remove blocker from target's following and followers
    target.following = target.following.filter(id => id.toString() !== blockerId);
    target.followers = target.followers.filter(id => id.toString() !== blockerId);

    // Save both changes
    await blocker.save();
    await target.save();

    res.status(200).json({
      success: true,
      message: `${target.username} has been blocked and mutually unfollowed.`
    });

  } catch (error) {
    console.error("Block API Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.post("/unblock-user", async (req, res) => {
  try {
    const { unblockerId, targetUserId } = req.body;

    if (!unblockerId || !targetUserId) {
      return res.status(400).json({ success: false, message: "Both unblockerId and targetUserId are required." });
    }

    if (unblockerId === targetUserId) {
      return res.status(400).json({ success: false, message: "You cannot unblock yourself." });
    }

    // Find the users in the database
    const unblocker = await User.findById(unblockerId);
    const target = await User.findById(targetUserId);

    if (!unblocker || !target) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if the target user is actually in the blocked list
    if (!unblocker.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: "User is not currently blocked." });
    }

    // Remove the target user from the blocked list
    unblocker.blockedUsers = unblocker.blockedUsers.filter(id => id.toString() !== targetUserId);

    // Save the changes
    await unblocker.save();

    res.status(200).json({
      success: true,
      message: `${target.username} has been unblocked.`
    });

  } catch (error) {
    console.error("Unblock API Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= MARK REEL AS INTERESTED / NOT INTERESTED =================

router.post("/mark-interest", async (req, res) => {
  try {
    const { userId, reelId, action } = req.body;

    // Validation
    if (!userId || !reelId || !action) {
      return res.status(400).json({ message: "userId, reelId, aur action required hain." });
    }

    if (!["interested", "not_interested"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'interested' or 'not_interested'." });
    }

    // 💡 UPSERT LOGIC: Agar pehle se record hai toh update karo, warna naya banao
    // Isse duplicate entry ka tension khatam.
    const interaction = await ReelInteraction.findOneAndUpdate(
      { user: userId, reel: reelId }, // Find by user & reel
      { action: action },             // Update the action
      { upsert: true, new: true }     // Create new if doesn't exist
    );

    // Optional: Log analytics
    try {
      await logUserAction({
        user: userId,
        action: `marked_${action}`,
        targetType: "Reel",
        targetId: reelId,
        device: req.headers["user-agent"]
      });
    } catch (e) {
      console.error("Interest log error:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: `Reel marked as ${action.replace("_", " ")} successfully.`,
      data: interaction
    });

  } catch (error) {
    console.error("Mark Interest API Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;