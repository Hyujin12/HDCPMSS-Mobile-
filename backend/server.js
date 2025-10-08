require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/UserRoutes");
const bookedServiceRoutes = require("./routes/BookedServiceRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: 'exp://192.168.0.101:8081', // or list your Expo local IP if needed, e.g. "exp://192.168.0.101:8081"
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/booked-services", bookedServiceRoutes);

// Root route for testing
app.get("/", (req, res) => {
  res.send("Server is working ✅");
});

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start server on Render-assigned port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
