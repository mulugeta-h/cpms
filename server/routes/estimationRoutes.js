// routes/estimationRoutes.js
const express = require("express");
const router = express.Router();
const {
  getInProgressEstimationIds,
  createEstimation,
  getAllEstimations,
  getEstimationById,
  getEstimationByEstimationId,
  updateEstimation,
  upsertEstimationByEstimationId,
  deleteEstimation,
  deleteEstimationByEstimationId,
} = require("../controllers/estimationController");

// Dropdown source
router.get("/inprogress-estimation-ids", getInProgressEstimationIds);

// By estimationId (ESTREQ-XXX)
router.get("/by-estimation-id/:estimationId", getEstimationByEstimationId);
router.put("/by-estimation-id/:estimationId", upsertEstimationByEstimationId);
router.delete(
  "/by-estimation-id/:estimationId",
  deleteEstimationByEstimationId
);

/* =====================================================
   GENERIC ROUTES — always last
===================================================== */
router.post("/", createEstimation);
router.get("/", getAllEstimations);
router.get("/:id", getEstimationById);
router.put("/:id", updateEstimation);
router.delete("/:id", deleteEstimation);

module.exports = router;