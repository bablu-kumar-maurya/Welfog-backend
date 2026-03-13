const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema(
{
  api: String,
  method: String,

  statusCode: Number,

  errorMessage: String,
  stack: String,

  requestBody: Object,   // request data
  query: Object,         // query params

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User4",
    default: null
  },

  ip: String
},
{ timestamps: true }
);

module.exports = mongoose.model("ErrorLog", errorLogSchema);