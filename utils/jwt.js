const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

const createJWT = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyJWT = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { createJWT, verifyJWT, JWT_SECRET };
