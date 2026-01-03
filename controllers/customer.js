const { client } = require("../middleware/squareClient");
require("dotenv").config();
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

module.exports = {
  createCustomer: async (req, res) => {
    try {
      const response = await client.customers.create({
        givenName: req.body.firstName,
        familyName: req.body.lastName,
        emailAddress: req.body.email,
        phoneNumber: req.body.phoneNumber,
        locality: req.body.city,
        addressLine1: req.body.streetAddress,
        addressLine2: req.body.suiteAddress,
        administrativeDistrictLevel1: req.body.state,
        postalCode: req.body.zipCode,
        country: req.body.country,
        note: req.body.note,
      });

      if (!response) {
        handleErrorMessage(
          "There was a problem creating a customer or the information sent from the client-side.",
          response,
          "customer",
        );
      }

      const customerInfo = {
        firstName: response.customer.givenName,
        lastName: response.customer.familyName,
        email: response.customer.emailAddress,
        phone: response.customer.phoneNumber,
      };

      res.json(customerInfo);
    } catch (err) {
      handleErrorMessage(
        `There was an error creating a customer: ${err.message}`,
      );
    }
  },
};
