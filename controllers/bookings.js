const { client } = require("../middleware/squareClient");
require("dotenv").config();
const { handleErrorMessage } = require("../hooks/handleErrorMessage");
const { getUserClient, getUserClientFromJWT } = require("../hooks/getUserClient");
const { getUserIdFromRequest } = require("../hooks/jwtAuth");
const crypto = require("crypto");

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
      const { userId: authUserId, source } = await getUserIdFromRequest(req);
      
      if (!authUserId) {
        return res.status(401).json({ error: "Authentication required. Please log in." });
      }
      
      console.log("[createBooking] Auth source:", source, "userId:", authUserId);

      const { customerId, startAt, appointmentSegments } = req.body;
      const locationId = process.env.LOCATION_ID;

      // Use JWT-based client
      const token = req.headers.authorization?.substring(7) || req.query.jwt || req.body?.jwt;
      const userClient = token 
        ? await getUserClientFromJWT(token)
        : await getUserClient(authUserId);

      // Validate required fields
      if (!customerId || !startAt || !appointmentSegments) {
        return res.status(400).json({
          error:
            "Missing required fields: customerId, startAt, and appointmentSegments are required",
        });
      }
      
      // Fetch current serviceVariationVersion from catalog for each segment
      const processedSegments = await Promise.all(appointmentSegments.map(async (segment) => {
        const segmentVersion = segment.serviceVariationVersion 
          ? BigInt(segment.serviceVariationVersion)
          : null;
        
        // If version not provided, fetch from catalog
        if (!segmentVersion && segment.serviceVariationId) {
          try {
            const catalogResponse = await userClient.catalog.retrieve(segment.serviceVariationId);
            if (catalogResponse.object?.itemVariationData) {
              return {
                ...segment,
                serviceVariationVersion: BigInt(catalogResponse.object.version),
              };
            }
          } catch (catErr) {
            console.error("[createBooking] Error fetching catalog version:", catErr.message);
          }
        }
        
        return {
          ...segment,
          ...(segmentVersion && { serviceVariationVersion: segmentVersion }),
        };
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
