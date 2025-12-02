require("dotenv").config();
const crypto = require("crypto");
const { oauthClient } = require("../middleware/squareClient");
const { URL } = require("url");
const { URLSearchParams } = require("url");
const { MongoClient } = require("mongodb");

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
      console.error(err);
    }
  },
  callback: async (req, res) => {
    try {
      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      const url = new URL(req.originalUrl, `http://${req.headers.host}`);
      const params = new URLSearchParams(url.search);

      const code = params.get("code");

      if (!code) {
        return res.status(400).json({ error: "Auth code missing" });
      }

      const token = await oauthClient.oAuth.obtainToken({
        clientId: process.env.APP_ID,
        clientSecret: process.env.APP_SECRET,
        code: code,
        grantType: "authorization_code",
      });

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

      if (user) {
        console.log({
          message: "User was successfully added to the database.",
        });
      }

      // {"token":{"accessToken":"","tokenType":"bearer","expiresAt":""","merchantId":"","refreshToken":"","shortLived":false}}

      // Manage and use the access and refresh tokens securely.
      // Encrypt the access and refresh tokens and store them securely.
      // database like supabase or appwrite

      req.status(200).json({
        expiresAt: token.expiresAt,
        tokenInfo: {
          tokenType: token.tokenType,
          shortLived: token.shortLived,
        },
      });

      // Verify that the token used for each API call is valid.
      // Refresh the access token in a timely manner.
      // Provide the seller with the ability to revoke the access and refresh tokens.
      // Show the permissions granted by the access token to the seller and enable them to manage authorization.
      // Ensure that API calls made with the seller's tokens can handle token-based errors appropriately.
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  },
  revokeToken: async (req, res) => {
    try {
      const token = await oauthClient.oAuth.revokeToken({
        accessToken: process.env.ACCESS_TOKEN,
        clientId: process.env.APP_ID,
      });
    } catch (err) {
      console.error(err);
    }
  },
  getUsers: async (req, res) => {
    try{

      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      const db = connectMongoClient.db("Supreme-Nomads-Detailing");

      const collection = db.collection("Users");

      const users = await collection.find({}).toArray();

      res.status(200).json(users);

    }catch(err){
      console.error(err);
    }
  }
};
