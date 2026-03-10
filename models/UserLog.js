const mongoose = require("mongoose");

const userLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true, // Jis user ne action kiya
    },

    action: {
        type: String,
        enum: [
            "view_reel", "like_reel", "unlike_reel", "comment", "share_reel",
            "update_reel", "login", "logout", "follow_user", "unfollow_user",
            "report_reel", "upload_reel", "delete_reel", "update_profile_name",
            "update_profile_bio", "update_profile_picture", "account_suspended",
            "account_reactivated", "like_comment", "unlike_comment", "reply_comment",
            "delete_comment", "upload_music", "delete_music", "block_reel",
            "unblock_reel", "delete_user", "edit_reel", "change_password",
            "create_role", "edit_role", "delete_role", "create_staff",
            "delete_staff", "edit_staff", "edit_comment",
            "view_dashboard" // Dashboard viewing log ke liye (agar zaroorat ho)
        ],
        required: true,
    },

    // EXTRA CONTEXT (name, role, old/new values etc.)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Jis cheez pe action hua (e.g., Reel, Staff, Role)
    targetType: {
        type: String,
    },

    targetId: {
        type: mongoose.Schema.Types.ObjectId,
    },

    targetName: {
        type: String,
    },

    userName: { 
        type: String, // Direct store karne se search speed badh jati hai
    },

    // Device aur Browser info
    device: {
        type: String, 
    },

    browser: {
        type: String,
    },

    // Location info
    location: {
        ip: String,
        country: String,
        city: String,
        pincode: String,
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true, // Basic indexing
    },
});

// ================= SPEED OPTIMIZED INDEXES (UPDATED) =================

// 1. Date range filters ko fast karne ke liye (Sabse zaroori)
userLogSchema.index({ createdAt: -1 });

// 2. Action + TargetType + Date (Compound index for dropdown filters)
userLogSchema.index({ action: 1, targetType: 1, createdAt: -1 });

// 3. Search optimization (Name based search with Date sorting)
userLogSchema.index({ userName: 1, targetName: 1, createdAt: -1 });

// 4. Metadata internal search (Deep search for staff/user names inside metadata)
userLogSchema.index({ "metadata.userName": 1 });
userLogSchema.index({ "metadata.staffName": 1 });
userLogSchema.index({ "metadata.roleName": 1 });

// 5. User specific activity timeline
userLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("UserLog", userLogSchema);