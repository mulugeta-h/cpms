const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  createDesign,
  getAllDesigns,
  getDesignById,
  getDesignByDCId,
  updateDesign,
  upsertDesignByDCId,
  deleteDesign,
  deleteDesignByDCId,
  getInProgressDCIds,
  downloadCAD,
  uploadCAD,             // ✅ NEW
} = require("../controllers/designController");

const userAuth = require("../middleware/userAuth");

// Multer — memory storage so we can rename after looking up placeofSite
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Apply authentication to all routes
router.use(userAuth);

router.get("/inprogress-dcids", getInProgressDCIds);
router.post("/", createDesign);
router.get("/", getAllDesigns);

router.get("/dc/:dcId", getDesignByDCId);
router.put("/dc/:dcId", upsertDesignByDCId);
router.delete("/dc/:dcId", deleteDesignByDCId);

// ✅ NEW — must come BEFORE the generic /:id routes
router.post("/:id/upload-cad", upload.single("file"), uploadCAD);
router.get("/:id/download-cad", downloadCAD);

router.get("/:id", getDesignById);
router.put("/:id", updateDesign);
router.delete("/:id", deleteDesign);

module.exports = router;