// webhooks/square.js
const { WebhooksHelper } = require("square");

exports.handleOrderWebhook = async (req, res) => {
  const signature = req.headers["x-square-hmacsha256-signature"];
  const body = req.rawBody;

  if (
    WebhooksHelper.isValidWebhookEventSignature(
      body,
      signature,
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
      process.env.SQUARE_WEBHOOK_URL,
    )
  ) {
    const event = req.body;

    // Handle different event types
    switch (event.type) {
      case "order.updated":
        // Update order status in your database
        break;
      case "invoice.updated":
        // Update invoice status
        break;
      // Add other event types as needed
    }

    res.status(200).end();
  } else {
    res.status(403).end();
  }
};
