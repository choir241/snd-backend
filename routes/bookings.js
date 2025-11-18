const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookings");

router.get("/bookings", bookingController.getBookings);

module.exports = router;