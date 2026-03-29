const { client } = require("../middleware/squareClient");
const crypto = require("crypto");
const { getUserClient, getUserClientFromJWT } = require("../hooks/getUserClient");
const { getUserIdFromRequest } = require("../hooks/jwtAuth");

module.exports = {
  createInvoice: async (req, res) => {
    try {
      const { userId: authUserId, source } = await getUserIdFromRequest(req);
      
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required. Please log in." });
      }
      
      console.log("[createInvoice] Auth source:", source, "userId:", authUserId);

      const { orderId, customerId, dueDate } = req.body;

      // Use JWT-based client
      const token = req.headers.authorization?.substring(7) || req.query.jwt || req.body?.jwt;
      const userClient = token 
        ? await getUserClientFromJWT(token)
        : await getUserClient(authUserId);

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
          deliveryMethod: "EMAIL",
        },
      };

      const response = await userClient.invoices.create(invoice);
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
      const { userId: authUserId, source } = await getUserIdFromRequest(req);
      
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required. Please log in." });
      }
      
      console.log("[publishInvoice] Auth source:", source, "userId:", authUserId);

      const { invoice_id } = req.params;
      const { version } = req.body;

      // Use JWT-based client
      const token = req.headers.authorization?.substring(7) || req.query.jwt || req.body?.jwt;
      const userClient = token 
        ? await getUserClientFromJWT(token)
        : await getUserClient(authUserId);

      const idempotencyKey = crypto.randomUUID();

      const response = await userClient.invoices.publish({
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
