// controllers/specificationController.js
const Specification = require("../models/Specification");
const { DCRequest } = require("../models/DCRequest");

/* =====================================================
   READ — Distinct DCIds from DCRequest where status = "In Progress"
   that DO NOT yet have a Specification.
===================================================== */
const getInProgressDCIds = async (req, res) => {
  try {
    console.log("vvvv zxx");
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

    const usedDCIds = await Specification.distinct("DCId");

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
   CREATE — Create a new Specification
===================================================== */
const createSpecification = async (req, res) => {
  try {
    console.log("vvvv zxx");
    const {
      DCId,
      siteVisitDate,
      siteVisitPurpose,
      specReleaseDate,
      branchHandOverDate,
      acceptedBy,
      remark,
    } = req.body;

    if (!DCId) {
      return res.status(400).json({
        success: false,
        message: "DCId is required",
      });
    }

    const existing = await Specification.findOne({ DCId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A specification already exists for this DCId",
        data: existing,
      });
    }

    const spec = await Specification.create({
      DCId,
      siteVisitDate,
      siteVisitPurpose,
      specReleaseDate,
      branchHandOverDate,
      acceptedBy,
      remark,
    });

    return res.status(201).json({
      success: true,
      message: "Specification created successfully",
      data: spec,
    });
  } catch (error) {
    console.error("createSpecification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create specification",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get all Specifications (joined with DCRequest)
===================================================== */
const getAllSpecifications = async (req, res) => {
  try {
    const specs = await Specification.aggregate([
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

          // Specification fields
          siteVisitDate: 1,
          siteVisitPurpose: 1,
          specReleaseDate: 1,
          branchHandOverDate: 1,
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
      count: specs.length,
      data: specs,
    });
  } catch (error) {
    console.error("getAllSpecifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch specifications",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get Specification by ID
===================================================== */
const getSpecificationById = async (req, res) => {
  try {
    const spec = await Specification.findById(req.params.id);

    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: spec,
    });
  } catch (error) {
    console.error("getSpecificationById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch specification",
      error: error.message,
    });
  }
};

/* =====================================================
   READ — Get Specification by DCId
===================================================== */
const getSpecificationByDCId = async (req, res) => {
  try {
    const spec = await Specification.findOne({
      DCId: req.params.dcId,
    });

    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found for this DCId",
      });
    }

    return res.status(200).json({
      success: true,
      data: spec,
    });
  } catch (error) {
    console.error("getSpecificationByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch specification",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE — Update Specification by ID
===================================================== */
const updateSpecification = async (req, res) => {
  try {
    const spec = await Specification.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Specification updated successfully",
      data: spec,
    });
  } catch (error) {
    console.error("updateSpecification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update specification",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE — Upsert by DCId
===================================================== */
const upsertSpecificationByDCId = async (req, res) => {
  try {
    const { dcId } = req.params;

    const spec = await Specification.findOneAndUpdate(
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
      message: "Specification saved successfully",
      data: spec,
    });
  } catch (error) {
    console.error("upsertSpecificationByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save specification",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE — Delete Specification by ID
===================================================== */
const deleteSpecification = async (req, res) => {
  try {
    const spec = await Specification.findByIdAndDelete(req.params.id);

    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Specification deleted successfully",
      data: spec,
    });
  } catch (error) {
    console.error("deleteSpecification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete specification",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE — Delete Specification by DCId
===================================================== */
const deleteSpecificationByDCId = async (req, res) => {
  try {
    const spec = await Specification.findOneAndDelete({
      DCId: req.params.dcId,
    });

    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found for this DCId",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Specification deleted successfully",
      data: spec,
    });
  } catch (error) {
    console.error("deleteSpecificationByDCId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete specification",
      error: error.message,
    });
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  getInProgressDCIds,
  createSpecification,
  getAllSpecifications,
  getSpecificationById,
  getSpecificationByDCId,
  updateSpecification,
  upsertSpecificationByDCId,
  deleteSpecification,
  deleteSpecificationByDCId,
};