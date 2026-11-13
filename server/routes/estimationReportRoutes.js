// routes/estimationReportRoutes.js
const express = require("express");
const router = express.Router();
const {
  getEstimationReportByType,
  getEstimationReportByPurpose,
  getEstimationReportByFee,
  getESTRequestReport,
} = require("../controllers/estimationReportController");

const userAuth = require("../middleware/userAuth");

// Apply authentication to all routes
router.use(userAuth);

// 1. Estimation Requests (Returns 2 flat tables: By Status & By Type)
router.get("/est-requests", getESTRequestReport);

// 2. Estimation Fee (Returns 1 flat table)
router.get("/by-fee", getEstimationReportByFee);

// 3. Type of Property (Returns complex pivot with statuses)
router.get("/by-type", getEstimationReportByType);

// 4. Purpose of Valuation (Returns complex pivot with statuses)
router.get("/by-purpose", getEstimationReportByPurpose);

module.exports = router;