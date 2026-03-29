const { verifyJWT } = require("../utils/jwt");
const { MongoClient } = require("mongodb");

const extractUserIdFromJWT = (req) => {
  let token = null;
  
  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  
  // Fall back to query param
  if (!token) {
    token = req.query.jwt;
  }
  
  // Fall back to body
  if (!token && req.body && req.body.jwt) {
    token = req.body.jwt;
  }
  
  if (token) {
    try {
      const decoded = verifyJWT(token);
      console.log("[JWT Auth] Token verified, userId:", decoded.userId);
      return decoded.userId;
    } catch (err) {
      console.warn("[JWT Auth] Token verification failed:", err.message);
    }
  }
  
  return null;
};

const getUserIdFromRequest = async (req) => {
  // JWT is the only authentication method - no fallback
  const userIdFromJWT = extractUserIdFromJWT(req);
  if (userIdFromJWT) {
    return { userId: userIdFromJWT, source: 'jwt' };
  }
  
  console.log("[JWT Auth] No valid JWT token found in request");
  return { userId: null, source: null };
};

module.exports = { extractUserIdFromJWT, getUserIdFromRequest };
