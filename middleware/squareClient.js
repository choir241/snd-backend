const { SquareClient, SquareEnvironment } = require("square");
require("dotenv").config();

const client = new SquareClient({
  token: process.env.ACCESS_TOKEN,
  environment: SquareEnvironment.Production,
});

const createUserClient = (accessToken) => {
  if (!accessToken) {
    throw new Error("Access token is required to create user client");
  }
  return new SquareClient({
    token: accessToken,
    environment: SquareEnvironment.Production,
  });
};

module.exports = { client, createUserClient };