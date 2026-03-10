const Admin = require("../models/Admin");

let cachedMaintenance = false;

// Refresh every 10 seconds (prevents DB hit on every request)
setInterval(async () => {
  try {
    const superAdmin = await Admin.findOne({ role: "superadmin" })
      .select("maintenanceMode");

    cachedMaintenance = superAdmin?.maintenanceMode || false;
  } catch (err) {
    console.error("Maintenance cache error:", err);
  }
}, 10000);

const checkMaintenance = async (req, res, next) => {
  try {
    // ✅ Allow admin routes always
    if (req.originalUrl.startsWith("/api/admin")) {
      return next();
    }

    // ✅ Allow root check
    if (req.originalUrl === "/") {
      return next();
    }

    if (cachedMaintenance === true) {
      return res.status(503).json({
        success: false,
        message: "🚧 Site is under maintenance. Please try later.",
      });
    }

    next();
  } catch (error) {
    console.error("Maintenance middleware error:", error);
    next();
  }
};

module.exports = checkMaintenance;