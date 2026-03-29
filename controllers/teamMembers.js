// controllers/teamMembers.js
const { client } = require("../middleware/squareClient");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");
const { getUserClient } = require("../hooks/getUserClient");
const { verifyJWT } = require("../utils/jwt");

const extractAndVerifyJWT = (req) => {
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    token = req.query.jwt;
  }
  
  if (token) {
    try {
      return verifyJWT(token);
    } catch (err) {
      console.warn("[JWT] Verification failed:", err.message);
    }
  }
  return null;
};

module.exports = {
  searchTeamMembers: async (req, res) => {
    try {
      const { userId, status = "ACTIVE", limit = 10 } = req.query;

      // Optionally verify JWT if present
      const decodedJWT = extractAndVerifyJWT(req);
      if (decodedJWT) {
        console.log("[searchTeamMembers] JWT verified for user:", decodedJWT.userId);
      }

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userClient = await getUserClient(userId);

      const locationId = process.env.LOCATION_ID;

      if (!locationId) {
        return res.status(400).json({ error: "locationId is required" });
      }

      const response = await userClient.teamMembers.search({
        query: {
          filter: {
            locationIds: [locationId],
            status: status,
          },
        },
        limit: parseInt(limit, 10),
      });

      res.json(response.teamMembers);
    } catch (error) {
      handleErrorMessage(
        `Error searching team members: ${error.message}`,
        error,
      );
      res.status(500).json({ error: "Failed to search team members" });
    }
  },
};
