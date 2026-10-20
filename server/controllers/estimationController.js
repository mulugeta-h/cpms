// controllers/estimationController.js
const Estimation = require("../models/Estimation");
const { EstimationRequest } = require("../models/EstimationRequest");

/* =====================================================
   READ — Distinct estimationIds from EstimationRequest
   where status = "In Progress" that DO NOT yet have an
   Estimation. (Mirrors getInProgressDCIds)
===================================================== */
const getInProgressEstimationIds = async (req, res) => {
  try {
    const rows = await EstimationRequest.find(
      { status: "In Progress" },
      { estimationId: 1, propertyAddress: 1, _id: 0 }
    )
      .sort({ estimationId: 1 })
      .lean();

    if (!rows.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const usedEstimationIds = await Estimation.distinct("estimationId");

    const usedSet = new Set(
      usedEstimationIds.map((v) => String(v || "").trim()).filter(Boolean)
    );

    const seen = new Set();
    const cleaned = [];

    for (const r of rows) {
      const id = String(r.estimationId || "").trim();
      const place = String(r.propertyAddress || "").trim();

      if (!id) continue;
      if (seen.has(id)) continue;
      if (usedSet.has(id)) continue;

      seen.add(id);
      cleaned.push({
        estimationId: id,
        propertyAddress: place,
      });
    }

    return res.status(200).json({
      success: true,
      count: cleaned.length,
      data: cleaned,
    });
  } catch (error) {
    console.error("getInProgressEstimationIds error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch in-progress estimation Ids",
      error: error.message,
    });
  }
};

/* =====================================================
   CREATE — Create a new Estimation
   estimationId comes from the picked EstimationRequest.
   (Mirrors createSpecification, but links to a request)
===================================================== */
const createEstimation = async (req, res) => {
  try {
    const {
      estimationId,
      numberOfProperties,
      estimationSiteVisitDate,
      estimationReleaseDate,
      estimationFee,
      documentation,
      locationCoordinate,
      areaOfSite,
      estimationNumber,
      remark,
    } = req.body;

    if (!estimationId) {
      return res.status(400).json({
        success: false,
        message: "estimationId is required",
      });
    }

    if (!numberOfProperties || numberOfProperties < 1) {
      return res.status(400).json({
        success: false,
        message: "numberOfProperties is required and must be >= 1",
      });
    }

    const existing = await Estimation.findOne({ estimationId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An estimation already exists for this estimationId",
        data: existing,
      });
    }

    const estimation = await Estimation.create({
      estimationId,
      numberOfProperties,
      estimationSiteVisitDate,
      estimationReleaseDate,
      estimationFee,
      documentation,
      locationCoordinate,
      areaOfSite,
      estimationNumber,
      remark,
    });

    return res.status(201).json({
      success: true,
      message: "Estimation created successfully",
      data: estimation,
    });
  } catch (error) {
    console.error("createEstimation error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern || {}).join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get all Estimations (joined with EstimationRequest)
===================================================== */
const getAllEstimations = async (req, res) => {
  try {
    const estimations = await Estimation.aggregate([
      {
        $lookup: {
          from: EstimationRequest.collection.name,
          localField: "estimationId",
          foreignField: "estimationId",
          as: "estimationRequest",
        },
      },
      {
        $unwind: {
          path: "$estimationRequest",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          estimationId: 1,

          // Estimation fields
          numberOfProperties: 1,
          estimationSiteVisitDate: 1,
          estimationReleaseDate: 1,
          estimationFee: 1,
          documentation: 1,
          locationCoordinate: 1,
          areaOfSite: 1,
          estimationNumber: 1,
          remark: 1,

          // EstimationRequest fields
          requestingOrgan: "$estimationRequest.requestingOrgan",
          applicantName: "$estimationRequest.applicantName",
          propertyOwner: "$estimationRequest.propertyOwner",
          propertyAddress: "$estimationRequest.propertyAddress",
          purposeOfValuation: "$estimationRequest.purposeOfValuation",
          typeOfProperty: "$estimationRequest.typeOfProperty",
          requestDate: "$estimationRequest.requestDate",
          assignedBy: "$estimationRequest.assignedBy",
          assignedTo: "$estimationRequest.assignedTo",
          status: "$estimationRequest.status",

          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      count: estimations.length,
      data: estimations,
    });
  } catch (error) {
    console.error("getAllEstimations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimations",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get Estimation by ID
===================================================== */
const getEstimationById = async (req, res) => {
  try {
    const estimation = await Estimation.findById(req.params.id);

    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: estimation,
    });
  } catch (error) {
    console.error("getEstimationById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get Estimation by estimationId
===================================================== */
const getEstimationByEstimationId = async (req, res) => {
  try {
    const estimation = await Estimation.findOne({
      estimationId: req.params.estimationId,
    });

    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found for this estimationId",
      });
    }

    return res.status(200).json({
      success: true,
      data: estimation,
    });
  } catch (error) {
    console.error("getEstimationByEstimationId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE — Update Estimation by ID
===================================================== */
const updateEstimation = async (req, res) => {
  try {
    const estimation = await Estimation.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Estimation updated successfully",
      data: estimation,
    });
  } catch (error) {
    console.error("updateEstimation error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern || {}).join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE — Upsert by estimationId
===================================================== */
const upsertEstimationByEstimationId = async (req, res) => {
  try {
    const { estimationId } = req.params;

    const estimation = await Estimation.findOneAndUpdate(
      { estimationId },
      { $set: { ...req.body, estimationId } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Estimation saved successfully",
      data: estimation,
    });
  } catch (error) {
    console.error("upsertEstimationByEstimationId error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern || {}).join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE — Delete Estimation by ID
===================================================== */
const deleteEstimation = async (req, res) => {
  try {
    const estimation = await Estimation.findByIdAndDelete(req.params.id);

    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Estimation deleted successfully",
      data: estimation,
    });
  } catch (error) {
    console.error("deleteEstimation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE — Delete Estimation by estimationId
===================================================== */
const deleteEstimationByEstimationId = async (req, res) => {
  try {
    const estimation = await Estimation.findOneAndDelete({
      estimationId: req.params.estimationId,
    });

    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found for this estimationId",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Estimation deleted successfully",
      data: estimation,
    });
  } catch (error) {
    console.error("deleteEstimationByEstimationId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete estimation",
      error: error.message,
    });
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  getInProgressEstimationIds,
  createEstimation,
  getAllEstimations,
  getEstimationById,
  getEstimationByEstimationId,
  updateEstimation,
  upsertEstimationByEstimationId,
  deleteEstimation,
  deleteEstimationByEstimationId,
};