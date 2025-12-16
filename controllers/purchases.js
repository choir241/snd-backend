const { client } = require("../middleware/squareClient");
require("dotenv").config();
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

module.exports = {
  createPayment: async (req, res) => {
    try {
      const amountMoneyBigInt = BigInt(req.body.amount);

      const idempotencyKey = crypto.randomUUID();

      const payment = await client.payments.create({
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: amountMoneyBigInt,
          currency: "USD",
        },
        sourceId: req.body.token,
        verificationToken: req.body.verificationToken,
      });

      if (!payment) {
        handleErrorMessage(
          res,
          "Payment did not go through. Double-check your payment information.",
        );
      }

      res.redirect(process.env.FRONTEND_URL);
    } catch (err) {
      handleErrorMessage(
        res,
        `Something went wrong with your payment: ${err.message}`,
      );
    }
  },
};
