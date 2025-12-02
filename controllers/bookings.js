const { SquareError } = require("square");
const { client } = require("../middleware/squareClient");
require("dotenv").config();

module.exports = {
  searchAvailability: async (req, res) => {
    try {
      const getAvailability = await client.bookings.searchAvailability({
        query: {
          filter: {
            startAtRange: {
              startAt: req.body.startAt,
              endAt: req.body.endAt,
            },
            locationId: process.env.LOCATION_ID,
            segmentFilters: [
              {
                serviceVariationId: req.params.variationId,
              },
            ],
          },
        },
      });

      const getAppointments = getAvailability.availabilities.map(
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

      res.json({ avail: getAppointments, appts: getAppointments });
    } catch (error) {
      if (error instanceof SquareError) {
        error.errors.forEach(function (e) {
          console.error(e.category);
          console.error(e.code);
          console.error(e.detail);
        });
        console.error(
          `There was an issue fetching the package catalogs - ${error}`,
        );
      } else {
        console.error("Unexpected error occurred: ", error);
      }
    }
  },
};
