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

      console.log("[createBooking] Full request body:", JSON.stringify(req.body, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
      }, 2));
      console.log("[createBooking] Using locationId:", locationId);

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
        console.log("[createBooking] Processing segment:", JSON.stringify(segment));
        
        // Always fetch fresh version from catalog when serviceVariationId is provided
        if (segment.serviceVariationId) {
          try {
            console.log("[createBooking] Fetching catalog version for variationId:", segment.serviceVariationId);
            const catalogResponse = await userClient.catalog.batchGet({
              objectIds: [segment.serviceVariationId],
            });
            console.log("[createBooking] Catalog response:", JSON.stringify(catalogResponse, (key, value) => {
              if (typeof value === 'bigint') return value.toString();
              return value;
            }, 2));
            
            const catalogObject = catalogResponse.objects?.[0];
            let currentVersion;
            if (catalogObject?.type === "ITEM_VARIATION" && catalogObject?.itemVariationData) {
              currentVersion = BigInt(catalogObject.version);
              console.log("[createBooking] Current catalog version from ITEM_VARIATION:", currentVersion.toString());
            } else if (catalogObject) {
              console.log("[createBooking] Unexpected catalog response type:", catalogObject.type);
            }
            
            if (currentVersion) {
              return {
                ...segment,
                serviceVariationVersion: currentVersion,
              };
            }
          } catch (catErr) {
            console.error("[createBooking] Error fetching catalog version:", catErr.message);
          }
        }
        
        // Ensure version is always BigInt when provided
        if (segment.serviceVariationVersion) {
          return {
            ...segment,
            serviceVariationVersion: BigInt(segment.serviceVariationVersion),
          };
        }
        
        return segment;
      }));
      
      console.log("[createBooking] Processed segments:", JSON.stringify(processedSegments, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
      }, 2));

      const bookingData = {
        booking: {
          customerId,
          startAt,
          locationId,
          appointmentSegments: processedSegments,
        },
        idempotencyKey: crypto.randomUUID(),
      };

      console.log("[createBooking] Full bookingData being sent:", JSON.stringify(bookingData, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
      }, 2));
      
      console.log("[createBooking] Calling Square bookings.create...");
      const response = await userClient.bookings.create(bookingData);
      console.log("[createBooking] Square response:", JSON.stringify(response, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
      }, 2));

      res.json({
        success: true,
        booking: response.booking.status,
      });
    } catch (error) {
      console.error("[createBooking] Error creating booking:", error.message);
      console.error("[createBooking] Error code:", error.code);
      console.error("[createBooking] Error details:", JSON.stringify(error.errors, null, 2));
      console.error("[createBooking] Error rawResponse:", JSON.stringify(error.rawResponse, null, 2));
      res.status(500).json({
        error: error.message,
        ...(error.errors && { details: error.errors }),
      });
    }
  },
};
