const { client } = require("../middleware/squareClient");
require("dotenv").config();
const { handleErrorMessage } = require("../hooks/handleErrorMessage");
const { getUserClient } = require("../hooks/getUserClient");

module.exports = {
  createCustomer: async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userClient = await getUserClient(userId);

      const response = await userClient.customers.create({
        givenName: req.body.firstName,
        familyName: req.body.lastName,
        emailAddress: req.body.email,
        phoneNumber: req.body.phoneNumber,
        address: {
          addressLine1: req.body.streetAddress,
          addressLine2: req.body.suiteAddress,
          locality: req.body.city,
          administrativeDistrictLevel1: req.body.state,
          postalCode: req.body.zipCode,
          country: req.body.country,
        },

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
        id: response.customer.id,
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
  getCustomers: async (req, res) => {
    try {
      const userId = req.query.userId || req.body.userId;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userClient = await getUserClient(userId);

      const response = await userClient.customers.list({});

      if (!response.data.length) {
        return res.status(400).json({
          success: false,
          message: "Failed to fetch customers",
        });
      }

      const customers = response.data.map((customer) => ({
        id: customer.id,
        firstName: customer.givenName,
        lastName: customer.familyName,
        email: customer.emailAddress,
        phone: customer.phoneNumber,
        address: customer.address
          ? {
              streetAddress: customer.address.addressLine1,
              suiteAddress: customer.address.addressLine2,
              city: customer.address.locality,
              state: customer.address.administrativeDistrictLevel1,
              zipCode: customer.address.postalCode,
              country: customer.address.country,
            }
          : null,
        note: customer.note,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }));

      res.json({
        success: true,
        count: customers.length,
        data: customers,
      });
    } catch (err) {
      console.error("Error fetching customers:", err);
      handleErrorMessage(
        `There was an error fetching customers: ${err.message}`,
        err,
        "customer",
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch customers",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
};
