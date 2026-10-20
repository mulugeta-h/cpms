// routes/DCReportRoutes.js
const express = require("express");
const router = express.Router();

const {
  getDCRequestReport,
  getDesignReport,
  getSpecificationReport,
  getConstructionReport,
} = require("../controllers/DCReportController");

const userAuth = require("../middleware/userAuth");

// Auth for all
router.use(userAuth);

// ---- Four report tables (uniform shape) ----
router.get("/dcrequest",     getDCRequestReport);
router.get("/design",        getDesignReport);
router.get("/specification", getSpecificationReport);
router.get("/construction",  getConstructionReport);

module.exports = router;