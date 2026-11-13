// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();

const {
  getSummary,
  getRecent,
  getWorkload,
} = require("../controllers/dashboardController");

const userAuth = require("../middleware/userAuth");

// Auth for all
router.use(userAuth);

// ---- Dashboard endpoints (numeric + status) ----
router.get("/summary",  getSummary);
router.get("/recent",   getRecent);
router.get("/workload", getWorkload);

module.exports = router;