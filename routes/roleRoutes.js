const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const Staff = require("../models/Staff");
const logUserAction = require("../utils/logUserAction");
const adminAuth = require("../middleware/adminAuth");
const checkPermission = require("../middleware/checkPermission");
const logError = require("../utils/logError");
//Abhi superadmin directly fetch kar rahe hain

const getSuperAdmin = async () => {
  return await Admin.findOne({ role: "superadmin" });
};



// GET ALL ROLES

router.get(
  "/",
  adminAuth,
  checkPermission("ADD_ROLE", "EDIT_ROLE", "DELETE_ROLE"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const search = req.query.search || "";
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const admin = await getSuperAdmin();

      if (!admin || !Array.isArray(admin.roles)) {
        return res.json({
          roles: [],
          totalPages: 1,
          totalItems: 0,
        });
      }

      let roles = [...admin.roles];

      // ✅ SEARCH FILTER
      if (search.trim() !== "") {
        roles = roles.filter((r) =>
          r?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // ✅ DATE FILTER ONLY IF VALID DATE PROVIDED
      if (startDate && startDate !== "") {
        roles = roles.filter((r) => {
          if (!r.createdAt) return true;
          return new Date(r.createdAt) >= new Date(startDate);
        });
      }

      if (endDate && endDate !== "") {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        roles = roles.filter((r) => {
          if (!r.createdAt) return true;
          return new Date(r.createdAt) <= end;
        });
      }

      const totalItems = roles.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const paginatedRoles = roles.slice(skip, skip + limit);

      res.json({
        roles: paginatedRoles,
        totalPages,
        totalItems,
      });

    } catch (error) {
      console.error("Failed to load roles:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({ message: "Failed to load roles" });
    }
  }
);


//  GET ROLE BY ID


router.get("/:id", adminAuth, checkPermission("ADD_ROLE", "EDIT_ROLE", "DELETE_ROLE"), async (req, res) => {
  try {
    const admin = await getSuperAdmin();
    if (!admin) {
      return res.status(404).json({ message: "Superadmin not found" });
    }

    const role = admin.roles.id(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch {
    
    res.status(400).json({ message: "Invalid role id" });
  }
});


// ✅ CREATE ROLE

router.post("/", adminAuth, checkPermission("ADD_ROLE"), async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Role name required" });
    }

    const admin = await getSuperAdmin();
    if (!admin) {
      return res.status(404).json({ message: "Superadmin not found" });
    }

    const exists = admin.roles.find(
      (r) => r.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({ message: "Role already exists" });
    }

    admin.roles.push({
      name,
      permissions: permissions || [],
    });

    await admin.save();

    // ✅ ACTIVITY LOG (IMPORTANT)
    try {
      // 1. Naya role fetch kiya taaki uski ID mil sake
      const newRole = admin.roles[admin.roles.length - 1];

      await logUserAction({
        user: req.user._id,
        userName: req.userName,
        userRole: req.userRole,
        action: "create_role",

        targetType: "Role",
        targetId: newRole._id,

        // 2. FIXED: Yahan targetName add kiya jo frontend read karega
        targetName: `Role: ${name}`,

        metadata: {
          roleName: name,
          permissions: permissions || [],
        },

        device: req.headers["user-agent"],
        location: {
          ip:
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "",
          country: req.headers["cf-ipcountry"] || "",
        },
      });
    } catch (e) {
      console.error("Create role log error:", e.message);
    }

    res.status(201).json({ message: "Role created successfully" });
  } catch (error) {
    console.error("Create role error:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ message: "Failed to create role" });
  }
});



//✅ UPDATE ROLE


router.put("/:id", adminAuth, checkPermission("EDIT_ROLE"), async (req, res) => {
  try {
    const { name, permissions } = req.body;

    const admin = await getSuperAdmin();
    if (!admin) {
      return res.status(404).json({ message: "Superadmin not found" });
    }

    const role = admin.roles.id(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 🔹 snapshot old values (for activity log)
    const oldRoleData = {
      name: role.name,
      permissions: role.permissions,
    };

    // 🔄 update
    role.name = name ?? role.name;
    role.permissions = permissions ?? role.permissions;

    await admin.save();

    // ✅ ACTIVITY LOG (EDIT ROLE)
    try {
      await logUserAction({
        user: req.user._id,
        userName: req.userName,
        userRole: req.userRole,

        action: "edit_role",

        targetType: "Role",
        targetId: role._id,
        targetName: `Role: ${role.name}`,
        metadata: {
          old: oldRoleData,
          updated: {
            name: role.name,
            permissions: role.permissions,
          },
        },

        device: req.headers["user-agent"],
        location: {
          ip:
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "",
          country: req.headers["cf-ipcountry"] || "",
        },
      });
    } catch (e) {
      console.error("Edit role log error:", e.message);
    }

    res.json({ message: "Role updated successfully" });
  } catch (error) {
    console.error("Update role error:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ message: "Failed to update role" });
  }
});



//✅ DELETE ROLE


router.delete("/:id", adminAuth, checkPermission("DELETE_ROLE"), async (req, res) => {
  try {
    const admin = await getSuperAdmin();
    if (!admin) {
      return res.status(404).json({ message: "Superadmin not found" });
    }

    const role = admin.roles.id(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 🔹 snapshot before delete (for logs)
    const deletedRoleData = {
      _id: role._id,
      name: role.name,
      permissions: role.permissions,
    };

    // ❌ remove role
    admin.roles = admin.roles.filter(
      (r) => r._id.toString() !== req.params.id
    );

    await admin.save();

    // ✅ ACTIVITY LOG (DELETE ROLE)
    try {
      await logUserAction({
        user: req.user._id,
        userName: req.userName,
        userRole: req.userRole,

        action: "delete_role",

        targetType: "Role",
        targetId: deletedRoleData._id,
        targetName: `Role: ${role.name}`,
        metadata: {
          deleted: deletedRoleData,
        },

        device: req.headers["user-agent"],
        location: {
          ip:
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "",
          country: req.headers["cf-ipcountry"] || "",
        },
      });
    } catch (e) {
      console.error("Delete role log error:", e.message);
    }

    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete role error:", error);
    error.statusCode = error.statusCode || 500;
    await logError(req, error);
    res.status(500).json({ message: "Failed to delete role" });
  }
});

// ✅ GET ALL STAFFS
router.get(
  "/staffs/all",
  adminAuth,
  checkPermission("VIEW_STAFFS"),
  async (req, res) => {
    try {
      // ✅ Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // ✅ Filters
      const search = req.query.search || "";
      const startDate = req.query.startDate || "";
      const endDate = req.query.endDate || "";

      let filter = {};

      // 🔍 Search filter (name, email, phone)
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } }
        ];
      }

      // 📅 Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};

        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // include full end day
          filter.createdAt.$lte = end;
        }
      }

      // ✅ Total Count After Filter
      const totalItems = await Staff.countDocuments(filter);

      // ✅ Filtered + Paginated Data
      const staffs = await Staff.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // ✅ Response
      res.json({
        staffs,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        page,
        limit
      });

    } catch (error) {
      console.error("Error loading staffs:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({ message: "Failed to load staffs" });
    }
  }
);

//✅ CREATE STAFF
router.post(
  "/staffs/create",
  adminAuth,
  checkPermission("ADD_STAFF"),
  async (req, res) => {
    try {
      const { name, email, phone, password, roleId } = req.body;

      if (!name || !email || !password || !roleId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const exists = await Staff.findOne({ email });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Staff already exists",
        });
      }

      const admin = await getSuperAdmin();
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Superadmin not found",
        });
      }

      const role = admin.roles.id(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // ❌ bcrypt.hash REMOVED
      // ✅ password plain rakho (model pre-save hash karega)

      const staff = await Staff.create({
        name,
        email,
        phone,
        password, // 🔥 PLAIN PASSWORD
        role: {
          _id: role._id,
          name: role.name,
        },
        userType: "staff",
      });


      try {
        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,

          action: "create_staff",

          targetType: "Staff",
          targetId: staff._id,
          targetName: `Staff: ${staff.name} (${role.name})`,
          metadata: {
            staffName: staff.name,
            staffEmail: staff.email,
            role: {
              id: role._id,
              name: role.name,
            },
          },

          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] ||
              req.socket.remoteAddress ||
              "",
            country: req.headers["cf-ipcountry"] || "",
          },
        });
      } catch (e) {
        console.error("Create staff log error:", e.message);
      }

      res.status(201).json({
        success: true,
        message: "Staff created successfully",
        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
      });
    } catch (error) {
      console.error("Create staff error:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({
        success: false,
        message: "Failed to create staff",
      });
    }
  }
);

//✅ DELETE STAFF
router.delete(
  "/staffs/:id",
  adminAuth,
  checkPermission("DELETE_STAFF"),
  async (req, res) => {
    try {
      const staffId = req.params.id;

      // 🔍 staff fetch (delete se pehle snapshot ke liye)
      const staff = await Staff.findById(staffId);
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found",
        });
      }

      // ❌ actual delete
      await Staff.findByIdAndDelete(staffId);

      // ✅ ACTIVITY LOG (DELETE STAFF)
      try {
        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,
          action: "delete_staff",

          targetType: "Staff",
          targetId: staff._id,
          
          // 🔥 FIXED: role.name ki jagah staff.role.name use kiya hai
          targetName: `Staff: ${staff.name} (${staff.role?.name || "No Role"})`,

          metadata: {
            staffName: staff.name,
            staffEmail: staff.email,
            staffRole: staff.role?.name || null,
          },

          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] ||
              req.socket.remoteAddress ||
              "",
            country: req.headers["cf-ipcountry"] || "",
          },
        });
      } catch (e) {
        console.error("Delete staff log error:", e.message);
      }

      res.json({
        success: true,
        message: "Staff deleted successfully",
      });
    } catch (error) {
      console.error("Delete staff error:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(400).json({
        success: false,
        message: "Failed to delete staff",
      });
    }
  }
);


// edit the staff 
router.put(
  "/staffs/:id",
  adminAuth,
  checkPermission("EDIT_STAFF"),
  async (req, res) => {
    try {
      const { name, email, phone, roleId } = req.body;

      // 🔍 staff fetch (old snapshot ke liye)
      const staff = await Staff.findById(req.params.id);
      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }

      // 🧠 old values snapshot
      const oldData = {
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role?.name || null,
      };

      const admin = await getSuperAdmin();
      const role = admin.roles.id(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // ✏️ update
      staff.name = name;
      staff.email = email;
      staff.phone = phone;
      staff.role = {
        _id: role._id,
        name: role.name,
      };

      await staff.save();

      // ✅ ACTIVITY LOG (EDIT STAFF)
      try {
        await logUserAction({
          user: req.user._id,
          userName: req.userName,
          userRole: req.userRole,
          action: "edit_staff",
          targetType: "Staff",
          targetId: staff._id,
          targetName: `Staff: ${staff.name} (${role.name})`,
          metadata: {
            old: oldData,
            new: {
              name: staff.name,
              email: staff.email,
              phone: staff.phone,
              role: staff.role?.name || null,
            },
          },
          device: req.headers["user-agent"],
          location: {
            ip:
              req.headers["x-forwarded-for"] ||
              req.socket.remoteAddress ||
              "",
            country: req.headers["cf-ipcountry"] || "",
          },
        });
      } catch (e) {
        console.error("Edit staff log error:", e.message);
      }
      res.json(staff);
    } catch (error) {
      console.error("Update staff error:", error);
      error.statusCode = error.statusCode || 500;
      await logError(req, error);
      res.status(500).json({ message: "Failed to update staff" });
    }
  }
);


//GET SINGLE STAFF (FOR EDIT)
router.get("/staffs/:id", adminAuth, checkPermission("VIEW_STAFFS"), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json(staff);
  } catch (err) {
    await logError(req, err);
    err.statusCode = err.statusCode || 500;
    res.status(400).json({ message: "Invalid staff id" });
  }
});

module.exports = router;
