const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser"); // ✅ Naya: Cookies read karne ke liye
const authenticateToken = require("./middleware/auth");
const checkMaintenance = require("./middleware/checkMaintenance");
const path = require("path");

app.use(checkMaintenance);
app.use(cookieParser()); 

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
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
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
const shareRoutes = require("./routes/shareRoutes");
const suspendRoutes = require("./routes/suspendRoutes");
const uploadRoute = require("./routes/uploadRoute");
app.use("/api/users", userRoutes);
app.use("/api/reels", reelRoute);
app.use("/api/music", musicRoute);
app.use("/api/comment", commentRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/roles", roleRoutes);
app.use("/api/plays", shareRoutes); 
app.use("/api/suspend", suspendRoutes);
app.use("/api/uploads", uploadRoute);

app.get("/", (req, res) => {
  res.json({
     "version": "1.0.14",
    message: "Welcome to Neo Reels Backend API!",
    status: "Server is running successfully! 🚀"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});