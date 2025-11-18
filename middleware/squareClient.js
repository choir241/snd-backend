const { SquareClient } = require("square");
require("dotenv").config();

const client = new SquareClient({
  token: process.env.ACCESS_TOKEN,
  options: [
    "curl https://connect.squareupsandbox.com/v2/locations",
  "-H 'Square-Version: 2024-07-17'",
  "-H 'Authorization: Bearer {SANDBOX_ACCESS_TOKEN}'",
  "-H 'Content-Type: application/json'"
  ]
});

module.exports = client;