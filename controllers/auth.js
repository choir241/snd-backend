const express = require("express");
const { SquareError } = require("square");
const client = require("../middleware/squareClient");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { ApiError, Client, Environment } = require("square");
const app = express();

const squareClient = new Client({
    environment: Environment,
    userAgentDetail: "sample oath app"
})

const oauthInstance = squareClient.oAuthApi;

const scopes = [
  "ITEMS_READ",
  "MERCHANT_PROFILE_READ",
  "PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS",
  "PAYMENTS_WRITE",
  "PAYMENTS_READ",
];

module.exports = {
  generateToken: async (req, res) => {
    try {
      const state = crypto.randomBytes(32).toString("hex");
      const basePath = "https://connect.squareup.com";
      const url =
        basePath +
        `/oauth2/authorize?client_id=${process.env.APP_ID}&` +
        `response_type=code&` +
        `scope=${scopes.join("+")}` +
        `&state=` +
        state;

      res.json({ url });
    } catch (err) {
      console.error(err);
    }
  },
  callback: async (req, res) => {
    try {
    
    } catch (err) {
      console.error(err);
    }
  },
};
