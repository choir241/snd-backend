const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookings");

router.post("/bookings", bookingController.searchAvailability);
router.post("/createBooking", bookingController.createBooking);

module.exports = router;
