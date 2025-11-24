const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookings");

router.post("/bookings/:variationId", bookingController.searchAvailability);

module.exports = router;
