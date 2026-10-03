const express = require("express");
const router = express.Router();

const {
  getUsers,
  getNextDCId,
  getDCStatistics,
  getAllDCRequests,
  getDCRequestByDCId,
  getDCRequestById,
  createDCRequest,
  updateDCRequest,
  updateDCRequestStatus,
  deleteDCRequest,
} = require("../controllers/DCRequestController");

const userAuth = require("../middleware/userAuth");

router.use(userAuth);

router.get("/getUsers", getUsers);
router.get("/next-id", getNextDCId);
router.get("/statistics", getDCStatistics);
router.get("/", getAllDCRequests);
router.get("/dc-id/:dcId", getDCRequestByDCId);
router.get("/:id", getDCRequestById);
router.post("/", createDCRequest);
router.put("/:id", updateDCRequest);
router.patch("/:id/status", updateDCRequestStatus);
router.delete("/:id", deleteDCRequest);

module.exports = router;