const router = require("express").Router();
const Notification = require("../models/Notification");
const adminAuth = require("../middleware/adminAuth");
const checkPermission = require("../middleware/checkPermission");
const logError = require("../utils/logError");

router.get(
  '/',
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      const search = req.query.search || '';
      const type = req.query.type || 'all';
      const startDate = req.query.startDate || '';
      const endDate = req.query.endDate || '';

      // 🔹 Build filter
      let filter = {};

      // ✅ Type filter
      if (type !== 'all') {
        filter.type = type;
      }

      // ✅ Search filter (message field)
      if (search) {
        filter.message = { $regex: search, $options: 'i' };
      }

      // ✅ Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};

        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // include full end day
          filter.createdAt.$lte = end;
        }
      }

      const total = await Notification.countDocuments(filter);

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });

    } catch (err) {
      console.error('Error fetching notifications:', err);
      err.statusCode = err.statusCode || 500;
      await logError(req, err);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  }
);

router.get(
  '/admin_notifications',
  adminAuth,checkPermission("VIEW_NOTIFICATIONS"),
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      const search = req.query.search || '';
      const type = req.query.type || 'all';
      const startDate = req.query.startDate || '';
      const endDate = req.query.endDate || '';

      // 🔹 Build filter
      let filter = {};

      // ✅ Type filter
      if (type !== 'all') {
        filter.type = type;
      }

      // ✅ Search filter (message field)
      if (search) {
        filter.message = { $regex: search, $options: 'i' };
      }

      // ✅ Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};

        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // include full end day
          filter.createdAt.$lte = end;
        }
      }

      const total = await Notification.countDocuments(filter);

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });

    } catch (err) {
      console.error('Error fetching notifications:', err);
      err.statusCode = err.statusCode || 500;
      await logError(req, err);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  }
);

// Get notifications by userid
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId; // string userid like "1113"

    const notifications = await Notification.find({ recipientUserId: userId })
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark as read
router.put("/read/:id", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true
    });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    await logError(req, err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const notificationId = req.params.id;

    if (!notificationId) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    const deletedNotification = await Notification.findByIdAndDelete(notificationId);

    if (!deletedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification deleted successfully",
      deletedNotification
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
      error.statusCode = error.statusCode || 500;
    await logError(req, err);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

module.exports = router;
