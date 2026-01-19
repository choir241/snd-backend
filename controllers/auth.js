require("dotenv").config();
const crypto = require("crypto");
const { oauthClient } = require("../middleware/squareClient");
const { URL } = require("url");
const { URLSearchParams } = require("url");
const { MongoClient } = require("mongodb");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

const scopes = [
  // ... existing scopes ...
  "ORDERS_READ",
  "ORDERS_WRITE",
  "INVOICES_READ",
  "INVOICES_WRITE",
  "CUSTOMERS_READ",
  "CUSTOMERS_WRITE",
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
        handleErrorMessage("Auth code missing", code, "code");
      }

      const token = await oauthClient.oAuth.obtainToken({
        clientId: process.env.APP_ID,
        clientSecret: process.env.APP_SECRET,
        code: code,
        grantType: "authorization_code",
      });

      if (!token) {
        handleErrorMessage("OAuth token missing", token, "token");
      }

      const db = connectMongoClient.db("Supreme-Nomads-Detailing");

      const collection = db.collection("Users");

      const user = await collection.insertOne({
        oAuthCode: code,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await connectMongoClient.close();

      if (user) {
        console.log({
          message: "User was successfully added to the database.",
        });
        res.json({ authCode: code });

        res.redirect(`${process.env.FRONTEND_URL}/checkout`);
      } else {
        handleErrorMessage(
          "User was not successfully added to the database.",
          user,
          "user",
        );
      }

      // TODO
      // Provide the seller with the ability to revoke the access and refresh tokens.
    } catch (err) {
      handleErrorMessage(
        `A problem occured during the oAuth callback URL: ${err.message}`,
      );
    }
  },
  refreshToken: async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken;

      if (!refreshToken) {
        handleErrorMessage(
          "Unable to grab refresh token from frontend",
          refreshToken,
          "refreshToken",
        );
      }

      const token = await oauthClient.oAuth.obtainToken({
        code: req.body.oAuthCode,
        clientId: process.env.APP_ID,
        clientSecret: process.env.APP_SECRET,
        refreshToken: refreshToken,
        grantType: "refresh_token",
      });

      if (!token) {
        handleErrorMessage("Unable to obtain squareup token", token, "token");
      }

      res.json(token);
    } catch (err) {
      handleErrorMessage(
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

      if (!token) {
        handleErrorMessage("Unable to grab revoke token", token, "token");
      }
    } catch (err) {
      handleErrorMessage(
        `A problem occured revoking OAuth token: ${err.message}`,
      );
    }
  },
  getCurrUser: async (req, res) => {
    try {
      const connectMongoClient = new MongoClient(process.env.MONGO_URI);

      if (!connectMongoClient) {
        handleErrorMessage(
          `A problem occured initializing Mongoclient`,
          connectMongoClient,
          "connectMongoClient",
        );
      }

      const connect = await connectMongoClient.connect();

      if (!connect) {
        handleErrorMessage(
          `A problem occured connecting to MongoDB client`,
          connect,
          "connect",
        );
      }

      const db = connectMongoClient.db("Supreme-Nomads-Detailing");

      const collection = db.collection("Users");

      const users = await collection.find({}).toArray();

      if (!users) {
        handleErrorMessage(`A problem occured grabbing users`);
      }

      const oAuthCode = req.body.oAuthCode;

      if (!oAuthCode) {
        handleErrorMessage(
          `A problem occured grabbing the oAuthCode from the frontend`,
        );
      }

      const findCurrUser = users.find((user) => {
        return user.oAuthCode === oAuthCode;
      });

      if (!findCurrUser) {
        handleErrorMessage(
          `Couldn't find current user`,
          findCurrUser,
          "findCurrUser",
        );
      }

      res.json({
        refreshToken: findCurrUser.refreshToken,
        expiresAt: findCurrUser.expiresAt,
      });
    } catch (err) {
      handleErrorMessage(
        `A problem occured getting the current user: ${err.message}`,
      );
    }
  },
};
