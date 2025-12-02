const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");

router.get("/generateToken", authController.generateToken);
router.get("/callback", authController.callback);
router.get("/refreshToken", authController.refreshToken);
router.get("/revokeToken", authController.revokeToken);
router.get("/getUsers", authController.getUsers);

module.exports = router;
