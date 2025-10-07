const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  username: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  service: { type: String, required: true },
  description: { type: String },
  date: { type: String, required: true },  // You can also use Date type if you want
  time: { type: String, required: true },
}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
