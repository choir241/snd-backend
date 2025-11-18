const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packages");

router.get("/packages", packageController.getPackages);

module.exports = router;