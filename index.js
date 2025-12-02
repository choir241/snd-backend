const express = require("express");
const app = express();
const cors = require("cors");
const packageRoutes = require("./routes/packages");
const bookingsRoutes = require("./routes/bookings");
const purchasesRoutes = require("./routes/purchases");
const authRoutes = require("./routes/auth");
require("dotenv").config();
const cookieParser = require("cookie-parser");

app.use(cors());

//Body Parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

//Setup Routes For Which The Server Is Listening
app.use("/", packageRoutes, bookingsRoutes, purchasesRoutes, authRoutes);

//Server Running
app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
});
