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

      const excludedNames = ["Sana Devokta", "Richard Choi"];
      
      const filteredTeamMembers = response.teamMembers.filter(member => {
        const displayName = member.displayName || "";
        const isExcluded = excludedNames.some(excluded => 
          displayName.toLowerCase().includes(excluded.toLowerCase())
        );
        if (isExcluded) {
          console.log(`[searchTeamMembers] Excluding team member: ${displayName}`);
        }
        return !isExcluded;
      });

      console.log(`[searchTeamMembers] Returning ${filteredTeamMembers.length} team members (filtered from ${response.teamMembers.length})`);

      res.json(filteredTeamMembers);
    } catch (error) {
      handleErrorMessage(
        `Error searching team members: ${error.message}`,
        error,
      );
      res.status(500).json({ error: "Failed to search team members" });
    }
  },
};
