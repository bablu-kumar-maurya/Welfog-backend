const ErrorLog = require("../models/ErrorLog");

const logError = async (req, err) => {
  try {

    await ErrorLog.create({
      api: req.originalUrl,
      method: req.method,

      statusCode: err.statusCode || 500,

      errorMessage: err.message,
      stack: err.stack,

      requestBody: req.body,
      query: req.query,

      ip: req.ip,
      user: req.user?._id || null
    });

  } catch (logErr) {
    console.error("Error saving log:", logErr);
  }
};

module.exports = logError;