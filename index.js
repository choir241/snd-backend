const express = require("express");
const app = express();
const cors = require("cors");
const packageRoutes = require("./routes/packages");
const bookingsRoutes = require("./routes/bookings");
require("dotenv").config();

app.use(cors());

//Body Parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Setup Routes For Which The Server Is Listening
app.use("/", packageRoutes, bookingsRoutes);

//Server Running
app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
});
