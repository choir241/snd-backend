const { client } = require("../middleware/squareClient");
require("dotenv").config();
const { handleErrorMessage } = require("../hooks/handleErrorMessage");
const { getUserClient } = require("../hooks/getUserClient");

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
  createBooking: async (req, res) => {
    try {
      const { userId, customerId, startAt, locationId, appointmentSegments } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userClient = await getUserClient(userId);

      // Validate required fields
      if (!customerId || !startAt || !locationId || !appointmentSegments) {
        return res.status(400).json({
          error:
            "Missing required fields: customerId, startAt, locationId, and appointmentSegments are required",
        });
      }
      // Convert serviceVariationVersion to BigInt if it exists
      const processedSegments = appointmentSegments.map((segment) => ({
        ...segment,
        ...(segment.serviceVariationVersion && {
          serviceVariationVersion: BigInt(segment.serviceVariationVersion),
        }),
      }));

      const bookingData = {
        booking: {
          customerId,
          startAt,
          locationId,
          appointmentSegments: processedSegments,
        },
        idempotencyKey: crypto.randomUUID(),
      };

      const response = await userClient.bookings.create(bookingData);

      res.json({
        success: true,
        booking: response.booking.status,
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({
        error: error.message,
        ...(error.errors && { details: error.errors }),
      });
    }
  },
};
