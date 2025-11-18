const { SquareError } = require("square");
const client = require('../middleware/squareClient');

module.exports = {
  getBookings: async (req, res) => {
    try {
      let listLocationsResponse = await client.locations.list()

      let locations = listLocationsResponse.locations;

      locations.forEach(function (location) {
        console.log(
          location.id +
            ": " +
            location.name +
            ", " +
            location.address.addressLine1 +
            ", " +
            location.address.locality
        );
      });
    } catch (error) {
      if (error instanceof SquareError) {
        error.errors.forEach(function (e) {
          console.log(e.category);
          console.log(e.code);
          console.log(e.detail);
        });
      } else {
        console.log("Unexpected error occurred: ", error);
      }
    }
  },
};
