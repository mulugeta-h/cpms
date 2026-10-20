// controllers/constructionController.js
const Construction = require("../models/Construction");
const { DCRequest } = require("../models/DCRequest");

/* =====================================================
   READ — Distinct DCIds from DCRequest where status = "In Progress"
   that DO NOT yet have a Construction record.
===================================================== */
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

    const usedDCIds = await Construction.distinct("DCId");

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

/* =====================================================
   CREATE — Create a new Construction
===================================================== */


const createConstruction = async (req, res) => {
  try {
    const { DCId, contactPerson, submissionDate, remark } = req.body;
    /* =====================================================
   CREATE — Create a new Construction
===================================================== */
const ALWAYS_PENDING_FIELDS = [
  "designWorkLayout",
  "specificationWork",
];

const ALL_STATUS_FIELDS = [
  "designWorkLayout",
  "specificationWork",
  "partitionWork",
  "strongRoomPartition",
  "strongRoomDoor",
  "sentryBoxPlace",
  "grilledAndSecurityWork",
  "toiletRoomWork",
  "verandaOrCorridorWork",
  "electricalInstallationWork",
  "sanitaryInstallationWork",
  "ceilingFinishWork",
  "paintingWork",
  "electricalFittingWork",
  "sanitaryFittingWork",
  "siteClearance",
  "parkingArea",
];

// requestType values that require ALL fields to be Pending
const FULL_PENDING_REQUEST_TYPES = ["New Branch", "Branch Relocation"];

    if (!DCId) {
      return res.status(400).json({
        success: false,
        message: "DCId is required",
      });
    }

    if (!contactPerson) {
      return res.status(400).json({
        success: false,
        message: "Contact Person is required",
      });
    }

    const existing = await Construction.findOne({ DCId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A construction record already exists for this DCId",
        data: existing,
      });
    }

    // --- Look up the DCRequest to inspect requestType ---
    const dcRequest = await DCRequest.findOne(
      { DCId: String(DCId).trim() },
      { requestType: 1, _id: 0 }
    ).lean();

    const requestType = String(dcRequest?.requestType || "").trim();
    const isFullPending = FULL_PENDING_REQUEST_TYPES.includes(requestType);

    // --- Build status fields object ---
    const statusFields = {};
    if (isFullPending) {
      // All fields → Pending
      ALL_STATUS_FIELDS.forEach((f) => {
        statusFields[f] = "Pending";
      });
    } else {
      // All fields → Not Required, EXCEPT the always-pending ones
      ALL_STATUS_FIELDS.forEach((f) => {
        statusFields[f] = ALWAYS_PENDING_FIELDS.includes(f)
          ? "Pending"
          : "Not Required";
      });
    }

    // --- Compute initial percentage (mirrors updateConstructionStatus logic) ---
    const completedCount = ALL_STATUS_FIELDS.filter(
      (f) => statusFields[f] === "Completed"
    ).length;
    const notRequiredCount = ALL_STATUS_FIELDS.filter(
      (f) => statusFields[f] === "Not Required"
    ).length;
    const applicableFields = ALL_STATUS_FIELDS.length - notRequiredCount;
    const percentage =
      applicableFields > 0
        ? Math.round((completedCount / applicableFields) * 100)
        : 0;

    // --- Persist ---
    const construction = await Construction.create({
      DCId,
      contactPerson,
      submissionDate,
      remark,
      ...statusFields,
      percentage,
    });

    return res.status(201).json({
      success: true,
      message: "Construction created successfully",
      data: construction,
    });
  } catch (error) {
    console.error("createConstruction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create construction",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get all Constructions (joined with DCRequest)
===================================================== */
const getAllConstructions = async (req, res) => {
  try {
    const constructions = await Construction.aggregate([
      {
        $lookup: {
          from: DCRequest.collection.name,
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

          // Construction fields
          submissionDate: 1,
          contactPerson: 1,
          designWorkLayout: 1,
          specificationWork: 1,
          partitionWork: 1,
          strongRoomPartition: 1,
          strongRoomDoor: 1,
          sentryBoxPlace: 1,
          grilledAndSecurityWork: 1,
          toiletRoomWork: 1,
          verandaOrCorridorWork: 1,
          electricalInstallationWork: 1,
          sanitaryInstallationWork: 1,
          ceilingFinishWork: 1,
          paintingWork: 1,
          electricalFittingWork: 1,
          sanitaryFittingWork: 1,
          siteClearance: 1,
          parkingArea: 1,
          remark: 1,
          percentage: 1,

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
      count: constructions.length,
      data: constructions,
    });
  } catch (error) {
    console.error("getAllConstructions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch constructions",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get Construction by ID
===================================================== */
const getConstructionById = async (req, res) => {
  try {
    const construction = await Construction.findById(req.params.id);

    if (!construction) {
      return res.status(404).json({
        success: false,
        message: "Construction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: construction,
    });
  } catch (error) {
    console.error("getConstructionById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch construction",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get Construction by DCId
===================================================== */
const getConstructionByDCId = async (req, res) => {
  try {
    const construction = await Construction.findOne({
      DCId: req.params.dcId,
    });

    if (!construction) {
      return res.status(404).json({
        success: false,
        message: "Construction not found for this DCId",
      });
    }

    return res.status(200).json({
      success: true,
      data: construction,
    });
  } catch (error) {
    console.error("getConstructionByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch construction",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE — Update Construction by ID
===================================================== */
const updateConstruction = async (req, res) => {
  try {
    const construction = await Construction.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!construction) {
      return res.status(404).json({
        success: false,
        message: "Construction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Construction updated successfully",
      data: construction,
    });
  } catch (error) {
    console.error("updateConstruction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update construction",
      error: error.message,
    });
  }
};


/* =====================================================
   UPDATE — Single field status update (dropdown change)
===================================================== */
const updateConstructionStatus = async (req, res) => {
  try {
    const { field, value } = req.body;

    // Whitelist of allowed fields to update
    const allowedFields = [
      "designWorkLayout",
      "specificationWork",
      "partitionWork",
      "strongRoomPartition",
      "strongRoomDoor",
      "sentryBoxPlace",
      "grilledAndSecurityWork",
      "toiletRoomWork",
      "verandaOrCorridorWork",
      "electricalInstallationWork",
      "sanitaryInstallationWork",
      "ceilingFinishWork",
      "paintingWork",
      "electricalFittingWork",
      "sanitaryFittingWork",
      "siteClearance",
      "parkingArea",
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field: ${field}`,
      });
    }

    const allowedValues = ["Pending", "Completed", "Not Required"];
    if (!allowedValues.includes(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid value: ${value}. Must be one of: ${allowedValues.join(", ")}`,
      });
    }

    const construction = await Construction.findByIdAndUpdate(
      req.params.id,
      { [field]: value },
      { new: true, runValidators: true }
    );

    if (!construction) {
      return res.status(404).json({
        success: false,
        message: "Construction not found",
      });
    }

    // Recalculate percentage
    const completedCount = allowedFields.filter(
      (f) => construction[f] === "Completed"
    ).length;
    const notRequiredCount = allowedFields.filter(
      (f) => construction[f] === "Not Required"
    ).length;
    const applicableFields = allowedFields.length - notRequiredCount;
    const percentage =
      applicableFields > 0
        ? Math.round((completedCount / applicableFields) * 100)
        : 0;

    construction.percentage = percentage;
    await construction.save();

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: construction,
    });
  } catch (error) {
    console.error("updateConstructionStatus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};


/* =====================================================
   DELETE — Delete Construction by ID
===================================================== */
const deleteConstruction = async (req, res) => {
  try {
    const construction = await Construction.findByIdAndDelete(req.params.id);

    if (!construction) {
      return res.status(404).json({
        success: false,
        message: "Construction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Construction deleted successfully",
      data: construction,
    });
  } catch (error) {
    console.error("deleteConstruction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete construction",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE — Delete Construction by DCId
===================================================== */
const deleteConstructionByDCId = async (req, res) => {
  try {
    const construction = await Construction.findOneAndDelete({
      DCId: req.params.dcId,
    });

    if (!construction) {
      return res.status(404).json({
        success: false,
        message: "Construction not found for this DCId",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Construction deleted successfully",
      data: construction,
    });
  } catch (error) {
    console.error("deleteConstructionByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete construction",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Construction stats
===================================================== */
const getConstructionStats = async (req, res) => {
  try {
    const total = await Construction.countDocuments();
    const completed = await Construction.countDocuments({ percentage: 100 });
    const inProgress = await Construction.countDocuments({
      percentage: { $gt: 0, $lt: 100 },
    });
    const notStarted = await Construction.countDocuments({ percentage: 0 });

    return res.status(200).json({
      success: true,
      data: { total, completed, inProgress, notStarted },
    });
  } catch (error) {
    console.error("getConstructionStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message,
    });
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  getInProgressDCIds,
  createConstruction,
  getAllConstructions,
  getConstructionById,
  getConstructionByDCId,
  updateConstruction,
  updateConstructionStatus,
  deleteConstruction,
  deleteConstructionByDCId,
  getConstructionStats,
};