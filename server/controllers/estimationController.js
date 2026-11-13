// controllers/estimationController.js
const Estimation = require("../models/Estimation");
const { EstimationRequest } = require("../models/EstimationRequest");

/* =====================================================
   Role/identity helpers
===================================================== */
const getRole = (user) =>
  String(user?.role ?? user?.userRole ?? "").trim().toUpperCase();

const getUsername = (user) => {
  if (!user) return "";
  return String(user.username || user.name || user.email || "").trim();
};

const isUserRole    = (role) => role === "USER";
const isAllViewRole = (role) => role === "ALL_VIEW";
const isAdminRole   = (role) => role === "EST_ADMIN" || role === "ALL_ADMIN";

/* =====================================================
   READ — In-Progress estimationIds without an Estimation
===================================================== */
const getInProgressEstimationIds = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    const filter = { status: "In Progress" };

    if (isUserRole(role)) {
      if (!username) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.assignedTo = username;
    } else if (isAdminRole(role)) {
      if (!username) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.assignedBy = username;
    } else if (isAllViewRole(role)) {
      // sees all In-Progress requests
    } else {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const rows = await EstimationRequest.find(filter, {
      estimationId: 1,
      propertyAddress: 1,
      _id: 0,
    })
      .sort({ estimationId: 1 })
      .lean();

    if (!rows.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
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
      if (!id || seen.has(id) || usedSet.has(id)) continue;
      seen.add(id);
      cleaned.push({ estimationId: id, propertyAddress: place });
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
   CREATE — USER only, own assigned request
===================================================== */
const createEstimation = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    if (!isUserRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Your role is not allowed to create estimations",
      });
    }

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
      return res
        .status(400)
        .json({ success: false, message: "estimationId is required" });
    }
    if (!numberOfProperties || numberOfProperties < 1) {
      return res.status(400).json({
        success: false,
        message: "numberOfProperties is required and must be >= 1",
      });
    }
    if (!username) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const ownsRequest = await EstimationRequest.exists({
      estimationId,
      assignedTo: username,
    });

    if (!ownsRequest) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to create an estimation for this estimationId",
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
      createdBy: username,
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
   USER      → assignedTo === username
   ADMINS    → assignedBy === username
   ALL_VIEW  → everything
===================================================== */
const getAllEstimations = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    const pipeline = [
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
    ];

    if (isUserRole(role)) {
      if (!username) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      pipeline.push({
        $match: { "estimationRequest.assignedTo": username },
      });
    } else if (isAdminRole(role)) {
      if (!username) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      pipeline.push({
        $match: { "estimationRequest.assignedBy": username },
      });
    } else if (isAllViewRole(role)) {
      // no filter → sees everything
    } else {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    pipeline.push(
      {
        $project: {
          _id: 1,
          estimationId: 1,
          createdBy: 1,

          numberOfProperties: 1,
          estimationSiteVisitDate: 1,
          estimationReleaseDate: 1,
          estimationFee: 1,
          documentation: 1,
          locationCoordinate: 1,
          areaOfSite: 1,
          estimationNumber: 1,
          remark: 1,

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
      { $sort: { createdAt: -1 } }
    );

    const estimations = await Estimation.aggregate(pipeline);

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
    const role = getRole(req.user);
    const username = getUsername(req.user);

    const estimation = await Estimation.findById(req.params.id);
    if (!estimation) {
      return res
        .status(404)
        .json({ success: false, message: "Estimation not found" });
    }

    if (isAllViewRole(role)) {
      return res.status(200).json({ success: true, data: estimation });
    }

    if (isUserRole(role)) {
      const owns = username
        ? await EstimationRequest.exists({
            estimationId: estimation.estimationId,
            assignedTo: username,
          })
        : null;
      if (!owns) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this estimation",
        });
      }
      return res.status(200).json({ success: true, data: estimation });
    }

    if (isAdminRole(role)) {
      const owns = username
        ? await EstimationRequest.exists({
            estimationId: estimation.estimationId,
            assignedBy: username,
          })
        : null;
      if (!owns) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this estimation",
        });
      }
      return res.status(200).json({ success: true, data: estimation });
    }

    return res.status(403).json({
      success: false,
      message: "Not authorized to view this estimation",
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
    const role = getRole(req.user);
    const username = getUsername(req.user);

    const estimation = await Estimation.findOne({
      estimationId: req.params.estimationId,
    });
    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found for this estimationId",
      });
    }

    if (isAllViewRole(role)) {
      return res.status(200).json({ success: true, data: estimation });
    }

    if (isUserRole(role)) {
      const owns = username
        ? await EstimationRequest.exists({
            estimationId: estimation.estimationId,
            assignedTo: username,
          })
        : null;
      if (!owns) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this estimation",
        });
      }
      return res.status(200).json({ success: true, data: estimation });
    }

    if (isAdminRole(role)) {
      const owns = username
        ? await EstimationRequest.exists({
            estimationId: estimation.estimationId,
            assignedBy: username,
          })
        : null;
      if (!owns) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this estimation",
        });
      }
      return res.status(200).json({ success: true, data: estimation });
    }

    return res.status(403).json({
      success: false,
      message: "Not authorized to view this estimation",
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
   UPDATE — USER only, own assigned request
===================================================== */
const updateEstimation = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    if (!isUserRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Your role is not allowed to edit estimations",
      });
    }

    const { status, ...estimationFields } = req.body || {};

    const estimation = await Estimation.findById(req.params.id);
    if (!estimation) {
      return res
        .status(404)
        .json({ success: false, message: "Estimation not found" });
    }

    const owns = username
      ? await EstimationRequest.exists({
          estimationId: estimation.estimationId,
          assignedTo: username,
        })
      : null;
    if (!owns) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this estimation",
      });
    }

    let updatedRequest = null;

    if (status !== undefined) {
      if (!["In Progress", "Completed", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Allowed values: In Progress, Completed, Rejected",
        });
      }

      const request = await EstimationRequest.findOne({
        estimationId: estimation.estimationId,
      });
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Linked EstimationRequest not found for this estimationId",
        });
      }
      if (request.status !== "In Progress") {
        return res.status(403).json({
          success: false,
          message: `Status cannot be changed because the request is already "${request.status}". Only "In Progress" requests can be modified.`,
        });
      }
      request.status = status;
      updatedRequest = await request.save();
    }

    delete estimationFields._id;
    delete estimationFields.estimationId;
    delete estimationFields.createdBy;

    const updatedEstimation = await Estimation.findByIdAndUpdate(
      req.params.id,
      { $set: estimationFields },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Estimation updated successfully",
      data: updatedEstimation,
      ...(updatedRequest && { requestStatus: updatedRequest.status }),
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
   UPDATE — Upsert (USER only)
===================================================== */
const upsertEstimationByEstimationId = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    if (!isUserRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Your role is not allowed to edit estimations",
      });
    }

    const { estimationId } = req.params;
    const { status, ...estimationFields } = req.body || {};

    const owns = username
      ? await EstimationRequest.exists({
          estimationId,
          assignedTo: username,
        })
      : null;
    if (!owns) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to save this estimation",
      });
    }

    let updatedRequest = null;

    if (status !== undefined) {
      if (!["In Progress", "Completed", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Allowed values: In Progress, Completed, Rejected",
        });
      }
      const request = await EstimationRequest.findOne({ estimationId });
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Linked EstimationRequest not found for this estimationId",
        });
      }
      if (request.status !== "In Progress") {
        return res.status(403).json({
          success: false,
          message: `Status cannot be changed because the request is already "${request.status}". Only "In Progress" requests can be modified.`,
        });
      }
      request.status = status;
      updatedRequest = await request.save();
    }

    delete estimationFields._id;
    delete estimationFields.createdBy;

    const existing = await Estimation.findOne({ estimationId });
    const estimation = existing
      ? await Estimation.findByIdAndUpdate(
          existing._id,
          { $set: estimationFields },
          { new: true, runValidators: true }
        )
      : await Estimation.create({
          ...estimationFields,
          estimationId,
          createdBy: username,
        });

    return res.status(200).json({
      success: true,
      message: "Estimation saved successfully",
      data: estimation,
      ...(updatedRequest && { requestStatus: updatedRequest.status }),
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
   DELETE — EST_ADMIN / ALL_ADMIN only, own createdBy only
===================================================== */
const deleteEstimation = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    if (!isAdminRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Your role is not allowed to delete estimations",
      });
    }

    const estimation = await Estimation.findById(req.params.id);
    if (!estimation) {
      return res
        .status(404)
        .json({ success: false, message: "Estimation not found" });
    }

    if (estimation.createdBy !== username) {
      return res.status(403).json({
        success: false,
        message: "You can only delete estimations you created",
      });
    }

    await Estimation.findByIdAndDelete(req.params.id);

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
   DELETE — By estimationId (admins, own createdBy only)
===================================================== */
const deleteEstimationByEstimationId = async (req, res) => {
  try {
    const role = getRole(req.user);
    const username = getUsername(req.user);

    if (!isAdminRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Your role is not allowed to delete estimations",
      });
    }

    const estimation = await Estimation.findOne({
      estimationId: req.params.estimationId,
    });
    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: "Estimation not found for this estimationId",
      });
    }

    if (estimation.createdBy !== username) {
      return res.status(403).json({
        success: false,
        message: "You can only delete estimations you created",
      });
    }

    await Estimation.findOneAndDelete({
      estimationId: req.params.estimationId,
    });

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