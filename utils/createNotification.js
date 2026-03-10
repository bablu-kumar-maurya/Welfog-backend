const Notification = require("../models/Notification");
const mongoose = require("mongoose");

/**
 * Creates a notification.
 * Stores both ObjectId and userid string if available.
 */
const createNotification = async ({
  recipientUserId,
  senderUserId,
  recipientObjectId, // optional ObjectId
  senderObjectId,    // optional ObjectId
  type,
  reel = null,
  comment = null,
  message
}) => {
  if (!recipientUserId && !recipientObjectId) return;
  if (!senderUserId && !senderObjectId) return;

  // Prevent self-notification
  if ((recipientUserId && recipientUserId === senderUserId) ||
      (recipientObjectId && senderObjectId && recipientObjectId.toString() === senderObjectId.toString())
  ) return;

  try {
    await Notification.create({
      recipient: recipientObjectId,
      sender: senderObjectId,
      recipientUserId: recipientUserId,
      senderUserId: senderUserId,
      type,
      reel,
      comment,
      message
    });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

module.exports = createNotification;
