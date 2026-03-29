const { MongoClient } = require("mongodb");
const { SquareClient, SquareEnvironment } = require("square");
const { verifyJWT } = require("../utils/jwt");

async function getUserClientFromJWT(token) {
  if (!token) {
    throw new Error("JWT token is required");
  }

  const decoded = verifyJWT(token);
  const { userId } = decoded;

  if (!userId) {
    throw new Error("Invalid JWT: userId not found");
  }

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();

  const db = mongoClient.db("Supreme-Nomads-Detailing");
  const collection = db.collection("Users");

  const user = await collection.findOne({ userId });

  await mongoClient.close();

  if (!user || !user.accessToken) {
    throw new Error("User or access token not found");
  }

  return new SquareClient({
    token: user.accessToken,
    environment: SquareEnvironment.Production,
  });
}

async function getUserClient(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();

  const db = mongoClient.db("Supreme-Nomads-Detailing");
  const collection = db.collection("Users");

  const user = await collection.findOne({ userId });

  await mongoClient.close();

  if (!user || !user.accessToken) {
    throw new Error("User or access token not found");
  }

  return new SquareClient({
    token: user.accessToken,
    environment: SquareEnvironment.Production,
  });
}

module.exports = { getUserClient, getUserClientFromJWT };
