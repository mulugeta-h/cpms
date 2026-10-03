// controllers/specificationController.js
const Specification = require("../models/Specification");
const { EstimationRequest } = require("../models/EstimationRequest");
const mongoose = require("mongoose");

/* =====================================================
   GET ALL SPECIFICATIONS
   Joins with EstimationRequest for requestingOrgan,
   requestDate, applicantName, propertyOwner, propertyAddress,
   purposeOfValuation, typeOfProperty, assignedBy,
   assignedTo, status.
===================================================== */
const getAllSpecifications = async (req, res) => {
  try {
    const specs = await Specification.aggregate([
      {
        $lookup: {
          from: EstimationRequest.collection.name,
          localField: "estimationId",
          foreignField: "estimationId",
          as: "estimation",
        },
      },
      {
        $unwind: {
          path: "$estimation",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          estimationId: 1,

          // Specification fields
          siteVisitDate: 1,
          siteVisitPurpose: 1,
          specReleaseDate: 1,
          branchHandOverDate: 1,
          acceptedBy: 1,
          remark: 1,

          // EstimationRequest fields
          requestingOrgan: "$estimation.requestingOrgan",
          requestDate: "$estimation.requestDate",
          applicantName: "$estimation.applicantName",
          propertyOwner: "$estimation.propertyOwner",
          propertyAddress: "$estimation.propertyAddress",
          purposeOfValuation: "$estimation.purposeOfValuation",
          typeOfProperty: "$estimation.typeOfProperty",
          assignedBy: "$estimation.assignedBy",
          assignedTo: "$estimation.assignedTo",
          status: "$estimation.status",

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
   GET IN-PROGRESS ESTIMATION IDS (for dropdown)
   In-progress estimations that don't yet have a Specification.
===================================================== */
const getInProgressEstimationIds = async (req, res) => {
  try {
    const existingIds = await Specification.distinct("estimationId");

    const list = await EstimationRequest.find(
      {
        status: "In Progress",
        estimationId: { $nin: existingIds, $ne: "" },
      },
      { estimationId: 1, applicantName: 1, propertyAddress: 1, _id: 0 }
    ).lean();

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error("getInProgressEstimationIds error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch in-progress estimation ids",
      error: error.message,
    });
  }
};

/* =====================================================
   CREATE SPECIFICATION
===================================================== */
const createSpecification = async (req, res) => {
  try {
    const {
      estimationId,
      siteVisitDate,
      siteVisitPurpose,
      specReleaseDate,
      branchHandOverDate,
      remark,
    } = req.body;

    if (!estimationId || !estimationId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Estimation Id is required",
      });
    }

    const existing = await Specification.findOne({
      estimationId: estimationId.trim(),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A specification already exists for this Estimation Id",
      });
    }

    const spec = new Specification({
      estimationId: estimationId.trim(),
      siteVisitDate: siteVisitDate || null,
      siteVisitPurpose: siteVisitPurpose || "",
      specReleaseDate: specReleaseDate || null,
      branchHandOverDate: branchHandOverDate || null,
      remark: remark || "",
    });

    await spec.save();

    return res.status(201).json({
      success: true,
      message: "Specification created successfully",
      data: spec,
    });
  } catch (error) {
    console.error("createSpecification error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A specification already exists for this Estimation Id",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create specification",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE SPECIFICATION
===================================================== */
const updateSpecification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid specification id",
      });
    }

    const {
      estimationId,
      siteVisitDate,
      siteVisitPurpose,
      specReleaseDate,
      branchHandOverDate,
      acceptedBy,
      remark,
    } = req.body;

    const spec = await Specification.findById(id);
    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found",
      });
    }

    if (estimationId !== undefined) spec.estimationId = estimationId;
    if (siteVisitDate !== undefined)
      spec.siteVisitDate = siteVisitDate || null;
    if (siteVisitPurpose !== undefined)
      spec.siteVisitPurpose = siteVisitPurpose || "";
    if (specReleaseDate !== undefined)
      spec.specReleaseDate = specReleaseDate || null;
    if (branchHandOverDate !== undefined)
      spec.branchHandOverDate = branchHandOverDate || null;
    if (acceptedBy !== undefined) spec.acceptedBy = acceptedBy || "";
    if (remark !== undefined) spec.remark = remark || "";

    await spec.save();

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
   DELETE SPECIFICATION
===================================================== */
const deleteSpecification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid specification id",
      });
    }

    const spec = await Specification.findByIdAndDelete(id);
    if (!spec) {
      return res.status(404).json({
        success: false,
        message: "Specification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Specification deleted successfully",
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

module.exports = {
  getAllSpecifications,
  getInProgressEstimationIds,
  createSpecification,
  updateSpecification,
  deleteSpecification,
};