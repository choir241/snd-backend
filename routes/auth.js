const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");

router.get("/generateToken", authController.generateToken);
router.get("/callback", authController.callback);
router.get("/refreshToken", authController.refreshToken);
router.get("/revokeToken", authController.revokeToken);
router.post("/getCurrUser", authController.getCurrUser);

module.exports = router;
