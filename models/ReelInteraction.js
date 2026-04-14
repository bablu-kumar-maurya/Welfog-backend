const mongoose = require("mongoose");

const reelInteractionSchema = new mongoose.Schema(
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
    action: {
      type: String,
      enum: ["interested", "not_interested"], // Sirf ye do values allow hongi
      required: true,
    },
  },
  { timestamps: true }
);

// 🔥 COMPOUND INDEX: Ek user ek reel par sirf ek hi action rakh sakta hai
reelInteractionSchema.index({ user: 1, reel: 1 }, { unique: true });

module.exports = mongoose.model("ReelInteraction", reelInteractionSchema);