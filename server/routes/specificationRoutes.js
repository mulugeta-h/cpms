// routes/specificationRoutes.js
const express = require("express");
const router = express.Router();

const {
  getAllSpecifications,
  getInProgressEstimationIds,
  createSpecification,
  updateSpecification,
  deleteSpecification,
} = require("../controllers/specificationController");

const userAuth = require("../middleware/userAuth");

// Apply authentication to all routes
router.use(userAuth);

router.get("/", getAllSpecifications);
router.get("/inprogress-estimation-ids", getInProgressEstimationIds);
router.post("/", createSpecification);
router.put("/:id", updateSpecification);
router.delete("/:id", deleteSpecification);

module.exports = router;