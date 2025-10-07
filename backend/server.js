require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/UserRoutes");
const bookedServiceRoutes = require("./routes/BookedServiceRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/booked-services", bookedServiceRoutes); // ✅ your booking routes

// Connect MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/HaliliDentalClinic")
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));
