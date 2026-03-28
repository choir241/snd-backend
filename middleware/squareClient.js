const { SquareClient, SquareEnvironment } = require("square");
require("dotenv").config();

const client = new SquareClient({
  token: process.env.ACCESS_TOKEN,
  environment: SquareEnvironment.Production, // or Production
});

module.exports = { client };