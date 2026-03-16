const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Staff = require("../models/Staff");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // ================= ADMIN =================
    if (decoded.userType === "admin") {
      const admin = await Admin.findById(decoded.id).select("-password");

      if (!admin) {
        return res.status(401).json({ message: "Invalid token" });
      }

      req.user = admin;
      req.userType = "admin";
      req.permissions = admin.roles.flatMap(r => r.permissions);
      req.userName = admin.username;   
      req.userRole = admin.role;       

      return next();
    }

    // ================= STAFF =================
    if (decoded.userType === "staff") {
      const staff = await Staff.findById(decoded.id).select("-password");
      if (!staff) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // 🔥 GET LIVE ROLE PERMISSIONS FROM SUPERADMIN
      const superAdmin = await Admin.findOne({ role: "superadmin" });
      if (!superAdmin) {
        return res.status(500).json({ message: "Superadmin not found" });
      }

      const role = superAdmin.roles.id(staff.role._id);
      if (!role) {
        return res.status(403).json({ message: "Role not found" });
      }

      req.user = staff;
      req.userType = "staff";
      req.permissions = role.permissions;

      // ✅🔥 FIX FOR STAFF
      req.userName = staff.name;     // staff ka name
      req.userRole = role.name;      // Manager / Editor etc.

      return next();
    }

    return res.status(401).json({ message: "Invalid token" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = adminAuth;
