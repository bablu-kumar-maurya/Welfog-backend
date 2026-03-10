const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    artist: {
      type: String,
      trim: true,
      default: "Unknown Artist"
    },


    url: {
      type: String,
      required: true,
      unique: true,      
      index: true,       
      trim: true
    },

    thumbnail: {
      type: String,
      default: ""
    },

    duration: {
      type: Number,
      default: 0
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User4',
      required: true,
      index: true
    },
  },
  { timestamps: true }
);



module.exports = mongoose.model('Music', musicSchema);
