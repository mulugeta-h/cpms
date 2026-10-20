// routes/estimationReportRoutes.js
const express = require("express");
const router = express.Router();
const {
  getEstimationReportByType,
  getEstimationReportByPurpose,
} = require("../controllers/estimationReportController");

router.get("/by-type", getEstimationReportByType);
router.get("/by-purpose", getEstimationReportByPurpose);

module.exports = router;