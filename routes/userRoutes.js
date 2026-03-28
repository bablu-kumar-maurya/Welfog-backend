const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const Music = require("../models/Music");
const Reel4test = require("../models/Reel");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const logUserAction = require("../utils/logUserAction");
const Reel = require("../models/Reel");
const UserLog = require("../models/UserLog");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const createNotification = require("../utils/createNotification");
const Comment = require("../models/Comment");
const adminAuth = require("../middleware/adminAuth");
const checkPermission = require("../middleware/checkPermission");
const logError = require("../utils/logError");
const axios = require("axios");
// create new user

router.post("/", async (req, res) => {
  try {
    // ✅ added isConnected in destructuring
    let {
      userid,
      mobile,
      name,
      username,
      email,
      profilePicture,
      bio,
      seller_id,
      userseller_id,
      isConnected,
    } = req.body;

    // ✅ Mobile is required
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // 🔹 Normalize mobile to a standard 10-digit format
    mobile = mobile.replace(/\D/g, "");

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    username = username.toLowerCase();
    username = username.trim().toLowerCase();

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        message: "Username must be 3-20 characters",
      });
    }

    // ✅ Check if user already exists by mobile
    let existingUser = await User.findOne({ mobile });

    // 🔥 UNIQUE CHECK: seller_id and userseller_id check before saving/updating
    if (seller_id) {
      const duplicateSeller = await User.findOne({
        seller_id,
        _id: { $ne: existingUser?._id },
      });
      if (duplicateSeller) {
        return res.status(400).json({ message: "Seller ID already exists" });
      }
    }

    if (userseller_id) {
      const duplicateUserSeller = await User.findOne({
        userseller_id,
        _id: { $ne: existingUser?._id },
      });
      if (duplicateUserSeller) {
        return res
          .status(400)
          .json({ message: "User Seller ID already exists" });
      }
    }

    if (existingUser) {
      if (name) existingUser.name = name;
      if (email) existingUser.email = email;
      if (profilePicture) existingUser.profilePicture = profilePicture;
      if (bio) existingUser.bio = bio;

      // ✅ Update connection status
      if (typeof isConnected !== "undefined") {
        existingUser.isConnected = isConnected;
        existingUser.lastConnectedAt = new Date();
      }

      // Update seller IDs if provided
      if (seller_id) existingUser.seller_id = seller_id;
      if (userseller_id) existingUser.userseller_id = userseller_id;

      await existingUser.save();

      return res.status(200).json({
        message: "User logged in successfully",
        _id: existingUser._id,
        userid: existingUser.userid,
        username: existingUser.username,
        name: existingUser.name,
        isConnected: existingUser.isConnected, // ✅ added in response
        seller_id: existingUser.seller_id,
        userseller_id: existingUser.userseller_id,
        mobile: existingUser.mobile,
        email: existingUser.email,
        profilePicture: existingUser.profilePicture,
        bio: existingUser.bio,
        followers: existingUser.followers,
        following: existingUser.following,
        isSuspended: existingUser.isSuspended,
        createdAt: existingUser.createdAt,
      });
    }

    // Check if username is taken (for New User)
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // ✅ Create new user
    const newUser = new User({
      userid: uuidv4(),
      mobile,
      username,
      name: name || "",
      email: email || "",
      profilePicture: profilePicture || "",
      bio: bio || "",
      isConnected: isConnected || false, // ✅ added here
      seller_id: seller_id || "",
      userseller_id: userseller_id || "",
    });

    const savedUser = await newUser.save();

    return res.status(201).json({
      message: "User registered successfully",
      _id: savedUser._id,
      userid: savedUser.userid,
      username: savedUser.username,
      name: savedUser.name,
      isConnected: savedUser.isConnected, // ✅ added in response
      seller_id: savedUser.seller_id,
      userseller_id: savedUser.userseller_id,
      mobile: savedUser.mobile,
      email: savedUser.email,
      profilePicture: savedUser.profilePicture,
      bio: savedUser.bio,
      followers: savedUser.followers,
      following: savedUser.following,
      isSuspended: savedUser.isSuspended,
      createdAt: savedUser.createdAt,
    });
  } catch (error) {
    console.error("Error processing user:", error);
    if (error.code === 11000) {
      const key = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${key} already exists` });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const status = req.query.status || "";
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";

    // 🔍 Build Query Object
    const query = {};

    // ✅ Search Filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userid: { $regex: search, $options: "i" } },
      ];
    }

    // ✅ Status Filter
    if (status === "active") {
      query.isSuspended = false;
    }

    if (status === "suspended") {
      query.isSuspended = true;
    }

    // ✅ Date Range Filter
    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include full end day
        query.createdAt.$lte = end;
      }
    }

    // ✅ Total AFTER filters
    const total = await User.countDocuments(query);

    // ✅ Paginated + filtered users
    const users = await User.find(query, "-passwordHash")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get(
  "/admin_users",
  adminAuth,
  checkPermission("VIEW_USERS"),
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 15;
      const skip = (page - 1) * limit;

      const search = req.query.search || "";
      const status = req.query.status || "";
      const startDate = req.query.startDate || "";
      const endDate = req.query.endDate || "";

      // 🔍 Build Query Object
      const query = {};

      // ✅ Search Filter
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { userid: { $regex: search, $options: "i" } },
        ];
      }

      // ✅ Status Filter
      if (status === "active") {
        query.isSuspended = false;
      }

      if (status === "suspended") {
        query.isSuspended = true;
      }

      // ✅ Date Range Filter
      if (startDate || endDate) {
        query.createdAt = {};

        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // include full end day
          query.createdAt.$lte = end;
        }
      }

      // ✅ Total AFTER filters
      const total = await User.countDocuments(query);

      // ✅ Paginated + filtered users
      const users = await User.find(query, "-passwordHash")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      res.status(200).json({
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// search users and videos
router.get("/search_populer", async (req, res) => {
  try {
    const query = req.query?.query?.trim() || "";
    const userPage = parseInt(req.query.userPage) || 1;
    const videoPage = parseInt(req.query.videoPage) || 1;
    const userLimit = parseInt(req.query.userLimit) || 10;
    const videoLimit = parseInt(req.query.videoLimit) || 20; // ✅ 20 videos per page

    const userSkip = (userPage - 1) * userLimit;
    const videoSkip = (videoPage - 1) * videoLimit;

    // ✅ CASE 1: When query is EMPTY → Show Explore page (Trending Videos Only)
    if (!query) {
      const videos = await Reel.find({ status: "Published" })
        .select(
          "userid username name videoUrl thumbnailUrl caption likes views createdAt music",
        )
        .populate("music", "title artist thumbnail")
        .sort({ views: -1, createdAt: -1 }) // Popular & recent
        .skip(videoSkip)
        .limit(videoLimit);

      const hasMoreVideos = videos.length === videoLimit;

      return res.status(200).json({
        users: [],
        videos,
        hasMoreUsers: false,
        hasMoreVideos,
        currentPage: videoPage,
        totalPerPage: videoLimit,
      });
    }

    // ✅ CASE 2: query present → decide based on parameters
    const hasUserPagination = !!req.query.userPage;
    const hasVideoPagination = !!req.query.videoPage;

    let users = [];
    let videos = [];
    let hasMoreUsers = false;
    let hasMoreVideos = false;

    // 🔍 USER SEARCH
    if (hasUserPagination) {
      users = await User.aggregate([
        {
          $match: {
            $or: [
              { username: { $regex: query, $options: "i" } },
              // { name: { $regex: query, $options: "i" } },
            ],
          },
        },
        {
          $addFields: {
            followersCount: { $size: { $ifNull: ["$followers", []] } },
          },
        },
        { $sort: { followersCount: -1, createdAt: -1, _id: 1 } },
        { $skip: userSkip },
        { $limit: userLimit },
        {
          $project: {
            userid: 1,
            username: 1,
            name: 1,
            profilePicture: 1,
            bio: 1,
            followersCount: 1,
          },
        },
      ]);

      hasMoreUsers = users.length === userLimit;
    }

    // 🎬 VIDEO SEARCH (username, caption, or music)
    if (hasVideoPagination) {
      const videoQuery = [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
        { caption: { $regex: query, $options: "i" } },
      ];

      // 🎵 match music
      const matchedMusic = await Music.find({
        title: { $regex: query, $options: "i" },
      }).select("_id");

      if (matchedMusic.length > 0) {
        videoQuery.push({ music: { $in: matchedMusic.map((m) => m._id) } });
      }

      videos = await Reel.find({
        $or: videoQuery,
        status: "Published",
      })
        .select(
          "userid username name videoUrl thumbnailUrl caption likes views createdAt music",
        )
        .populate("music", "title artist thumbnail")
        .sort({ views: -1, createdAt: -1 }) // Popular + newest first
        .skip(videoSkip)
        .limit(videoLimit);

      hasMoreVideos = videos.length === videoLimit;
    }

    return res.status(200).json({
      users,
      videos,
      hasMoreUsers,
      hasMoreVideos,
      currentUserPage: userPage,
      currentVideoPage: videoPage,
      userLimit,
      videoLimit,
    });
  } catch (err) {
    console.error("❌ Search API Error:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});

//get single user
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Fetch user by userid
    const user = await User.findOne({ userid: id }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Count reels by user ObjectId (safer)
    const postCount = await Reel.countDocuments({ user: user._id });

    // ✅ Return user info + post count
    res.json({
      _id: user._id,
      userid: user.userid,
      username: user.username,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      isConnected: user.isConnected || false,
      seller_id: user.seller_id || "",
      userseller_id: user.userseller_id || "",
      lastConnectedAt: user.lastConnectedAt,
      followers: user.followers,
      following: user.following,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt,
      postCount,
    });
  } catch (err) {
    console.error("Error fetching user data:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ message: "Server error" });
  }
});
// get user posts with pagination
router.get("/userpost/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Get pagination parameters from query string
    let limit = parseInt(req.query.limit) || 12; // default to 10
    let skip = parseInt(req.query.skip) || 0; // default to 0

    // Validate inputs
    if (limit < 1 || limit > 50) limit = 10; // enforce max limit
    if (skip < 0) skip = 0;

    // Step 1: Fetch user (excluding passwordHash)
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Step 2: Get total count of reels
    const totalCount = await Reel.countDocuments({ user: userId });

    // Step 3: Get reels for this page
    const reels = await Reel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Step 4: Determine if more data is available
    const hasMore = skip + reels.length < totalCount;

    // Step 5: Return user data + reels + metadata
    res.json({
      user: user.toObject(),
      postCount: totalCount,
      reels,
      hasMore,
    });
  } catch (err) {
    console.error("Error fetching user reels:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/admin_userpost/:id", adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get pagination parameters from query string
    let limit = parseInt(req.query.limit) || 12; // default to 10
    let skip = parseInt(req.query.skip) || 0; // default to 0

    // Validate inputs
    if (limit < 1 || limit > 50) limit = 10; // enforce max limit
    if (skip < 0) skip = 0;

    // Step 1: Fetch user (excluding passwordHash)
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Step 2: Get total count of reels
    const totalCount = await Reel.countDocuments({ user: userId });

    // Step 3: Get reels for this page
    const reels = await Reel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Step 4: Determine if more data is available
    const hasMore = skip + reels.length < totalCount;

    // Step 5: Return user data + reels + metadata
    res.json({
      user: user.toObject(),
      postCount: totalCount,
      reels,
      hasMore,
    });
  } catch (err) {
    console.error("Error fetching user reels:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all followers of a user (ADMIN)
router.get("/:userid/followers", adminAuth, async (req, res) => {
  try {
    const { userid } = req.params;

    // find user by custom userid
    const user = await User.findOne({ userid }).populate(
      "followers",
      "userid username name profilePicture",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      total: user.followers.length,
      followers: user.followers,
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    return res.status(500).json({ message: "Error fetching followers" });
  }
});
// GET all following of a specific user (ADMIN VIEW)
router.get("/admin/users/:userid/following", adminAuth, async (req, res) => {
  try {
    const { userid } = req.params;

    const user = await User.findOne({ userid }).populate(
      "following",
      "userid username name profilePicture",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      total: user.following.length,
      following: user.following,
    });
  } catch (error) {
    console.error("Error fetching following:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    return res.status(500).json({ message: "Server error" });
  }
});

// get user liked posts
router.get("/userlikedposts/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Pagination parameters
    let limit = parseInt(req.query.limit) || 10;
    let skip = parseInt(req.query.skip) || 0;

    if (limit < 1 || limit > 50) limit = 10;
    if (skip < 0) skip = 0;

    // 🔢 TOTAL liked reels count
    const totalLikes = await Reel.countDocuments({ likes: userId });

    // 📦 Fetch liked reels (paginated)
    const likedReels = await Reel.find({ likes: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username name profilePicture");

    // 🔁 More data available or not
    const hasMore = skip + likedReels.length < totalLikes;

    // ✅ FINAL RESPONSE
    res.status(200).json({
      totalLikes, // 👈 TOTAL likes count
      count: likedReels.length,
      reels: likedReels,
      hasMore,
    });
  } catch (err) {
    console.error("Error fetching user's liked reels:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});

// get user followers and following and profile
router.get("/userfollowing/:id", async (req, res) => {
  try {
    const user = await User.findOne({ userid: req.params.id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔹 CLEAN FOLLOWERS
    const validFollowers = await User.find(
      { _id: { $in: user.followers } },
      "_id",
    );
    const validFollowerIds = validFollowers.map((u) => u._id);

    // 🔹 CLEAN FOLLOWING
    const validFollowing = await User.find(
      { _id: { $in: user.following } },
      "_id",
    );
    const validFollowingIds = validFollowing.map((u) => u._id);

    // 🔥 UPDATE BOTH ARRAYS IN DB
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          followers: validFollowerIds,
          following: validFollowingIds,
        },
      },
    );

    // 🔁 FETCH CLEAN USER WITH POPULATE
    const cleanUser = await User.findById(user._id)
      .populate("followers", "userid username name profilePicture")
      .populate("following", "userid username name profilePicture");

    res.json(cleanUser);
  } catch (err) {
    console.error("Cleanup error:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});

// find user by mobile
router.get("/bymobile/:mobile", async (req, res) => {
  try {
    const user = await User.findOne({ mobile: req.params.mobile }).select(
      "-passwordHash",
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    await logError(req, err);
    err.statusCode = err.statusCode || 500;
    res.status(500).json({ message: "Server error" });
  }
});

// find user by email
router.get("/byemailapp/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    await logError(req, err);
    err.statusCode = err.statusCode || 500;
    res.status(500).json({ message: "Server error" });
  }
});

// delete user
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. User ko dhoondo delete karne se pehle taaki uska naam mil sake
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Naam ko variable mein save karo (Delete hone ke baad ye nahi milega)
    const deletedUserName =
      user.userName || user.username || user.name || "Unknown User";

    await Promise.all([
      // Delete all reels of this user
      Reel.deleteMany({ user: userId }),

      // Delete all comments of this user
      Comment.deleteMany({ user: userId }),

      // Remove user from followers/following of other users
      User.updateMany({ followers: userId }, { $pull: { followers: userId } }),
      User.updateMany({ following: userId }, { $pull: { following: userId } }),

      // Remove user from likes/shares of Reels
      Reel.updateMany({ likes: userId }, { $pull: { likes: userId } }),
      Reel.updateMany(
        { "shares.sharedBy": userId },
        { $pull: { shares: { sharedBy: userId } } },
      ),
      Reel.updateMany(
        { "shares.sharedTo": userId },
        { $pull: { shares: { sharedTo: userId } } },
      ),
    ]);

    // Actual user deletion
    await user.deleteOne();

    try {
      // 3. logUserAction mein targetName pass kiya
      await logUserAction({
        user: req.user._id,
        userName: req.userName,
        userRole: req.userRole,
        action: "delete_user",
        targetType: "User",
        targetId: userId, // Jisko delete kiya uski ID
        targetName: deletedUserName, // ✅ Jisko delete kiya uska NAAM
        device: req.headers["user-agent"],
        location: {
          ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
          country: req.headers["cf-ipcountry"] || "",
        },
      });
    } catch (e) {
      console.error("Delete user log error:", e.message);
    }

    // Response mein bhi naam dikhao taaki confirmation mile
    res.json({
      message: `User ${deletedUserName} and all related data deleted successfully`,
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete(
  "/admin_users/:id",
  adminAuth,
  checkPermission("DELETE_USER"),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // 1. User ko dhoondo delete karne se pehle taaki uska naam mil sake
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // 2. Naam ko variable mein save karo (Delete hone ke baad ye nahi milega)
      const deletedUserName =
        user.userName || user.username || user.name || "Unknown User";

      await Promise.all([
        // Delete all reels of this user
        Reel.deleteMany({ user: userId }),

        // Delete all comments of this user
        Comment.deleteMany({ user: userId }),

        // Remove user from followers/following of other users
        User.updateMany(
          { followers: userId },
          { $pull: { followers: userId } },
        ),
        User.updateMany(
          { following: userId },
          { $pull: { following: userId } },
        ),

        // Remove user from likes/shares of Reels
        Reel.updateMany({ likes: userId }, { $pull: { likes: userId } }),
        Reel.updateMany(
          { "shares.sharedBy": userId },
          { $pull: { shares: { sharedBy: userId } } },
        ),
        Reel.updateMany(
          { "shares.sharedTo": userId },
          { $pull: { shares: { sharedTo: userId } } },
        ),
      ]);

      // Actual user deletion
      await user.deleteOne();

      try {
        // 3. logUserAction mein targetName pass kiya
        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,
          action: "delete_user",
          targetType: "User",
          targetId: userId, // Jisko delete kiya uski ID
          targetName: deletedUserName, // ✅ Jisko delete kiya uska NAAM
          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
            country: req.headers["cf-ipcountry"] || "",
          },
        });
      } catch (e) {
        console.error("Delete user log error:", e.message);
      }

      // Response mein bhi naam dikhao taaki confirmation mile
      res.json({
        message: `User ${deletedUserName} and all related data deleted successfully`,
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      err.statusCode = err.statusCode || 500;
      await logError(req, err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// follow to user
router.put("/:id/follow", async (req, res) => {
  const { userId } = req.body;

  if (userId === req.params.id)
    return res.status(400).json({ message: "You can't follow yourself" });

  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(userId);
    if (!userToFollow || !currentUser)
      return res.status(404).json({ message: "User not found" });

    if (currentUser.isSuspended) {
      return res.status(200).json({
        message: "Action ignored",
      });
    }

    if (!userToFollow.followers.includes(userId)) {
      userToFollow.followers.push(userId);
      currentUser.following.push(req.params.id);

      await userToFollow.save();
      await currentUser.save();

      // ✅ Create notification with ObjectId + userid
      await createNotification({
        recipientObjectId: userToFollow._id,
        senderObjectId: currentUser._id,
        recipientUserId: userToFollow.userid,
        senderUserId: currentUser.userid,
        type: "follow",
        message: "started following you",
      });

      return res.json({ message: "User followed" });
    } else {
      return res.status(400).json({ message: "Already following" });
    }
  } catch (err) {
    console.error("Follow error:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    return res.status(500).json({ message: "Server error" });
  }
});

// unfollow user
router.put("/:id/unfollow", async (req, res) => {
  const { userId } = req.body;
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(userId);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.isSuspended) {
      return res.status(200).json({
        message: "Action ignored",
      });
    }

    if (userToUnfollow.followers.includes(userId)) {
      userToUnfollow.followers.pull(userId);
      currentUser.following.pull(req.params.id);
      await userToUnfollow.save();
      await currentUser.save();

      // Safely log user action (even if log fails, app continues)
      try {
        await logUserAction({
          user: userId,
          action: "unfollow_user",
          targetType: "User",
          targetId: req.params.id,
          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
            country: req.headers["cf-ipcountry"] || "",
            city: "", // Optional: Use IP geolocation later
            pincode: "",
          },
        });
      } catch (logError) {
        console.error("Log error (non-blocking):", logError.message);
      }
      res.json({ message: "User unfollowed" });
    } else {
      res.status(400).json({ message: "You are not following this user" });
    }
  } catch (err) {
    await logError(req, err);
    err.statusCode = err.statusCode || 500;
    res.status(500).json({ message: "Server error" });
  }
});

// remove follower
router.put("/:id/remove-follower", async (req, res) => {
  const { userId } = req.body; // userId = the user to remove from followers
  const targetUserId = req.params.id; // id = the profile owner (you)
  console.log(targetUserId);

  if (userId === targetUserId) {
    return res.status(400).json({ message: "You can't remove yourself" });
  }

  try {
    const targetUser = await User.findById(targetUserId); // profile owner
    const followerUser = await User.findById(userId); // the one who follows

    if (!targetUser || !followerUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.isSuspended) {
      return res.status(200).json({
        message: "Action ignored",
      });
    }

    if (targetUser.followers.includes(userId)) {
      // Remove follower from your followers list
      targetUser.followers.pull(userId);
      // Remove yourself from their following list
      followerUser.following.pull(targetUserId);

      await targetUser.save();
      await followerUser.save();

      // Safely log user action
      try {
        await logUserAction({
          user: targetUserId, // you (the profile owner) initiated this
          action: "remove_follower",
          targetType: "User",
          targetId: userId, // the follower being removed
          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
            country: req.headers["cf-ipcountry"] || "",
            city: "",
            pincode: "",
          },
        });
      } catch (logError) {
        console.error("Log error (non-blocking):", logError.message);
      }

      return res.json({ message: "Follower removed successfully" });
    } else {
      return res
        .status(400)
        .json({ message: "This user is not your follower" });
    }
  } catch (err) {
    console.error("Remove follower error:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    return res.status(500).json({ message: "Server error" });
  }
});

// update user

router.put("/:id", async (req, res) => {
  const {
    username,
    name,
    email,
    mobile,
    profilePicture,
    bio,
    currentPassword,
    newPassword,
    isSuspended,
  } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const targetUserName = user.username || "Unknown User";

    // Password update logic (Same as before)
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch)
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // 🔹 Check karo kya Name ya Username change ho raha hai
    const isNameChanged =
      (name && name !== user.name) || (username && username !== user.username);

    // Fields update
    if (username) user.username = username;
    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;
    if (bio) user.bio = bio;
    if (typeof isSuspended === "boolean") user.isSuspended = isSuspended;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email))
        return res.status(400).json({ message: "Invalid email format" });
      user.email = email;
    }

    if (mobile) {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(mobile))
        return res
          .status(400)
          .json({ message: "Mobile number must be 10 digits" });
      user.mobile = mobile;
    }

    const updatedUser = await user.save();

    // 🔥 MAIN LOGIC: External API Call
    // Agar Name/Username change hua hai AUR user connected hai
    if (
      isNameChanged &&
      updatedUser.isConnected === true &&
      updatedUser.seller_id
    ) {
      try {
        await axios.post(
          "https://supplier.welfog.com/api/playlinks/sellerplay",
          {
            seller_id: updatedUser.seller_id,
            play_profile_user_name: updatedUser.username,
            play_profile_name: updatedUser.name,
          },
        );
        console.log("External API updated successfully");
      } catch (apiErr) {
        // Hum response block nahi karenge agar external API fail ho jaye,
        // bas log karenge.
        console.error("External API Update Failed:", apiErr.message);
      }
    }

    // Suspend Log Logic (Same as before)
    try {
      if (typeof isSuspended === "boolean") {
        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,
          action: isSuspended ? "account_suspended" : "account_reactivated",
          targetType: "User",
          targetId: user._id,
          targetName: targetUserName,
          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
            country: req.headers["cf-ipcountry"] || "",
          },
        });
      }
    } catch (e) {
      console.error("User suspend log error:", e.message);
    }

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
      bio: updatedUser.bio,
      isSuspended: updatedUser.isSuspended,
      mobile: updatedUser.mobile,
      isConnected: updatedUser.isConnected,
      seller_id: updatedUser.seller_id,
      createdAt: updatedUser.createdAt,
    });
  } catch (err) {
    console.error("Update error:", err);
    await logError(req, err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/admin_users/:id",
  adminAuth,
  checkPermission("SUSPEND_USER"),
  async (req, res) => {
    const {
      username,
      name,
      email,
      mobile,
      profilePicture,
      bio,
      currentPassword,
      newPassword,
      isSuspended,
    } = req.body;

    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // ✅ PEHLA ADD: User ka username capture kiya log ke liye
      const targetUserName = user.username || user.userName || "Unknown User";

      // Update password if needed
      if (currentPassword && newPassword) {
        const isMatch = await bcrypt.compare(
          currentPassword,
          user.passwordHash,
        );
        if (!isMatch)
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.passwordHash = hashedPassword;
      }

      // Update other fields
      if (username) user.username = username;
      if (name) user.name = name;
      if (profilePicture) user.profilePicture = profilePicture;
      if (bio) user.bio = bio;
      if (typeof isSuspended === "boolean") user.isSuspended = isSuspended;

      // Validate email
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // normal email validation
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Invalid email format" });
        }
        user.email = email;
      }

      // Validate mobile number (only 10 digits allowed)
      if (mobile) {
        const mobileRegex = /^[0-9]{10}$/; // exactly 10 digits
        if (!mobileRegex.test(mobile)) {
          return res
            .status(400)
            .json({ message: "Mobile number must be exactly 10 digits" });
        }
        user.mobile = mobile;
      }

      const updatedUser = await user.save();

      try {
        if (typeof isSuspended === "boolean") {
          await logUserAction({
            user: req.user._id,
            userName: req.userName,
            userRole: req.userRole,

            action: isSuspended ? "account_suspended" : "account_reactivated",

            targetType: "User",
            targetId: user._id, // ✅ jisko suspend / unsuspend kiya

            // ✅ DUSRA ADD: Target Name pass kiya dashboard ke liye
            targetName: targetUserName,

            device: req.headers["user-agent"],
            location: {
              ip:
                req.headers["x-forwarded-for"] ||
                req.socket.remoteAddress ||
                "",
              country: req.headers["cf-ipcountry"] || "",
            },
          });
        }
      } catch (e) {
        console.error("User suspend log error:", e.message);
      }

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        bio: updatedUser.bio,
        isSuspended: updatedUser.isSuspended,
        mobile: updatedUser.mobile,
        createdAt: updatedUser.createdAt,
      });
    } catch (err) {
      console.error("Update error:", err);
      err.statusCode = err.statusCode || 500;
      await logError(req, err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Get comprehensive user activity details
router.get("/:id/activity", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, category, page = 1, limit = 10 } = req.query;

    // Find user by _id or userid
    const user = await User.findOne({
      $or: [{ _id: id }, { userid: id }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const activities = [];

    // 1. User Logs (login history, actions)
    const logFilter = { user: userId, ...dateFilter };
    if (category === "authentication" || category === "moderation") {
      if (category === "authentication") {
        logFilter.action = { $in: ["login", "logout"] };
      } else if (category === "moderation") {
        logFilter.action = {
          $in: ["report_reel", "account_suspended", "account_reactivated"],
        };
      }
    }

    const userLogs = await UserLog.find(logFilter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 2); // Get more to account for other sources

    userLogs.forEach((log) => {
      // Mask IP address for privacy (show only last octet)
      const location = log.location ? { ...log.location } : {};
      if (location.ip) {
        const ipParts = location.ip.split(".");
        if (ipParts.length === 4) {
          location.ip = `***.***.***.${ipParts[3]}`;
        } else {
          location.ip = "***.***.***.***";
        }
      }

      activities.push({
        type: "log",
        category: getCategoryFromAction(log.action),
        timestamp: log.createdAt,
        action: log.action,
        metadata: {
          device: log.device,
          browser: log.browser,
          location: location,
          targetType: log.targetType,
          targetId: log.targetId,
          ...log.metadata,
        },
      });
    });

    // 2. Reels (Posts, Liked Reels, Commented Reels)
    if (!category || category === "content" || category === "social") {
      // User's own reels
      const userReels = await Reel.find({ user: userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .limit(100);

      userReels.forEach((reel) => {
        activities.push({
          type: "reel",
          category: "content",
          timestamp: reel.createdAt,
          action: "upload_reel",
          metadata: {
            reelId: reel._id,
            status: reel.status,
            caption: reel.caption,
            views: reel.views,
            likes: reel.likes?.length || 0,
            blockedAt: reel.blockedAt,
            blockReason: reel.blockReason,
          },
        });

        // Status changes
        if (reel.status === "Blocked" && reel.blockedAt) {
          activities.push({
            type: "reel",
            category: "moderation",
            timestamp: reel.blockedAt,
            action: "block_reel",
            metadata: {
              reelId: reel._id,
              reason: reel.blockReason,
              caption: reel.caption,
            },
          });
        }

        // Updated reels
        if (
          reel.updatedAt &&
          reel.updatedAt.getTime() !== reel.createdAt.getTime()
        ) {
          activities.push({
            type: "reel",
            category: "content",
            timestamp: reel.updatedAt,
            action: "edit_reel",
            metadata: {
              reelId: reel._id,
              caption: reel.caption,
            },
          });
        }
      });

      // Liked reels
      const likedReels = await Reel.find({
        likes: userId,
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .limit(100);

      likedReels.forEach((reel) => {
        // Find when user liked it (approximate from reel creation or use a more sophisticated method)
        activities.push({
          type: "reel_like",
          category: "social",
          timestamp: reel.updatedAt || reel.createdAt,
          action: "like_reel",
          metadata: {
            reelId: reel._id,
            authorId: reel.user,
            authorUsername: reel.username,
            caption: reel.caption,
          },
        });
      });
    }

    // 3. Comments (Comments made, Liked comments, Replies)
    if (!category || category === "social" || category === "content") {
      // Comments made by user
      const userComments = await Comment.find({ user: userId, ...dateFilter })
        .populate("reel", "caption username")
        .sort({ createdAt: -1 })
        .limit(100);

      userComments.forEach((comment) => {
        activities.push({
          type: "comment",
          category: "social",
          timestamp: comment.createdAt,
          action: comment.parentComment ? "reply_comment" : "comment",
          metadata: {
            commentId: comment._id,
            reelId: comment.reel?._id || comment.reel,
            reelCaption: comment.reel?.caption,
            text: comment.text,
            likes: comment.likes?.length || 0,
            isReply: !!comment.parentComment,
            parentCommentId: comment.parentComment,
          },
        });
      });

      // Liked comments (need to check all comments)
      const allComments = await Comment.find({
        likes: userId,
        ...dateFilter,
      })
        .populate("reel", "caption username")
        .sort({ createdAt: -1 })
        .limit(100);

      allComments.forEach((comment) => {
        activities.push({
          type: "comment_like",
          category: "social",
          timestamp: comment.updatedAt || comment.createdAt,
          action: "like_comment",
          metadata: {
            commentId: comment._id,
            reelId: comment.reel?._id || comment.reel,
            text: comment.text,
            authorId: comment.user,
          },
        });
      });
    }

    // 4. Followers and Following
    if (!category || category === "social") {
      // Get followers list
      const followers = await User.find({ _id: { $in: user.followers } })
        .select("username name profilePicture createdAt")
        .sort({ createdAt: -1 });

      followers.forEach((follower) => {
        activities.push({
          type: "follower",
          category: "social",
          timestamp: follower.createdAt, // Approximate
          action: "follow_user",
          metadata: {
            userId: follower._id,
            username: follower.username,
            name: follower.name,
            profilePicture: follower.profilePicture,
          },
        });
      });

      // Get following list
      const following = await User.find({ _id: { $in: user.following } })
        .select("username name profilePicture createdAt")
        .sort({ createdAt: -1 });

      following.forEach((followed) => {
        activities.push({
          type: "following",
          category: "social",
          timestamp: followed.createdAt, // Approximate
          action: "follow_user",
          metadata: {
            userId: followed._id,
            username: followed.username,
            name: followed.name,
            profilePicture: followed.profilePicture,
          },
        });
      });
    }

    // 5. Music uploads
    if (!category || category === "content") {
      const musicUploads = await Music.find({
        uploadedBy: userId,
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .limit(100);

      musicUploads.forEach((music) => {
        activities.push({
          type: "music",
          category: "content",
          timestamp: music.createdAt,
          action: "upload_music",
          metadata: {
            musicId: music._id,
            title: music.title,
            artist: music.artist,
          },
        });
      });
    }

    // 6. Account lifecycle
    activities.push({
      type: "account",
      category: "authentication",
      timestamp: user.createdAt,
      action: "account_created",
      metadata: {
        username: user.username,
        name: user.name,
      },
    });

    if (user.isSuspended) {
      // Approximate suspension time (could be enhanced with actual log)
      activities.push({
        type: "account",
        category: "moderation",
        timestamp: user.updatedAt || user.createdAt,
        action: "account_suspended",
        metadata: {},
      });
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const total = activities.length;
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    // Get summary counts
    const summary = {
      totalPosts: await Reel.countDocuments({ user: userId }),
      totalLikedReels: await Reel.countDocuments({ likes: userId }),
      totalComments: await Comment.countDocuments({ user: userId }),
      totalLikedComments: await Comment.countDocuments({ likes: userId }),
      totalFollowers: user.followers?.length || 0,
      totalFollowing: user.following?.length || 0,
      totalMusicUploads: await Music.countDocuments({ uploadedBy: userId }),
      totalLogins: await UserLog.countDocuments({
        user: userId,
        action: "login",
      }),
    };

    res.json({
      user: {
        _id: user._id,
        userid: user.userid,
        username: user.username,
        name: user.name,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        isSuspended: user.isSuspended,
      },
      summary,
      activities: paginatedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to categorize actions
function getCategoryFromAction(action) {
  if (
    [
      "login",
      "logout",
      "account_created",
      "account_suspended",
      "account_reactivated",
    ].includes(action)
  ) {
    return "authentication";
  }
  if (
    [
      "report_reel",
      "block_reel",
      "account_suspended",
      "account_reactivated",
    ].includes(action)
  ) {
    return "moderation";
  }
  if (
    [
      "upload_reel",
      "delete_reel",
      "edit_reel",
      "upload_music",
      "delete_music",
    ].includes(action)
  ) {
    return "content";
  }
  if (
    [
      "like_reel",
      "unlike_reel",
      "comment",
      "reply_comment",
      "like_comment",
      "follow_user",
      "unfollow_user",
    ].includes(action)
  ) {
    return "social";
  }
  return "other";
}

module.exports = router;
