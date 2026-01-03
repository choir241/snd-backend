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
          const variationId =
            availability.appointmentSegments[0].serviceVariationId;
          const durationMinutes =
            availability.appointmentSegments[0].durationMinutes;
          return {
            startAt: availability.startAt,
            variationId: variationId,
            durationMinutes: durationMinutes,
          };
        },
      );

      res.json({ appts: getAppointments });
    } catch (error) {
      handleErrorMessage(
        `There was an error searching for the merchants availability: ${error.message}`,
      );
    }
  },
};
