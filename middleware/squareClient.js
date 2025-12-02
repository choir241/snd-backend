const { SquareClient, Environment } = require("square");
require("dotenv").config();

const client = new SquareClient({
  token: process.env.ACCESS_TOKEN,
  options: [
    "curl https://connect.squareupsandbox.com/v2/catalog/list",
    "-H 'Square-Version: 2024-07-17'",
    "-H 'Authorization: Bearer {SANDBOX_ACCESS_TOKEN}'",
    "-H 'Content-Type: application/json'",
  ],
});

const oauthClient = new SquareClient({
  token: process.env.ACCESS_TOKEN,
});

module.exports = { client, oauthClient };
