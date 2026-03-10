// const jwt = require("jsonwebtoken");

// const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// const checkPermission = (...requiredPermissions) => {
//   return (req, res, next) => {
//     try {
//       if (req.userType === "admin") {
//         return next();
//       }

//       const authHeader = req.headers.authorization;
//       const token = authHeader && authHeader.split(" ")[1];

//       if (!token) {
//         return res.status(401).json({ message: "Token missing" });
//       }

//       const decoded = jwt.verify(token, JWT_SECRET);
//       const permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];

//       const allowed = requiredPermissions.some((p) => permissions.includes(p));

//       if (!allowed) {
//         return res.status(403).json({ message: "Permission denied" });
//       }

//       req.permissions = permissions;
//       next();
//     } catch (err) {
//       return res.status(403).json({ message: "Invalid or expired token" });
//     }
//   };
// };

// module.exports = checkPermission;



const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // 👑 admin bypass
    if (req.userType === "admin") {
      return next();
    }

    if (!req.permissions || !Array.isArray(req.permissions)) {
      return res.status(403).json({ message: "No permissions found" });
    }

    // ✅ EXACT MATCH ONLY
    if (!req.permissions.includes(requiredPermission)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    next();
  };
};

module.exports = checkPermission;

