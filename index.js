const express = require("express");
const app = express();
const cors = require("cors");
const packageRoutes = require("./routes/packages");
const bookingsRoutes = require("./routes/bookings");
const purchasesRoutes = require("./routes/purchases");
const authRoutes = require("./routes/auth");
const customerRoutes = require("./routes/customer");
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
);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
});
