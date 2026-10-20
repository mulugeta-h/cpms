// routes/constructionRoutes.js
const express = require("express");
const router = express.Router();

const {
  // in-progress dropdown
  getInProgressDCIds,

  // CRUD
  createConstruction,
  getAllConstructions,
  getConstructionById,
  getConstructionByDCId,
  updateConstruction,
  updateConstructionStatus,
  upsertConstructionByDCId,
  deleteConstruction,
  deleteConstructionByDCId,
  getConstructionStats,
} = require("../controllers/constructionController");

const userAuth = require("../middleware/userAuth");

// Apply authentication to all routes
router.use(userAuth);

// ---- Static / special routes FIRST (before :id) ----
router.get("/inprogress-dcids", getInProgressDCIds);
router.get("/stats", getConstructionStats);

// ---- Collection-level ----
router.post("/", createConstruction);
router.get("/", getAllConstructions);

// ---- Lookup by DCId (business key) ----
router.get("/dc/:dcId", getConstructionByDCId);
router.delete("/dc/:dcId", deleteConstructionByDCId);

// ---- Parameterized by Mongo _id LAST ----
router.get("/:id", getConstructionById);
router.put("/:id", updateConstruction);
router.patch("/:id/status", updateConstructionStatus);
router.delete("/:id", deleteConstruction);

module.exports = router;