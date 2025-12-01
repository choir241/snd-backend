const express = require("express");
const router = express.Router();
const purchasesController = require("../controllers/purchases");

router.post("/verifyPayment", purchasesController.verifyPayment);
router.post("/createPayment", purchasesController.createPayment);

module.exports = router;
