require("dotenv").config();
const crypto = require("crypto");
const { oauthClient } = require('../middleware/squareClient');
const { URL } = require('url');
const { URLSearchParams } = require('url');

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
        `&state=` +
        state;

      res.json({ url });
    } catch (err) {
      console.error(err);
    }
  },
  callback: async (req, res) => {
    try {
      const url = new URL(req.originalUrl, `http://${req.headers.host}`);
      const params = new URLSearchParams(url.search);

      const code = params.get('code');

      if (!code) {
        return res.status(400).json({ error: 'Auth code missing' });
      }

      const token = await oauthClient.oAuth.obtainToken({
        clientId: process.env.APP_ID,
        clientSecret: process.env.APP_SECRET,
        code: code,
        grantType: "authorization_code"
      })

      res.json({ token: token });

      // {"token":{"accessToken":"","tokenType":"bearer","expiresAt":""","merchantId":"","refreshToken":"","shortLived":false}}
    } catch (err) {
      console.error(err);
    }
  },
};
