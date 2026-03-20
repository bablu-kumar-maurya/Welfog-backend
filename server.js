// const express = require("express");
// const app = express();
// require("dotenv").config();
// const mongoose = require("mongoose");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const cookieParser = require("cookie-parser"); 
// const checkMaintenance = require("./middleware/checkMaintenance");

// // ✅ 1. Cookie Parser (Sabse Pehle)
// app.use(cookieParser()); 

// // ✅ 2. CORS Configuration (Exact for Localhost to Vercel/Production)
// const allowedOrigins = [
//   "http://localhost:5173", 
//   "http://localhost:3000",
//   "https://welfog.com",
//   "https://www.welfog.com",
//   "https://welfog-backend.vercel.app"
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("CORS not allowed by Security Policy"));
//     }
//   },
//   credentials: true, // 🛡️ Cookies allow karne ke liye MUST hai
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
// }));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(checkMaintenance);
// app.use("/uploads", express.static("uploads"));

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB connected successfully"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// // Import routes
// const userRoutes = require("./routes/userRoutes");
// const reelRoute = require("./routes/reelRoutes");
// const musicRoute = require("./routes/musicRoutes");
// const commentRoute = require("./routes/commentRoute");
// const notificationRoute = require("./routes/notificationRoutes");
// const adminRoute = require("./routes/adminRoutes");
// const roleRoutes = require("./routes/roleRoutes");

// app.use("/api/users", userRoutes);
// app.use("/api/reels", reelRoute);
// app.use("/api/music", musicRoute);
// app.use("/api/comment", commentRoute);
// app.use("/api/notifications", notificationRoute);
// app.use("/api/admin", adminRoute);
// app.use("/api/roles", roleRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     message: "Welcome to Neo Reels Backend API!",
//     status: "Server is running successfully! 🚀"
//   });
// });

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server is running on port ${PORT}`);
// });

const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser"); // ✅ Naya: Cookies read karne ke liye
const authenticateToken = require("./middleware/auth");
const checkMaintenance = require("./middleware/checkMaintenance");

app.use(checkMaintenance);
app.use(cookieParser()); // ✅ Naya: JSON parsing se pehle lagayein

const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:3000",
  "https://supplier.welfog.com",
  "https://welfog-backend.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true // ✅ Cookies allow karne ke liye zaroori hai
}));

app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 4000;

// Import routes
const userRoutes = require("./routes/userRoutes");
const reelRoute = require("./routes/reelRoutes");
const musicRoute = require("./routes/musicRoutes");
const commentRoute = require("./routes/commentRoute");
const notificationRoute = require("./routes/notificationRoutes");
const adminRoute = require("./routes/adminRoutes");
const roleRoutes = require("./routes/roleRoutes");

app.use("/api/users", userRoutes);
app.use("/api/reels", reelRoute);
app.use("/api/music", musicRoute);
app.use("/api/comment", commentRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/roles", roleRoutes);

app.get("/", (req, res) => {
  res.json({
     "version": "1.0.12",
    message: "Welcome to Neo Reels Backend API!",
    status: "Server is running successfully! 🚀"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});