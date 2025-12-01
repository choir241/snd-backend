const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");

router.get("/generateToken", authController.generateToken);
router.get("/callback", authController.callback);

module.exports = router;
