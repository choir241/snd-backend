const { client } = require("../middleware/squareClient");
require("dotenv").config();
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

module.exports = {
  searchAvailability: async (req, res) => {
    try {
      const searchAvailability = await client.bookings.searchAvailability({
        query: {
          filter: {
            startAtRange: {
              startAt: req.body.startAt,
              endAt: req.body.endAt,
            },
            locationId: process.env.LOCATION_ID,
            segmentFilters: [
              {
                serviceVariationId: req.body.serviceVariationId,
              },
            ],
          },
        },
      });

      const getAppointments = searchAvailability.availabilities.map(
        (availability) => {
          return availability.appointmentSegments.map((variation) => {
            return {
              durationMinutes: variation.durationMinutes,
              teamMemberId: variation.teamMemberId,
              serviceVariationId: variation.serviceVariationId,
            };
          });
        },
      );

      res.json({ appts: getAppointments });
    } catch (error) {
      handleErrorMessage(
        res,
        `There was an error searching for the merchants availability: ${error.message}`,
      );
    }
  },
};
