const { MongoClient } = require("mongodb");
const { SquareClient, SquareEnvironment } = require("square");
const { verifyJWT } = require("../utils/jwt");

async function getUserClientFromJWT(token) {
  console.log("[getUserClientFromJWT] Starting...");
  console.log("[getUserClientFromJWT] Token present:", !!token);

  if (!token) {
    console.error("[getUserClientFromJWT] ERROR: JWT token is required but was not provided");
    throw new Error("JWT token is required");
  }

  const decoded = verifyJWT(token);
  console.log("[getUserClientFromJWT] Token decoded:", decoded);

  const { userId } = decoded;

  if (!userId) {
    console.error("[getUserClientFromJWT] ERROR: userId not found in JWT payload");
    throw new Error("Invalid JWT: userId not found");
  }

  console.log("[getUserClientFromJWT] Looking up user with userId:", userId);

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();

  const db = mongoClient.db("Supreme-Nomads-Detailing");
  const collection = db.collection("Users");

  const user = await collection.findOne({ userId });

  console.log("[getUserClientFromJWT] User found:", !!user);
  console.log("[getUserClientFromJWT] User document keys:", user ? Object.keys(user) : "N/A");
  console.log("[getUserClientFromJWT] accessToken present:", !!user?.accessToken);
  console.log("[getUserClientFromJWT] accessToken value:", user?.accessToken ? "exists" : "null/undefined");

  await mongoClient.close();

  if (!user) {
    console.error("[getUserClientFromJWT] ERROR: No user found in database for userId:", userId);
    throw new Error("User not found in database");
  }

  if (!user.accessToken) {
    console.error("[getUserClientFromJWT] ERROR: User found but accessToken is null/missing. UserId:", userId);
    console.error("[getUserClientFromJWT] User record:", JSON.stringify(user));
    throw new Error("User found but Square access token is missing. Please re-authenticate.");
  }

  console.log("[getUserClientFromJWT] Successfully created SquareClient for userId:", userId);

  return new SquareClient({
    token: user.accessToken,
    environment: SquareEnvironment.Production,
  });
}

async function getUserClient(userId) {
  console.log("[getUserClient] Starting with userId:", userId);

  if (!userId) {
    console.error("[getUserClient] ERROR: userId is required");
    throw new Error("userId is required");
  }

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();

  const db = mongoClient.db("Supreme-Nomads-Detailing");
  const collection = db.collection("Users");

  const user = await collection.findOne({ userId });

  console.log("[getUserClient] User found:", !!user);
  console.log("[getUserClient] accessToken present:", !!user?.accessToken);

  await mongoClient.close();

  if (!user) {
    console.error("[getUserClient] ERROR: No user found for userId:", userId);
    throw new Error("User not found in database");
  }

  if (!user.accessToken) {
    console.error("[getUserClient] ERROR: User found but accessToken is null/missing. UserId:", userId);
    throw new Error("User found but Square access token is missing");
  }

  console.log("[getUserClient] Successfully created SquareClient for userId:", userId);

  return new SquareClient({
    token: user.accessToken,
    environment: SquareEnvironment.Production,
  });
}

module.exports = { getUserClient, getUserClientFromJWT };
