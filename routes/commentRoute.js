const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const User = require("../models/Users");
const Reel2 = require("../models/Reel"); // This is your Reel model
const createNotification = require("../utils/createNotification");
const adminAuth = require("../middleware/adminAuth");
const checkPermission = require("../middleware/checkPermission");
const logUserAction = require("../utils/logUserAction");
const logError = require("../utils/logError");
router.post("/new", async (req, res) => {
  try {
    const { user: userId, reel: reelId, text, parentComment } = req.body;

    if (!userId || !reelId || !text) {
      return res.status(400).json({
        message: "Missing user, reel, or comment text.",
      });
    }

    // ✅ Fetch commenter
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.userid) return res.status(500).json({ message: "User.userid missing" });

    if (user.isSuspended) {
      return res.status(200).json({
        message: "Comment ignored"
      });
    }

    // ✅ Fetch reel
    const reelData = await Reel2.findById(reelId);
    if (!reelData) return res.status(404).json({ message: "Reel not found" });
    if (!reelData.userid) return res.status(500).json({ message: "Reel.userid missing" });

    const comment = new Comment({
      user: userId,            // ObjectId
      reel: reelId,            // ObjectId
      text,
      parentComment: parentComment || null,
    });


    const savedComment = await comment.save();


    reelData.comments.push(savedComment._id);
    await reelData.save();

    // try {
    //   await logUserAction({
    //     user: user._id,
    //     userName: user.username || user.name || "User",
    //     userRole: "user", // 🔥 app user rule

    //     action: parentComment ? "reply_comment" : "comment",
    //     targetType: "Reel",
    //     targetId: reelId,

    //     device: req.headers["user-agent"],
    //     location: {
    //       ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    //       country: req.headers["cf-ipcountry"] || "",
    //     },
    //   });
    // } catch (logErr) {
    //   console.error("Comment log error:", logErr.message);
    // }

    // 4️⃣ CREATE COMMENT / REPLY NOTIFICATION
    try {

      // 🔹 CASE 1: MAIN COMMENT
      if (!parentComment) {
        await createNotification({
          recipientObjectId: reelData.user,   // reel owner
          senderObjectId: user._id,
          recipientUserId: reelData.userid,
          senderUserId: user.userid,
          type: "comment",
          reel: reelId,
          comment: savedComment._id,
          message: `commented on your reel: "${savedComment.text}"`
        });
      }

      // 🔹 CASE 2: REPLY TO COMMENT
      else {
        const parent = await Comment.findById(parentComment).populate("user");

        // ✅ parent comment not found → just skip notification
        if (!parent || !parent.user) {
          console.log("Parent comment or user missing, skip reply notification");
        }
        // ✅ self reply → skip notification
        else if (parent.user._id.toString() === userId.toString()) {
          console.log("Self reply detected, skip notification");
        }
        else {
          await createNotification({
            recipientObjectId: parent.user._id,   // 👈 parent comment owner
            senderObjectId: user._id,
            recipientUserId: parent.user.userid,
            senderUserId: user.userid,
            type: "comment",
            reel: reelId,
            comment: savedComment._id,
            message: `replied: "${savedComment.text}"`
          });
        }
      }

    } catch (err) {
      console.error("Notification error:", err.message);
    }


    // 5️⃣ Response
    return res.status(201).json(savedComment);

  } catch (error) {
    console.error("Comment creation error:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    return res.status(500).json({
      message: "Error occurred in Comment creation",
    });
  }
});


router.get("/",  async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || "";
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";

    const skip = (page - 1) * limit;

    // 🔍 Build Query Object
    const query = {};

    // ✅ Search Filter
  if (search) {
      const users = await User.find({
        username: { $regex: search, $options: "i" }
      }).select("_id");

      const userIds = users.map(u => u._id);

      query.$or = [
        { text: { $regex: search, $options: "i" } },
        { user: { $in: userIds } }
      ];
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

    const totalComments = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate("user", "userid username name profilePicture")
      .populate("reel", "caption")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalComments,
      totalPages: Math.ceil(totalComments / limit),
      comments,
    });

  } catch (error) {
    console.error("Error fetching comments:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
});
// admin get all comments with search and filter
router.get("/admin-view", adminAuth, checkPermission("VIEW_COMMENTS"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || "";
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";

    const skip = (page - 1) * limit;

    // 🔍 Build Query Object
    const query = {};

    // ✅ Search Filter
  if (search) {
      const users = await User.find({
        username: { $regex: search, $options: "i" }
      }).select("_id");

      const userIds = users.map(u => u._id);

      query.$or = [
        { text: { $regex: search, $options: "i" } },
        { user: { $in: userIds } }
      ];
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

    const totalComments = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate("user", "userid username name profilePicture")
      .populate("reel", "caption")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalComments,
      totalPages: Math.ceil(totalComments / limit),
      comments,
    });

  } catch (error) {
    console.error("Error fetching comments:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
});
// 🔥 GET all comments of a specific user(admin)
router.get("/user/:userid", adminAuth ,  async (req, res) => {
  try {
    const { userid } = req.params;

    // pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    // find user by custom userid
    const user = await User.findOne({ userid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
     const commentQuery = { user: user._id };

    if (startDate || endDate) {
      commentQuery.createdAt = {};

      if (startDate) {
        commentQuery.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include full end day
        commentQuery.createdAt.$lte = end;
      }
    }

    // total comments count
    const totalComments = await Comment.countDocuments(commentQuery);

    // paginated comments
    const comments = await Comment.find(commentQuery)
      .populate("reel", "caption")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // format response
    const formattedComments = comments.map(c => ({
      _id: c._id,
      text: c.text,
      reelId: c.reel?._id || c.reel,
      reelCaption: c.reel?.caption || null,
      createdAt: c.createdAt,
      likes: c.likes?.length || 0
    }));

    return res.json({
      success: true,
      totalComments,
      totalPages: Math.ceil(totalComments / limit),
      currentPage: page,
      comments: formattedComments
    });

  } catch (error) {
    console.error("Error fetching user comments:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    return res.status(500).json({ message: "Error fetching user comments" });
  }
});



// find single comment 
router.get("/:id", async (req, res) => {
  try {
    const data = await Comment.findById(req.params.id);
    if (!data) {
      res.status(404).json({ message: "Comment not found" });
    };
    res.status(200).json(data);
  } catch (error) {
    await logError(req, error);
    error.statusCode = error.statusCode || 500;
    res.status(500).json({ message: "Error to fetching data" });

    console.log("Error to Fetching Data", error)
  }
});






// delete comment 
router.delete(
  "/delete/:id/:userId",
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      // ✅ Validate userId
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 🚫 Suspend check
      if (user.isSuspended) {
        return res.status(200).json({
          message: "Delete ignored",
        });
      }

      // ❌ Delete child replies first
      await Comment.deleteMany({ parentComment: id });

      // ❌ Delete main comment
      const deleted = await Comment.findByIdAndDelete(id);

      // ✅ IMPORTANT: check first
      if (!deleted) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // ✅ LOG AFTER CONFIRM DELETE
      try {
        // Comment ka text capture kiya (agar text field ka naam 'content' hai toh use badal lena)
        const deletedCommentText = deleted.text || deleted.content || "No text";

        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,
          action: "delete_comment",
          targetType: "Comment",
          targetId: deleted._id,
          
          // ✅ YAHAN ADD KIYA: ID aur Actual Comment Text
          targetName: `ID: ${deleted._id} (${deletedCommentText})`,

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
        console.error("Delete comment log error:", e.message);
      }

      return res.status(200).json({
        success: true,
        message: "Comment Deleted Successfully!",
      });
    } catch (error) {
      console.error("Error in Delete Comment", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({ message: "Error in Comment delete" });
    }
  }
);

router.delete(
  "/admin_comment/delete/:id/:userId",
  adminAuth,
  checkPermission("DELETE_COMMENT"),
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      // ✅ Validate userId
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 🚫 Suspend check
      if (user.isSuspended) {
        return res.status(200).json({
          message: "Delete ignored",
        });
      }

      // ❌ Delete child replies first
      await Comment.deleteMany({ parentComment: id });

      // ❌ Delete main comment
      const deleted = await Comment.findByIdAndDelete(id);

      // ✅ IMPORTANT: check first
      if (!deleted) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // ✅ LOG AFTER CONFIRM DELETE
      try {
        // Comment ka text capture kiya (agar text field ka naam 'content' hai toh use badal lena)
        const deletedCommentText = deleted.text || deleted.content || "No text";

        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,
          action: "delete_comment",
          targetType: "Comment",
          targetId: deleted._id,
          
          // ✅ YAHAN ADD KIYA: ID aur Actual Comment Text
          targetName: `ID: ${deleted._id} (${deletedCommentText})`,

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
        console.error("Delete comment log error:", e.message);
      }

      return res.status(200).json({
        success: true,
        message: "Comment Deleted Successfully!",
      });
    } catch (error) {
      console.error("Error in Delete Comment", error);
      error.statusCode = error.statusCode || 500;
        await logError(req, error);
      res.status(500).json({ message: "Error in Comment delete" });
    }
  }
);


//update comment
router.put("/update/:id", async (req, res) => {
  try {
    const { text, userId } = req.body;

    // 👇 user fetch
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* 👇 SUSPEND CHECK YAHAN */
    if (user.isSuspended) {
      return res.status(200).json({
        message: "Edit ignored"
      });
    }
    /* 👆 bas itna hi */

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Comment Not Found to edit!" });
    }

    comment.text = text;
    const savedComment = await comment.save();
    // try {
    //   await logUserAction({
    //     user: user._id,
    //     userName: user.username || user.name || "User",
    //     userRole: "user",                 // 🔥 app user rule

    //     action: "edit_comment",
    //     targetType: "Comment",
    //     targetId: comment._id,

    //     device: req.headers["user-agent"],
    //     location: {
    //       ip:
    //         req.headers["x-forwarded-for"] ||
    //         req.socket.remoteAddress ||
    //         "",
    //       country: req.headers["cf-ipcountry"] || "",
    //     },

    //     // (optional but useful)
    //     metadata: {
    //       oldText: comment.text,
    //       newText: text
    //     }
    //   });
    // } catch (logErr) {
    //   console.error("Edit comment log error:", logErr.message);
    // }
    res.status(201).json(savedComment);

  } catch (error) {
    console.log("Error in Update Comment", error);
    error.statusCode = error.statusCode || 500;
      await logError(req, error);
    res.status(500).json({ message: "Error in Comment" });
  }
});



// GET comments for a reel
router.get('/reel/:reelId', async (req, res) => {
  try {
    const reelId = req.params.reelId;

    const comments = await Comment.find({ reel: reelId, parentComment: null })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 });

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate('user', 'username profilePicture')
          .sort({ createdAt: 1 });

        return { ...comment._doc, replies };
      })
    );

    return res.status(200).json(commentsWithReplies); // ✅ return here to prevent further execution
  } catch (error) {
    console.error("Error fetching comments:", error);
    error.statusCode = error.statusCode || 500;
  await logError(req, error);
    // ✅ Don't send response if already sent
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
});



// comment like dislike
router.put("/like/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const commentId = req.params.id;


    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.userid) return res.status(500).json({ message: "User.userid missing" });

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (user.isSuspended) {
      return res.status(200).json({
        message: "Like ignored"
      });
    }
    // 🔹 Fetch comment with user populated
    const comment = await Comment.findById(commentId).populate("user");
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const alreadyLiked = comment.likes.includes(userId);

    // 🔁 UNLIKE
    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== userId
      );
      await comment.save();

      // try {
      //   await logUserAction({
      //     user: user._id,
      //     userName: user.username || user.name || "User",
      //     userRole: "user", // 🔥 app user rule

      //     action: "unlike_comment",
      //     targetType: "Comment",
      //     targetId: comment._id,

      //     device: req.headers["user-agent"],
      //     location: {
      //       ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
      //       country: req.headers["cf-ipcountry"] || "",
      //     },
      //   });
      // } catch (logErr) {
      //   console.error("Unlike comment log error:", logErr.message);
      // }


      return res.status(200).json({
        message: "Comment unliked",
        likes: comment.likes.length
      });
    }

    // ❤️ LIKE
    comment.likes.push(userId);
    await comment.save();

    // try {
    //   await logUserAction({
    //     user: user._id,
    //     userName: user.username || user.name || "User",
    //     userRole: "user", // 🔥 app user rule

    //     action: "like_comment",
    //     targetType: "Comment",
    //     targetId: comment._id,

    //     device: req.headers["user-agent"],
    //     location: {
    //       ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    //       country: req.headers["cf-ipcountry"] || "",
    //     },
    //   });
    // } catch (logErr) {
    //   console.error("Like comment log error:", logErr.message);
    // }

    // 🔔 CREATE NOTIFICATION (ONLY IF NOT SELF-LIKE)
    if (comment.user && comment.user._id.toString() !== userId.toString()) {
      try {
        await createNotification({
          recipientObjectId: comment.user._id,
          senderObjectId: userId,
          recipientUserId: comment.user.userid,
          senderUserId: user.userid,
          type: "comment",
          reel: comment.reel,
          comment: comment._id,
          message: comment.parentComment
            ? `liked your reply: "${comment.text}"`
            : `liked your comment: "${comment.text}"`
        });
      } catch (notifErr) {
        console.error("Comment-like notification failed:", notifErr.message);
      }
    }

    return res.status(200).json({
      message: "Comment liked",
      likes: comment.likes.length
    });

  } catch (error) {
    console.error("Error in liking comment:", error);
    error.statusCode = error.statusCode || 500;
      await logError(req, error);
    res.status(500).json({ message: "Something went wrong" });
  }
});


// GET all comments liked by a user (ADMIN VIEW)
router.get("/admin/users/:userid/liked-comments", adminAuth , async (req, res) => {
  try {
    const { userid } = req.params;

    // pagination (optional but safe)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1️⃣ find user by custom userid
    const user = await User.findOne({ userid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ count total liked comments (only on unblocked reels)
    const total = await Comment.countDocuments({
      likes: user._id,
    });

    // 3️⃣ fetch comments
    const comments = await Comment.find({
      likes: user._id,
    })
      // 🔥 VERY IMPORTANT
      .populate({
        path: "reel",
        select: "_id caption status",
        match: { status: { $ne: "Blocked" } }, // ❌ blocked reels hide
      })
      .populate("user", "userid username name profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 4️⃣ remove comments whose reel is null (blocked / deleted)
    const filteredComments = comments.filter(c => c.reel);

    return res.json({
      success: true,
      page,
      limit,
      total: filteredComments.length,
      comments: filteredComments,
    });

  } catch (error) {
    console.error("Error fetching liked comments:", error);
    error.statusCode = error.statusCode || 500;
      await logError(req, error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/check-seller-connection", async (req, res) => {
  try {
    const { seller_id, reelId } = req.body;

    if (!seller_id || !reelId) {
      return res.status(400).json({
        message: "seller_id and reelId are required"
      });
    }

    // 🔍 Reel find karo
    const reel = await Reel2.findById(reelId);

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found"
      });
    }

    // 🔥 check karo seller match karta hai ya nahi
    if (reel.seller_id !== seller_id) {
      return res.status(400).json({
        message: "Invalid Id",
        isConnected: false
      });
    }

    // 🔍 Seller (user) find karo
    const seller = await User.findOne({ seller_id });

    if (!seller) {
      return res.status(404).json({
        message: "Seller not found" ,
         isConnected: false
      });
    }

    // ✅ final check: connected hai ya nahi
    if (seller.isConnected) {
      return res.status(200).json({
        message: "Play Id is connected",
        isConnected: true
      });
    } else {
      return res.status(200).json({
        message: "Playid is not connected",
        isConnected: false
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Wrong Play Id",
      isConnected: false
    });
  }
});


module.exports = router;
