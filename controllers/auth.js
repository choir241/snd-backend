require("dotenv").config();
const crypto = require("crypto");
const { oauthClient, client } = require("../middleware/squareClient");
const { URL } = require("url");
const { URLSearchParams } = require("url");
const { MongoClient } = require("mongodb");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

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
      const url =
        `https://connect.squareup.com/oauth2/authorize?client_id=${process.env.APP_ID}&` +
        `response_type=code&` +
        `scope=${scopes.join("+")}` +
        `&session=false` +
        `&state=` +
        state;

      res.json({ url });
    } catch (err) {
      handleErrorMessage(
        res,
        `There was a error generating a token: ${err.message}`,
      );
    }
  },
  callback: async (req, res) => {
    try {
      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      await connectMongoClient.connect();

      const url = new URL(req.originalUrl, `http://${req.headers.host}`);
      const params = new URLSearchParams(url.search);

      const code = params.get("code");

      if (!code) {
        handleErrorMessage(res, "Auth code missing");
      }

      const token = await oauthClient.oAuth.obtainToken({
        clientId: process.env.APP_ID,
        clientSecret: process.env.APP_SECRET,
        code: code,
        grantType: "authorization_code",
      });

      if (!token) {
        handleErrorMessage(res, "OAuth token missing");
      }

      const db = connectMongoClient.db("Supreme-Nomads-Detailing");

      const collection = db.collection("Users");

      const user = await collection.insertOne({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        merchantId: token.merchantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await connectMongoClient.close();

      if (user) {
        console.log({
          message: "User was successfully added to the database.",
        });
        res.redirect(process.env.FRONTEND_URL);
      } else {
        handleErrorMessage(
          res,
          "User was not successfully added to the database.",
        );
      }

      // Manage and use the access and refresh tokens securely.
      // Encrypt the access and refresh tokens and store them securely.
      // database like supabase or appwrite
      // Verify that the token used for each API call is valid.

      // Refresh the access token in a timely manner.
      // Provide the seller with the ability to revoke the access and refresh tokens.
      // Show the permissions granted by the access token to the seller and enable them to manage authorization.
      // Ensure that API calls made with the seller's tokens can handle token-based errors appropriately.
    } catch (err) {
      handleErrorMessage(
        res,
        `A problem occured during the oAuth callback URL: ${err.message}`,
      );
    }
  },
  refreshToken: async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken;

      const token = await oauthClient.oAuth.obtainToken({
        clientId: process.env.APP_ID,
        clientSecret: process.env.APP_SECRET,
        refreshToken: refreshToken,
        grantType: "refresh_token",
      });

      res.json(token);
    } catch (err) {
      handleErrorMessage(
        res,
        `A problem occured refreshing the oAuth token: ${err.message}`,
      );
    }
  },
  revokeToken: async (req, res) => {
    try {
      const token = await oauthClient.oAuth.revokeToken({
        accessToken: process.env.ACCESS_TOKEN,
        clientId: process.env.APP_ID,
      });
    } catch (err) {
      handleErrorMessage(
        res,
        `A problem occured revoking OAuth token: ${err.message}`,
      );
    }
  },
};
