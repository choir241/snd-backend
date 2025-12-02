const { SquareError, Square } = require("square");
const { client } = require("../middleware/squareClient");
require("dotenv").config();

module.exports = {
  verifyPayment: async (req, res) => {
    try {
      const payments = await client.console.log(card);
    } catch (err) {
      console.error(err);
    }
  },
  createPayment: async (req, res) => {
    try {
      const idempotencyKey = crypto.randomUUID();

      //source_id
      client.payments.create({
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: req.body.amount,
          currency: "USD",
        },
      });
    } catch (err) {
      console.error(err);
    }
  },
};
