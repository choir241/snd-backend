require("dotenv").config();
const crypto = require("crypto");
const { URL } = require("url");
const { URLSearchParams } = require("url");
const { MongoClient, ObjectId } = require("mongodb");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");
const { createJWT, verifyJWT } = require("../utils/jwt");

const https = require("https");

const obtainSquareToken = async (code) => {
  return new Promise((resolve, reject) => {
    const callbackUrl = `https://snd-backend-b00s.onrender.com/callback`;
    
    const data = JSON.stringify({
      client_id: process.env.APP_ID,
      client_secret: process.env.APP_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    });

    console.log("[obtainSquareToken] Request data:", { client_id: process.env.APP_ID, code: code?.substring(0, 10) + "...", redirect_uri: callbackUrl });

    const options = {
      hostname: "connect.squareup.com",
      port: 443,
      path: "/oauth2/token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        console.log("[obtainSquareToken] Square response status:", res.statusCode);
        console.log("[obtainSquareToken] Square response body:", body);
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`Square API error: ${res.statusCode} - ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

const refreshSquareToken = async (refreshToken) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      client_id: process.env.APP_ID,
      client_secret: process.env.APP_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const options = {
      hostname: "connect.squareup.com",
      port: 443,
      path: "/oauth2/token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`Square API error: ${res.statusCode} - ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

const revokeSquareToken = async (accessToken) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      client_id: process.env.APP_ID,
      access_token: accessToken,
    });

    const options = {
      hostname: "connect.squareup.com",
      port: 443,
      path: "/oauth2/revoke",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          reject(new Error(`Square API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

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
      // Use direct URL for testing - update to env var in production
      let callbackUrl = process.env.BACKEND_URL 
        ? `${process.env.BACKEND_URL}/callback`
        : `https://snd-backend-b00s.onrender.com/callback`;
      callbackUrl = callbackUrl.replace(/\/$/, ''); // Remove trailing slash
      
      const url =
        `https://connect.squareup.com/oauth2/authorize?client_id=${process.env.APP_ID}&` +
        `response_type=code&` +
        `scope=${scopes.join("+")}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&session=false` +
        `&state=` +
        state;

      console.log("[generateToken] Auth URL:", url);
      console.log("[generateToken] Callback URL:", callbackUrl);
      
      res.json({ url });
    } catch (err) {
      handleErrorMessage(
        `There was a error generating a token: ${err.message}`,
      );
    }
  },
  callback: async (req, res) => {
    try {
      console.log("[callback] Step 1: Starting callback process");
      console.log("[callback] req.originalUrl:", req.originalUrl);
      console.log("[callback] req.headers.host:", req.headers.host);

      console.log("[callback] Step 2: Connecting to MongoDB");
      console.log("[callback] MONGO_URI:", process.env.MONGO_URI ? "present" : "MISSING");
      
      const connectMongoClient = new MongoClient(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      
      try {
        await connectMongoClient.connect();
        console.log("[callback] MongoDB connected successfully");
      } catch (mongoErr) {
        console.error("[callback] MongoDB connection error:", mongoErr.message);
        console.error("[callback] MongoDB error code:", mongoErr.code);
        throw mongoErr;
      }

      const cleanUrl = req.originalUrl.split("#")[0];
      const url = new URL(cleanUrl, `http://${req.headers.host}`);
      const params = new URLSearchParams(url.search);

      const code = params.get("code");
      console.log("[callback] Step 3: Extracted code:", code ? "present" : "MISSING");
      console.log("[callback] Code value (first 20 chars):", code ? code.substring(0, 20) + "..." : "N/A");

      if (!code) {
        handleErrorMessage("Auth code missing", code, "code");
      }

      console.log("[callback] Step 4: Calling Square obtainToken");
      console.log("[callback] APP_ID:", process.env.APP_ID ? "present" : "MISSING");
      console.log("[callback] APP_SECRET:", process.env.APP_SECRET ? "present" : "MISSING");
      console.log("[callback] Callback URL being used:", `https://snd-backend-b00s.onrender.com/callback`);

      const token = await obtainSquareToken(code);

      console.log("[callback] Step 5: Token obtained:", token ? "success" : "MISSING");
      console.log("[callback] Token details:", token);
      console.log("[callback] Token accessToken:", token?.access_token);
      console.log("[callback] Token refreshToken:", token?.refresh_token);
      console.log("[callback] Token expiresAt:", token?.expires_at);
      console.log("[callback] Token keys:", token ? Object.keys(token) : "N/A");

      if (!token) {
        handleErrorMessage("OAuth token missing", token, "token");
      }

      if (!token.access_token) {
        console.error("[callback] ERROR: Square did not return an accessToken!");
        console.error("[callback] Full Square response:", JSON.stringify(token));
        handleErrorMessage("Square OAuth did not return access token", token, "token");
      }

      console.log("[callback] Step 5b: Fetching user locations from Square");
      const userClient = {
        squareClient: {
          token: token.access_token,
          environment: "Production"
        }
      };
      
      let locationId = null;
      console.log("[callback] Before location fetch - token present:", !!token.access_token);
      
      try {
        const { Client: SquareClient, Environment: SquareEnvironment } = require("square");
        console.log("[callback] Square imports - SquareClient:", typeof SquareClient, "SquareEnvironment:", typeof SquareEnvironment);
        
        const squareClient = new SquareClient({
          token: token.access_token,
          environment: SquareEnvironment.Production,
        });
        console.log("[callback] Square client created");
        
        const locationsResponse = await squareClient.locations.list();
        console.log("[callback] Locations API response status:", locationsResponse.statusCode);
        console.log("[callback] Locations API response:", JSON.stringify(locationsResponse));
        console.log("[callback] Locations result object:", locationsResponse.result);
        console.log("[callback] Locations array:", locationsResponse.locations);
        console.log("[callback] Locations count:", locationsResponse.locations?.length);
        
        if (locationsResponse.locations && locationsResponse.locations.length > 0) {
          locationId = locationsResponse.locations[0].id;
          console.log("[callback] Using locationId:", locationId);
          console.log("[callback] Location details:", JSON.stringify(locationsResponse.locations[0]));
        } else {
          console.warn("[callback] No locations found for this user - locationsResponse:", locationsResponse);
        }
      } catch (locErr) {
        console.error("[callback] Error fetching locations:", locErr.message);
        console.error("[callback] Error stack:", locErr.stack);
        console.error("[callback] Error details:", locErr);
      }

      console.log("[callback] Final locationId before save:", locationId);

      console.log("[callback] Step 6: Inserting user into MongoDB");
      const db = connectMongoClient.db("Supreme-Nomads-Detailing");

      const collection = db.collection("Users");

      const userId = new ObjectId();

      console.log("[callback] Inserting with accessToken:", token.access_token ? "present" : "NULL");
      console.log("[callback] Inserting with locationId:", locationId ? locationId : "NULL");

      const user = await collection.insertOne({
        _id: userId,
        userId: userId.toString(),
        oAuthCode: code,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_at,
        locationId: locationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("[callback] User inserted successfully, _id:", user.insertedId);
      console.log("[callback] User document locationId:", locationId);

      console.log("[callback] Step 7: Creating JWT");
      const jwtToken = createJWT({
        userId: userId.toString(),
        oAuthCode: code,
      });
      console.log("[callback] JWT created:", jwtToken);

      console.log("[callback] Step 8: Closing MongoDB connection");
      await connectMongoClient.close();

      if (user) {
        console.log({
          message: "User was successfully added to the database.",
        });
        console.log("[callback] Step 9: Redirecting to frontend with JWT");
        
        const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
        const redirectUrl = `${frontendUrl}/checkout?jwt=${jwtToken}&userId=${userId.toString()}`;
        console.log("[callback] Redirect URL:", redirectUrl);
        
        res.redirect(redirectUrl);
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
      console.error("[callback] ERROR:", err.message);
      console.error("[callback] ERROR name:", err.name);
      console.error("[callback] ERROR code:", err.code);
      console.error("[callback] ERROR stack:", err.stack);
      handleErrorMessage(
        `A problem occured during the oAuth callback URL: ${err.message}`,
      );
    }
  },
  refreshToken: async (req, res) => {
    try {
      const refreshTokenValue = req.body.refreshToken;

      if (!refreshTokenValue) {
        handleErrorMessage(
          "Unable to grab refresh token from frontend",
          refreshTokenValue,
          "refreshToken",
        );
      }

      const token = await refreshSquareToken(refreshTokenValue);

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
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: "accessToken is required" });
      }

      await revokeSquareToken(accessToken);

      res.json({ success: true, message: "Token revoked successfully" });
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
  createJWT: async (req, res) => {
    try {
      const { oAuthCode, accessToken, refreshToken, expiresAt } = req.body;

      if (!oAuthCode || !accessToken || !refreshToken) {
        return res.status(400).json({
          error: "Missing required fields: oAuthCode, accessToken, refreshToken",
        });
      }

      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      await connectMongoClient.connect();

      const db = connectMongoClient.db("Supreme-Nomads-Detailing");
      const collection = db.collection("Users");

      const userId = new ObjectId();

      const user = await collection.insertOne({
        _id: userId,
        userId: userId.toString(),
        oAuthCode,
        accessToken,
        refreshToken,
        expiresAt: expiresAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const jwtToken = createJWT({
        userId: userId.toString(),
        oAuthCode,
      });

      res.cookie("jwt_token", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await connectMongoClient.close();

      res.json({
        message: "JWT created and stored successfully",
        jwtToken,
        userId: userId.toString(),
        user,
      });
    } catch (err) {
      handleErrorMessage(
        `A problem occured creating JWT: ${err.message}`,
      );
    }
  },
  getJWT: async (req, res) => {
    try {
      console.log("[getJWT] req.headers.cookie:", req.headers.cookie);
      console.log("[getJWT] req.cookies:", req.cookies);
      console.log("[getJWT] All cookies:", JSON.stringify(req.cookies));
      
      const token = req.cookies.jwt_token;
      console.log("[getJWT] token from cookie:", token ? "present" : "MISSING");
      
      if (!token) {
        console.log("[getJWT] No token found in cookies");
        console.log("[getJWT] Available cookies:", Object.keys(req.cookies));
        
        const allCookies = req.headers.cookie;
        console.log("[getJWT] Raw cookie header:", allCookies);
        
        return res.status(401).json({ 
          error: "No JWT token found",
          debug: {
            hasCookieHeader: !!req.headers.cookie,
            cookieKeys: Object.keys(req.cookies),
          }
        });
      }

      console.log("[getJWT] Decoding token...");
      const decoded = verifyJWT(token);
      console.log("[getJWT] Decoded:", decoded);
      
      const { userId } = decoded;
      console.log("[getJWT] Extracted userId:", userId);

      console.log("[getJWT] Connecting to MongoDB...");
      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      await connectMongoClient.connect();

      const db = connectMongoClient.db("Supreme-Nomads-Detailing");
      const collection = db.collection("Users");

      console.log("[getJWT] Finding user with userId:", userId);
      const user = await collection.findOne({ userId });
      console.log("[getJWT] Found user:", user ? "yes" : "no");
      
      if (user) {
        console.log("[getJWT] User document keys:", Object.keys(user));
        console.log("[getJWT] User locationId from DB:", user.locationId);
        console.log("[getJWT] User accessToken present:", !!user.accessToken);
        console.log("[getJWT] Full user document:", JSON.stringify({
          userId: user.userId,
          locationId: user.locationId,
          accessToken: user.accessToken ? "present" : "null",
          refreshToken: user.refreshToken ? "present" : "null",
          expiresAt: user.expiresAt,
          createdAt: user.createdAt,
        }));
      }

      await connectMongoClient.close();

      if (!user) {
        console.log("[getJWT] User not found in database");
        return res.status(404).json({ error: "User not found" });
      }

      console.log("[getJWT] Success! Returning user data with locationId:", user.locationId);
      res.json({
        userId: user.userId,
        oAuthCode: user.oAuthCode,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        expiresAt: user.expiresAt,
        locationId: user.locationId,
        createdAt: user.createdAt,
      });
    } catch (err) {
      console.error("[getJWT] ERROR:", err.message);
      console.error("[getJWT] ERROR name:", err.name);
      console.error("[getJWT] ERROR code:", err.code);
      
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        console.error("[getJWT] JWT verification failed");
        return res.status(401).json({ error: "Invalid or expired JWT token" });
      }
      handleErrorMessage(
        `A problem occured getting JWT: ${err.message}`,
      );
    }
  },
  verifyUser: async (req, res) => {
    try {
      console.log("[verifyUser] Starting verification...");
      
      let token = null;
      
      // Check Authorization header first (Bearer token)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
        console.log("[verifyUser] Token from Authorization header");
      }
      
      // Fall back to query param (jwt=...)
      if (!token) {
        token = req.query.jwt;
        console.log("[verifyUser] Token from query param");
      }
      
      // Fall back to cookie
      if (!token) {
        token = req.cookies.jwt_token;
        console.log("[verifyUser] Token from cookie");
      }
      
      if (!token) {
        console.log("[verifyUser] No token found");
        return res.status(401).json({ 
          error: "No JWT token provided",
          valid: false,
        });
      }
      
      console.log("[verifyUser] Verifying token...");
      const decoded = verifyJWT(token);
      console.log("[verifyUser] Token decoded successfully:", decoded);
      
      const { userId } = decoded;
      
      console.log("[verifyUser] Connecting to MongoDB...");
      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      await connectMongoClient.connect();
      
      const db = connectMongoClient.db("Supreme-Nomads-Detailing");
      const collection = db.collection("Users");
      
      console.log("[verifyUser] Looking up user:", userId);
      const user = await collection.findOne({ userId });
      
      await connectMongoClient.close();
      
      if (!user) {
        console.log("[verifyUser] User not found");
        return res.status(404).json({ 
          error: "User not found",
          valid: false,
        });
      }
      
      console.log("[verifyUser] Success! User verified");
      res.json({
        valid: true,
        userId: user.userId,
        oAuthCode: user.oAuthCode,
        createdAt: user.createdAt,
      });
    } catch (err) {
      console.error("[verifyUser] ERROR:", err.message);
      console.error("[verifyUser] ERROR name:", err.name);
      
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        console.error("[verifyUser] JWT verification failed");
        return res.status(401).json({ 
          error: "Invalid or expired JWT token",
          valid: false,
        });
      }
      
      handleErrorMessage(`A problem occured verifying user: ${err.message}`);
    }
  },
  getAuthTokens: async (req, res) => {
    try {
      console.log("[getAuthTokens] Starting...");
      
      let token = null;
      
      // Check Authorization header first
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
      
      // Fall back to query param
      if (!token) {
        token = req.query.jwt;
      }
      
      if (!token) {
        console.log("[getAuthTokens] No token found");
        return res.status(401).json({ 
          error: "No JWT token provided",
        });
      }
      
      console.log("[getAuthTokens] Verifying token...");
      const decoded = verifyJWT(token);
      const { userId } = decoded;
      
      if (!userId) {
        return res.status(400).json({ error: "Invalid JWT: userId not found" });
      }
      
      console.log("[getAuthTokens] Connecting to MongoDB...");
      const connectMongoClient = new MongoClient(process.env.MONGO_URI);
      await connectMongoClient.connect();
      
      const db = connectMongoClient.db("Supreme-Nomads-Detailing");
      const collection = db.collection("Users");
      
      console.log("[getAuthTokens] Looking up user:", userId);
      const user = await collection.findOne({ userId });
      
      await connectMongoClient.close();
      
      if (!user) {
        console.log("[getAuthTokens] User not found");
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.accessToken) {
        console.log("[getAuthTokens] No access token for user");
        return res.status(404).json({ error: "No Square access token found. Please re-authenticate." });
      }
      
      console.log("[getAuthTokens] Success! Returning tokens");
      res.json({
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        expiresAt: user.expiresAt,
        userId: user.userId,
        locationId: user.locationId,
      });
    } catch (err) {
      console.error("[getAuthTokens] ERROR:", err.message);
      console.error("[getAuthTokens] ERROR name:", err.name);
      
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Invalid or expired JWT token" });
      }
      
      handleErrorMessage(`A problem occured getting auth tokens: ${err.message}`);
    }
  },
};
