const path = require("path");                       // ✅ NEW
const fs = require("fs");                           // ✅ NEW
const Design = require("../models/Design");
const { DCRequest } = require("../models/DCRequest");

// ✅ NEW — CAD upload directory
const CAD_DIR = path.join(__dirname, "..", "uploads", "cad");

if (!fs.existsSync(CAD_DIR)) {
  fs.mkdirSync(CAD_DIR, { recursive: true });
}

// ✅ NEW — sanitize a string for use in a filename
const sanitizeForFilename = (str) =>
  String(str || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[^\w\-_.]/g, "_");

// =========================
// READ - Distinct DCIds from DCRequest where status = "In Progress"
// =========================
const getInProgressDCIds = async (req, res) => {
  try {
    const rows = await DCRequest.find(
      { status: "In Progress" },
      { DCId: 1, placeofSite: 1, _id: 0 }
    )
      .sort({ DCId: 1 })
      .lean();

    if (!rows.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const usedDCIds = await Design.distinct("DCId");

    const usedSet = new Set(
      usedDCIds.map((v) => String(v || "").trim()).filter(Boolean)
    );

    const seen = new Set();
    const cleaned = [];

    for (const r of rows) {
      const id = String(r.DCId || "").trim();
      const place = String(r.placeofSite || "").trim();

      if (!id) continue;
      if (seen.has(id)) continue;
      if (usedSet.has(id)) continue;

      seen.add(id);
      cleaned.push({
        DCId: id,
        placeofSite: place,
      });
    }

    return res.status(200).json({
      success: true,
      count: cleaned.length,
      data: cleaned,
    });
  } catch (error) {
    console.error("getInProgressDCIds error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch in-progress DC Ids",
      error: error.message,
    });
  }
};

// =========================
// CREATE - Create a new Design
// =========================
const createDesign = async (req, res) => {
  try {
    const {
      DCId,
      siteVisitDate,
      siteVisitPurpose,
      drawingReleaseDate,
      branchHandOverDate,
      acceptedBy,
      drawingFileName,
      remark,
    } = req.body;

    if (!DCId) {
      return res.status(400).json({
        success: false,
        message: "DCId is required",
      });
    }

    const existing = await Design.findOne({ DCId });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A design already exists for this DCId",
        data: existing,
      });
    }

    const design = await Design.create({
      DCId,
      siteVisitDate,
      siteVisitPurpose,
      drawingReleaseDate,
      branchHandOverDate,
      acceptedBy,
      drawingFileName,
      remark,
    });

    return res.status(201).json({
      success: true,
      message: "Design created successfully",
      data: design,
    });
  } catch (error) {
    console.error("createDesign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create design",
      error: error.message,
    });
  }
};

// =========================
// READ - Get all Designs
// =========================
const getAllDesigns = async (req, res) => {
  try {
    const designs = await Design.aggregate([
      {
        $lookup: {
          from: DCRequest.collection.name,   // ✅ dynamic, always correct
          localField: "DCId",
          foreignField: "DCId",
          as: "dcRequest",
        },
      },
      {
        $unwind: {
          path: "$dcRequest",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          DCId: 1,

          // Design fields
          siteVisitDate: 1,
          siteVisitPurpose: 1,
          drawingReleaseDate: 1,     // ✅ fixed (was specReleaseDate)
          branchHandOverDate: 1,
          drawingFileName: 1,        // ✅ added (exists in schema)
          acceptedBy: 1,
          remark: 1,

          // DCRequest fields
          requestingOrgan: "$dcRequest.requestingOrgan",
          requestType: "$dcRequest.requestType",
          requestDate: "$dcRequest.requestDate",
          placeofSite: "$dcRequest.placeofSite",
          assignedBy: "$dcRequest.assignedBy",
          assignedTo: "$dcRequest.assignedTo",
          status: "$dcRequest.status",

          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      count: designs.length,
      data: designs,
    });
  } catch (error) {
    console.error("getAllDesigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch designs",
      error: error.message,
    });
  }
};

// =========================
// READ - Get Design by ID
// =========================
const getDesignById = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: design,
    });
  } catch (error) {
    console.error("getDesignById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch design",
      error: error.message,
    });
  }
};

// =========================
// READ - Get Design by DCId
// =========================
const getDesignByDCId = async (req, res) => {
  try {
    const design = await Design.findOne({
      DCId: req.params.dcId,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found for this DCId",
      });
    }

    return res.status(200).json({
      success: true,
      data: design,
    });
  } catch (error) {
    console.error("getDesignByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch design",
      error: error.message,
    });
  }
};

// =========================
// UPDATE - Update Design by ID
// =========================
const updateDesign = async (req, res) => {
  try {
    const design = await Design.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Design updated successfully",
      data: design,
    });
  } catch (error) {
    console.error("updateDesign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update design",
      error: error.message,
    });
  }
};

// =========================
// UPDATE - Upsert by DCId
// =========================
const upsertDesignByDCId = async (req, res) => {
  try {
    const { dcId } = req.params;

    const design = await Design.findOneAndUpdate(
      { DCId: dcId },
      { $set: { ...req.body, DCId: dcId } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Design saved successfully",
      data: design,
    });
  } catch (error) {
    console.error("upsertDesignByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save design",
      error: error.message,
    });
  }
};

// =========================
// UPLOAD - CAD (.dwg) for a Design
// Saves file as <DCId>-<placeofSite>.dwg in /uploads/cad
// =========================
const uploadCAD = async (req, res) => {             // ✅ NEW
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Expected field name 'file'.",
      });
    }

    // 1. Only .dwg allowed
    const originalName = req.file.originalname || "";
    const ext = path.extname(originalName).toLowerCase();

    if (ext !== ".dwg") {
      return res.status(400).json({
        success: false,
        message: "Only .dwg files are allowed.",
      });
    }

    // 2. Load Design to get DCId
    const design = await Design.findById(id);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    // 3. Look up matching DCRequest for placeofSite
    const dcRequest = await DCRequest.findOne({ DCId: design.DCId })
      .select("placeofSite")
      .lean();

    const place = sanitizeForFilename(dcRequest?.placeofSite || "unknown");
    const dcIdSafe = sanitizeForFilename(design.DCId || id);

    // 4. Build final name: DCId-placeofSite.dwg
    const finalFileName = `${dcIdSafe}-${place}.dwg`;
    const finalPath = path.join(CAD_DIR, finalFileName);

    // 5. Write buffer to disk
    fs.writeFileSync(finalPath, req.file.buffer);

    // 6. Save on Design
    design.drawingFileName = finalFileName;
    await design.save();

    return res.status(200).json({
      success: true,
      message: "CAD file uploaded successfully",
      data: {
        drawingFileName: finalFileName,
        path: `/uploads/cad/${finalFileName}`,
        design,
      },
    });
  } catch (error) {
    console.error("uploadCAD error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload CAD file",
      error: error.message,
    });
  }
};

// =========================
// DELETE - Delete Design by ID
// =========================
const deleteDesign = async (req, res) => {
  try {
    const design = await Design.findByIdAndDelete(req.params.id);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Design deleted successfully",
      data: design,
    });
  } catch (error) {
    console.error("deleteDesign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete design",
      error: error.message,
    });
  }
};

// =========================
// DELETE - Delete Design by DCId
// =========================
const deleteDesignByDCId = async (req, res) => {
  try {
    const design = await Design.findOneAndDelete({
      DCId: req.params.dcId,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found for this DCId",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Design deleted successfully",
      data: design,
    });
  } catch (error) {
    console.error("deleteDesignByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete design",
      error: error.message,
    });
  }
};

// =========================
// DOWNLOAD - CAD (.dwg) for a Design
// Streams the stored file back with proper headers
// =========================
const downloadCAD = async (req, res) => {
  try {
    const { id } = req.params;

    const design = await Design.findById(id);
    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    if (!design.drawingFileName) {
      return res.status(404).json({
        success: false,
        message: "No CAD file uploaded for this design",
      });
    }

    // Prevent path traversal — only allow a basename
    const safeName = path.basename(design.drawingFileName);
    const filePath = path.join(CAD_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "CAD file missing on server",
      });
    }

    // Let the browser save it with the correct name
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    return res.sendFile(filePath);
  } catch (error) {
    console.error("downloadCAD error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download CAD file",
      error: error.message,
    });
  }
};

// =========================
// EXPORTS
// =========================
module.exports = {
  getInProgressDCIds,
  createDesign,
  getAllDesigns,
  getDesignById,
  getDesignByDCId,
  updateDesign,
  upsertDesignByDCId,
  uploadCAD,  
  downloadCAD,                                      // ✅ NEW
  deleteDesign,
  deleteDesignByDCId,
};