// controllers/orders.js
const { SquareClient, SquareEnvironment } = require("square");
const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("crypto");
const { getUserClient, getUserClientFromJWT } = require("../hooks/getUserClient");
const { getUserIdFromRequest, extractUserIdFromJWT } = require("../hooks/jwtAuth");
const { createUserClient } = require("../middleware/squareClient");

module.exports = {
  createOrder: async (req, res) => {
    try {
      const { userId: authUserId, source } = await getUserIdFromRequest(req);
      
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required. Please log in." });
      }
      
      console.log("[createOrder] Auth source:", source, "userId:", authUserId);

      // Get user's Square access token from MongoDB
      const token = req.headers.authorization?.substring(7) || req.query.jwt || req.body?.jwt;
      
      let userClient;
      if (token) {
        // Extract userId from JWT and fetch user's access token from MongoDB
        const userIdFromJWT = extractUserIdFromJWT(req);
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const db = mongoClient.db("Supreme-Nomads-Detailing");
        const collection = db.collection("Users");
        const user = await collection.findOne({ userId: userIdFromJWT });
        await mongoClient.close();
        
        if (!user || !user.accessToken) {
          return res.status(401).json({ error: "Square access token not found. Please re-authenticate." });
        }
        
        userClient = createUserClient(user.accessToken);
      } else {
        userClient = await getUserClient(authUserId);
      }

      function generateReferenceId(prefix = "ORDER") {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
        return `${prefix}-${timestamp}-${random}`;
      }

      const idempotencyKey = crypto.randomUUID();

      const {
        referenceId = generateReferenceId(),
        locationId,
        lineItems,
        taxes = [],
        discounts = [],
      } = req.body;

      console.log("req.body", req.body);

      const order = {
        idempotencyKey,
        order: {
          referenceId,
          locationId,
          lineItems: lineItems.map((item) => {
            const lineItem = {
              name: item.variation_name,
              quantity: item.quantity,
              ...(item.note && { note: item.note }),
              ...(item.catalogObjectId && {
                catalogObjectId: item.catalogObjectId,
              }),
              ...(item.modifiers && {
                modifiers: item.modifiers.map((mod) => ({
                  catalogObjectId: mod.catalog_object_id,
                  ...(mod.base_price_money && {
                    basePriceMoney: {
                      amount: BigInt(
                        Math.round(
                          parseFloat(mod.base_price_money.amount) * 100,
                        ),
                      ),
                      currency: mod.base_price_money.currency || "USD",
                    },
                  }),
                })),
              }),
              ...(item.base_price_money && {
                basePriceMoney: {
                  amount: BigInt(
                    Math.round(parseFloat(item.base_price_money.amount) * 100),
                  ),
                  currency: item.base_price_money.currency || "USD",
                },
              }),
            };

            return lineItem;
          }),
          ...(taxes.length > 0 && {
            taxes: taxes.map((tax) => ({
              uid: tax.uid,
              name: tax.name,
              percentage: tax.percentage,
              scope: tax.scope || "ORDER",
            })),
          }),
          ...(discounts.length > 0 && {
            discounts: discounts.map((disc) => ({
              uid: disc.uid,
              ...(disc.name && { name: disc.name }),
              ...(disc.percentage && { percentage: disc.percentage }),
              ...(disc.amountMoney && {
                amountMoney: {
                  amount: BigInt(disc.amountMoney.amount.toString()),
                  currency: disc.amountMoney.currency || "USD",
                },
              }),
              ...(disc.catalogObjectId && {
                catalogObjectId: disc.catalogObjectId,
              }),
              scope: disc.scope || "ORDER",
            })),
          }),
          state: "OPEN",
        },
      };

      console.log("order", order);

      const response = await userClient.orders.create(order);
      console.log("response", response);
      res.json({ success: true, orderId: response.order.id });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({
        error: error.message,
        ...(error.errors && { details: error.errors }),
      });
    }
  },
};
