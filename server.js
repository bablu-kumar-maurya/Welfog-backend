const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const authenticateToken = require("./middleware/auth");
const checkMaintenance = require("./middleware/checkMaintenance");


app.use(checkMaintenance);
// ✅ Use CORS before routes
const allowedOrigins = [
  "http://localhost:5173", // local Vite dev
  "http://localhost:3000", // local React dev
  "https://welfog-backend.vercel.app" // production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps / curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));
// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 4000;

// // authentication middleware
// app.use((req, res, next) => {
//   if (req.method === "GET") {
//     return authenticateToken(req, res, next);
//   }
//   next();
// });



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
    message: "Welcome to Neo Reels Backend API! Date 12th nov 2025",
    version: "1.0.11",
    status: "Server is running successfully! 🚀"
  });
});
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

