const { SquareError } = require("square");
const client = require('../middleware/squareClient');

module.exports = {
  searchAvailability: async (req, res) => {
    try {
        const getAvailability = await client.bookings.searchAvailability({
            query: {
                filter: {
                    startAtRange: {
                        startAt: "2025-11-18T14:35:00Z",
                        endAt: "2025-11-25T14:35:00Z",
                    },
                    locationId: process.env.LOCATION_ID,
                    segmentFilters: {
                        serviceVariationId: ""
                    }
                }
            }
        })
    } catch (error) {
      if (error instanceof SquareError) {
        error.errors.forEach(function (e) {
          console.error(e.category);
          console.error(e.code);
          console.error(e.detail);
        });
        console.error(`There was an issue fetching the package catalogs - ${error}`)
      } else {
        console.error("Unexpected error occurred: ", error);
      }
    }
  },
};
