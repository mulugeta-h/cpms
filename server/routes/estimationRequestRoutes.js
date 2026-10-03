const express = require("express");
const router = express.Router();

const {
  getUsers,
  getNextEstimationId,
  getEstimationStatistics,
  getAllEstimationRequests,
  getEstimationRequestByEstimationId,
  getEstimationRequestById,
  createEstimationRequest,
  updateEstimationRequest,
  updateEstimationRequestStatus,
  deleteEstimationRequest,
} = require("../controllers/estimationRequestController");

const userAuth = require("../middleware/userAuth");

router.use(userAuth);

router.get("/getUsers", getUsers);
router.get("/next-id", getNextEstimationId);
router.get("/statistics", getEstimationStatistics);
router.get("/", getAllEstimationRequests);
router.get("/estimation-id/:estimationId", getEstimationRequestByEstimationId);
router.get("/:id", getEstimationRequestById);
router.post("/", createEstimationRequest);
router.put("/:id", updateEstimationRequest);
router.patch("/:id/status", updateEstimationRequestStatus);
router.delete("/:id", deleteEstimationRequest);

module.exports = router;