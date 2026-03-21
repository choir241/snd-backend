const express = require("express");
const app = express();
const cors = require("cors");
const packageRoutes = require("./routes/packages");
const bookingsRoutes = require("./routes/bookings");
const purchasesRoutes = require("./routes/purchases");
const authRoutes = require("./routes/auth");
const customerRoutes = require("./routes/customer");
const orderRoutes = require("./routes/orders");
const webhookRoutes = require("./webhooks/square");
const teamMembersRoutes = require("./routes/teamMembers");

require("dotenv").config();

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  "/",
  packageRoutes,
  bookingsRoutes,
  purchasesRoutes,
  authRoutes,
  customerRoutes,
  orderRoutes,
  teamMembersRoutes,
);
app.post(
  "/webhooks/square",
  express.raw({ type: "application/json" }),
  webhookRoutes.handleOrderWebhook,
);

console.log("PORT", process.env.PORT);
console.log("ACCESS_TOKEN", process.env.ACCESS_TOKEN);
console.log("LOCATION_ID", process.env.LOCATION_ID);
console.log("APP_SECRET", process.env.APP_SECRET);
console.log("APP_ID", process.env.APP_ID);
console.log("ENVIRONMENT", process.env.ENVIRONMENT);
console.log("MONGO_URI", process.env.MONGO_URI);
console.log("FRONTEND_URL", process.env.FRONTEND_URL);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
});
