const { client } = require("../middleware/squareClient");
const crypto = require("crypto");
const { getUserClient } = require("../hooks/getUserClient");
const { verifyJWT } = require("../utils/jwt");

const extractAndVerifyJWT = (req) => {
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    token = req.query.jwt;
  }
  
  if (token) {
    try {
      return verifyJWT(token);
    } catch (err) {
      console.warn("[JWT] Verification failed:", err.message);
    }
  }
  return null;
};

module.exports = {
  createInvoice: async (req, res) => {
    try {
      const { userId, orderId, customerId, dueDate } = req.body;

      // Optionally verify JWT if present
      const decodedJWT = extractAndVerifyJWT(req);
      if (decodedJWT) {
        console.log("[createInvoice] JWT verified for user:", decodedJWT.userId);
      }

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userClient = await getUserClient(userId);

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
      const { userId } = req.body;
      const { invoice_id } = req.params;
      const { version } = req.body;

      // Optionally verify JWT if present
      const decodedJWT = extractAndVerifyJWT(req);
      if (decodedJWT) {
        console.log("[publishInvoice] JWT verified for user:", decodedJWT.userId);
      }

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userClient = await getUserClient(userId);

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
