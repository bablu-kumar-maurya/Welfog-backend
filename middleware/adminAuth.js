const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Staff = require("../models/Staff");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const adminAuth = async (req, res, next) => {
  try {
    
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing. Please login again." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // ================= ADMIN LOGIC (No change) =================
    if (decoded.userType === "admin") {
      const admin = await Admin.findById(decoded.id).select("-password");
      if (!admin) {
        return res.status(401).json({ message: "Invalid admin token" });
      }
      req.user = admin;
      req.userType = "admin";
      req.permissions = admin.roles.flatMap(r => r.permissions);
      req.userName = admin.username;   
      req.userRole = admin.role;       
      return next();
    }

    // ================= STAFF LOGIC (No change) =================
    if (decoded.userType === "staff") {
      const staff = await Staff.findById(decoded.id).select("-password");
      if (!staff) {
        return res.status(401).json({ message: "Invalid staff token" });
      }

      const superAdmin = await Admin.findOne({ role: "superadmin" });
      if (!superAdmin) {
        return res.status(500).json({ message: "Superadmin configuration missing" });
      }

      const role = superAdmin.roles.id(staff.role._id);
      if (!role) {
        return res.status(403).json({ message: "Staff role not found" });
      }

      req.user = staff;
      req.userType = "staff";
      req.permissions = role.permissions;
      req.userName = staff.name;     
      req.userRole = role.name;      
      return next();
    }

    return res.status(401).json({ message: "Invalid token type" });
  } catch (err) {
    // Agar token expire ho gaya hai toh 401 bhejenge taaki frontend /refresh call kare
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = adminAuth;