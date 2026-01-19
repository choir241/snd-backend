// controllers/teamMembers.js
const { client } = require("../middleware/squareClient");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

module.exports = {
  searchTeamMembers: async (req, res) => {
    try {
      const { status = "ACTIVE", limit = 10 } = req.query;

      const locationId = process.env.LOCATION_ID;

      if (!locationId) {
        return res.status(400).json({ error: "locationId is required" });
      }

      const response = await client.teamMembers.search({
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
