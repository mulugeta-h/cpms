const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require("cors");
const connectDB = require("./config/db");
const {createSuperAdmin} = require("./utils/init");
dotenv.config();

connectDB().then(() => {
  createSuperAdmin();
});

const app = express();
const helmet = require("helmet");

app.use(
  helmet({
    frameguard: { action: "deny" }
  })
);
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

// Routes
app.use("/api/super-admin", require("./routes/superAdminRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
//req routes
app.use("/api/estimation-requests", require("./routes/estimationRequestRoutes"));
app.use("/api/DC-requests", require("./routes/DCRequestRoutes"));
//excution routes
app.use("/api/designs", require("./routes/designRoutes"));
app.use("/api/specifications", require("./routes/specificationRoutes"));

app.get("/", (req, res) => {
  res.send("✅ Server is running successfully**!");
});

const PORT = process.env.PORT || 8010

/* =========================================================
   🔹 Server Start
========================================================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});