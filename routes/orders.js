// routes/order.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orders");
const invoiceController = require("../controllers/invoices");

router.post("/createOrder", orderController.createOrder);
router.post("/:orderId/createInvoice", invoiceController.createInvoice);
router.post("/:invoice_id/publish", invoiceController.publishInvoice);

module.exports = router;
