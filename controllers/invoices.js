const { client } = require("../middleware/squareClient");
const crypto = require("crypto");

module.exports = {
  createInvoice: async (req, res) => {
    try {
      const { orderId, customerId, dueDate } = req.body;

      const invoice = {
        invoice: {
          state: "OPEN",
          orderId: orderId,
          primaryRecipient: {
            customerId: customerId,
          },
          acceptedPaymentMethods: {
            card: true,
            bank_account: true,
          },
          paymentRequests: [
            {
              requestType: "BALANCE",
              dueDate: dueDate,
            },
          ],
          deliveryMethod: "EMAIL", // or 'SMS'
        },
      };

      const response = await client.invoices.create(invoice);
      res.json({
        version: `${response.invoice.version}`,
        invoiceId: response.invoice.id,
      });
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({
        error: error.message,
        ...(error.errors && { details: error.errors }),
      });
    }
  },

  publishInvoice: async (req, res) => {
    try {
      const { invoice_id } = req.params;
      const { version } = req.body;

      const idempotencyKey = crypto.randomUUID();

      const response = await client.invoices.publish({
        invoiceId: invoice_id,
        version: version,
        idempotencyKey: idempotencyKey,
      });

      res.json({
        version: `${response.invoice.version}`,
        invoiceId: response.invoice.id,
      });
    } catch (error) {
      console.error("Error publishing invoice:", error);
      res.status(500).json({
        error: error.message,
        ...(error.errors && { details: error.errors }),
      });
    }
  },
};
