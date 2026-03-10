const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 🔐 Embedded Role Schema
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    _id: true,
    timestamps: true, // ✅ THIS LINE FIXES EVERYTHING
  }
);

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // 🔥 login type (for future admin/staff login)
    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin",
    },

    // 🔥 ROLE MANAGEMENT
    roles: {
      type: [roleSchema],
      default: [],
    },

    profileImage: {
      type: String,
      default: null,
    },

    // ⚙️ SETTINGS FIELDS (YE ADD KIYA GAYA HAI FIX KE LIYE)
    siteName: {
      type: String,
      default: 'Welfog Internet Private Limited',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },
    maxUploadSize: {
      type: Number,
      default: 200,
    },
    videoQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'high',
    },

    lastLogin: Date,
  },
  { timestamps: true }
);

// ================= PASSWORD HASH =================
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ================= PASSWORD COMPARE =================
adminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);