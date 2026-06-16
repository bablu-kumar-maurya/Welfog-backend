const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User4",
      required: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel4test",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User4" }],

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  { timestamps: true },
);
commentSchema.index({ reel: 1, isDeleted: 1 });

module.exports = mongoose.model("Comment", commentSchema);
