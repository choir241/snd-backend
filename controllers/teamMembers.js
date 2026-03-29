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

      console.log("[searchTeamMembers] Raw team members:", JSON.stringify(response.teamMembers, null, 2));

      const targetNames = ["tenzin", "akash"];
      
      const filteredTeamMembers = response.teamMembers.filter(member => {
        const nameFields = [
          member.displayName || "",
          member.givenName || "",
          member.familyName || "",
          member.title || "",
        ].join(" ").toLowerCase();
        
        const isMatch = targetNames.some(target => nameFields.includes(target));
        
        if (isMatch) {
          console.log(`[searchTeamMembers] Including team member: ${member.displayName || member.givenName || "Unknown"} with ID: ${member.id}`);
        }
        return isMatch;
      });

      console.log(`[searchTeamMembers] Returning ${filteredTeamMembers.length} team members:`, filteredTeamMembers.map(m => ({ id: m.id, name: m.displayName || m.givenName })));

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
