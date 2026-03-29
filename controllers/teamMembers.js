// controllers/teamMembers.js
const { client } = require("../middleware/squareClient");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");
const { getUserClient, getUserClientFromJWT } = require("../hooks/getUserClient");
const { getUserIdFromRequest } = require("../hooks/jwtAuth");

module.exports = {
  searchTeamMembers: async (req, res) => {
    try {
      const { userId: authUserId, source } = await getUserIdFromRequest(req);
      
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required. Please log in." });
      }
      
      console.log("[searchTeamMembers] Auth source:", source, "userId:", authUserId);

      const { status = "ACTIVE", limit = 10 } = req.query;

      // Use JWT-based client
      const token = req.headers.authorization?.substring(7) || req.query.jwt || req.body?.jwt;
      const userClient = token 
        ? await getUserClientFromJWT(token)
        : await getUserClient(authUserId);

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
