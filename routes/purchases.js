const express = require("express");
const router = express.Router();
const purchasesController = require("../controllers/purchases");

router.post("/createPayment", purchasesController.createPayment);

module.exports = router;
