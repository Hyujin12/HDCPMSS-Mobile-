const express = require("express");
const router = express.Router();
const BookedService = require("../models/BookedService");

// ✅ Create a new booking
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      serviceName,
      fullname,
      email,
      phone,
      description,
      date,
      time,
    } = req.body;

    if (!serviceName || !fullname || !email || !phone || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const booking = new BookedService({
      userId,
      serviceName,
      fullname,
      email,
      phone,
      description,
      date,
      time,
    });

    await booking.save();
    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Fetch all bookings (for admin or general use)
router.get("/", async (req, res) => {
  try {
    const bookings = await BookedService.find().sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ✅ Fetch bookings by specific user ID
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await BookedService.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ error: "Failed to fetch user bookings" });
  }
});

// ✅ Update booking (edit, cancel, or reschedule)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Fetch the existing booking
    const existingBooking = await BookedService.findById(id);
    if (!existingBooking)
      return res.status(404).json({ error: "Booking not found" });

    // If the booking was cancelled and is being edited, change it to rescheduled
    if (existingBooking.status === "cancelled" && updates.status !== "cancelled") {
      updates.status = "rescheduled";
    }

    const updatedBooking = await BookedService.findByIdAndUpdate(id, updates, {
      new: true,
    });

    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
