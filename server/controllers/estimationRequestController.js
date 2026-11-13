// controllers/EstimationRequestController.js
const { EstimationRequest, getNextEST } = require("../models/EstimationRequest");
const Estimation = require("../models/Estimation");
const User = require("../models/User");
const mongoose = require("mongoose");

// =====================================================
// ROLE HELPERS (SUPER_ADMIN ignored per spec)
// =====================================================
const getRole = (req) =>
  String(req.user?.role || req.user?.userRole || "").toUpperCase();

const actorName = (req) => req.user?.name || "";
const actorUsername = (req) => req.user?.username || req.user?.name || "";
const actorId = (req) =>
  String(req.user?.id || req.user?._id || req.user?.sub || "");

// All admin roles behave identically for this module
const isAdminRole = (req) =>
  ["ALL_ADMIN", "EST_ADMIN", "DC_ADMIN"].includes(getRole(req));
const isViewOnly = (req) => getRole(req) === "ALL_VIEW";
const isUserRole = (req) => getRole(req) === "USER";

// Only ALL_VIEW sees everyone's records
const canViewAll = (req) => isViewOnly(req);

// Only admins create
const canCreate = (req) => isAdminRole(req);

// Owner check — creator of the request
const isOwner = (req, doc) => {
  const by = String(doc?.assignedBy || "").trim();
  if (!by) return false;
  return by === actorName(req) || by === actorUsername(req);
};

// Manage = admin + owner
const canManage = (req, doc) => isAdminRole(req) && isOwner(req, doc);

// Read access for a single doc
const canReadOne = (req, doc) => {
  if (isViewOnly(req)) return true;
  if (isAdminRole(req)) return isOwner(req, doc);
  if (isUserRole(req)) {
    const to = String(doc?.assignedTo || "").trim();
    return !!to && (to === actorUsername(req) || to === actorId(req));
  }
  return false;
};

// =====================================================
// CREATE — any admin
// =====================================================
const createEstimationRequest = async (req, res) => {
  try {
    if (!canCreate(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to create estimation requests",
      });
    }

    const {
      requestingOrgan,
      applicantName,
      propertyOwner,
      propertyAddress,
      purposeOfValuation,
      typeOfProperty,
      assignedTo,
      status,
    } = req.body;

    if (!requestingOrgan || !applicantName || !propertyOwner || !propertyAddress) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: requestingOrgan, applicantName, propertyOwner, propertyAddress are required",
      });
    }

    const estimationRequest = new EstimationRequest({
      requestingOrgan,
      applicantName,
      propertyOwner,
      propertyAddress,
      purposeOfValuation: purposeOfValuation || "not described",
      typeOfProperty: typeOfProperty || "not described",
      // Server always stamps the creator — client cannot spoof
      assignedBy: actorName(req) || actorUsername(req),
      assignedTo: assignedTo || "",
      status: status || "Pending",
    });

    try {
      await estimationRequest.save();
    } catch (error) {
      if (error && error.code === 11000 && error.message.includes("estimationId")) {
        estimationRequest.estimationId = undefined;
        await estimationRequest.save();
      } else {
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      message: "Estimation request created successfully",
      data: estimationRequest,
    });
  } catch (error) {
    console.error("Error creating estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create estimation request",
      error: error.message,
    });
  }
};

// =====================================================
// READ ALL — scoped by role
// - ADMIN roles → own only
// - ALL_VIEW    → everything
// - USER        → assigned only
// =====================================================
const getAllEstimationRequests = async (req, res) => {
  try {
    let filter = {};
    let scope = "all";

    if (isAdminRole(req)) {
      filter = {
        $or: [
          { assignedBy: actorName(req) },
          { assignedBy: actorUsername(req) },
        ],
      };
      scope = "own";
    } else if (isUserRole(req)) {
      filter = {
        $or: [
          { assignedTo: actorUsername(req) },
          { assignedTo: actorId(req) },
        ],
      };
      scope = "assigned";
    } else if (isViewOnly(req)) {
      filter = {};
      scope = "all";
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view estimation requests",
      });
    }

    const estimationRequests = await EstimationRequest.find(filter)
      .sort({ requestDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Estimation requests retrieved successfully",
      data: estimationRequests,
      count: estimationRequests.length,
      scope,
    });
  } catch (error) {
    console.error("Error fetching estimation requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch estimation requests",
      error: error.message,
    });
  }
};

// =====================================================
// READ ONE
// =====================================================
const getEstimationRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID",
      });
    }

    const estimationRequest = await EstimationRequest.findById(id);
    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found",
      });
    }

    if (!canReadOne(req, estimationRequest)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this request",
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request retrieved successfully",
      data: estimationRequest,
    });
  } catch (error) {
    console.error("Error fetching estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch estimation request",
      error: error.message,
    });
  }
};

// =====================================================
// READ BY estimationId
// =====================================================
const getEstimationRequestByEstimationId = async (req, res) => {
  try {
    const { estimationId } = req.params;

    const estimationRequest = await EstimationRequest.findOne({ estimationId });
    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found",
      });
    }

    if (!canReadOne(req, estimationRequest)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this request",
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request retrieved successfully",
      data: estimationRequest,
    });
  } catch (error) {
    console.error("Error fetching estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch estimation request",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE — owner only
// =====================================================
const updateEstimationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID",
      });
    }

    const existing = await EstimationRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found",
      });
    }

    if (!canManage(req, existing)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit requests you created",
      });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.estimationId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.assignedBy; // immutable

    if (updateData.status) {
      const validStatuses = ["Pending", "In Progress", "Completed", "Rejected", "Cancelled"];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Must be one of: Pending, In Progress, Completed, Rejected, Cancelled",
        });
      }
    }

    const updated = await EstimationRequest.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Estimation request updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update estimation request",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE STATUS — owner only
// =====================================================
const updateEstimationRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID",
      });
    }
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["Pending", "In Progress", "Completed", "Rejected", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be one of: Pending, In Progress, Completed, Rejected, Cancelled",
      });
    }

    const existing = await EstimationRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found",
      });
    }

    if (!canManage(req, existing)) {
      return res.status(403).json({
        success: false,
        message: "You can only update status for requests you created",
      });
    }

    const updated = await EstimationRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Estimation request status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating estimation request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update estimation request status",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE — owner only + cascade
// =====================================================
const deleteEstimationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID",
      });
    }

    const estimationRequest = await EstimationRequest.findById(id);
    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found",
      });
    }

    if (!canManage(req, estimationRequest)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete requests you created",
      });
    }

    const estimationId = estimationRequest.estimationId;
    await EstimationRequest.findByIdAndDelete(id);

    let deletedRelated = { estimation: 0 };
    if (estimationId) {
      const remaining = await EstimationRequest.countDocuments({ estimationId });
      if (remaining === 0) {
        const estRes = await Estimation.deleteMany({ estimationId });
        deletedRelated.estimation = estRes.deletedCount || 0;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Estimation request deleted successfully",
      data: estimationRequest,
      deletedRelated,
    });
  } catch (error) {
    console.error("Error deleting estimation request:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete estimation request",
      error: error.message,
    });
  }
};

// =====================================================
// GET next estimation ID
// =====================================================
const getNextEstimationId = async (req, res) => {
  try {
    const nextId = await getNextEST();
    res.status(200).json({
      success: true,
      message: "Next estimation ID generated successfully",
      data: { nextEstimationId: nextId },
    });
  } catch (error) {
    console.error("Error generating next estimation ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate next estimation ID",
      error: error.message,
    });
  }
};

// =====================================================
// GET statistics
// =====================================================
const getEstimationStatistics = async (req, res) => {
  try {
    const stats = await EstimationRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const total = await EstimationRequest.countDocuments();

    const statusMap = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
      Rejected: 0,
      Cancelled: 0,
    };

    stats.forEach((stat) => {
      statusMap[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: { total, ...statusMap },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

// =====================================================
// GET users (Assigned To dropdown)
// =====================================================
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "USER", enabled: true })
      .select("name username role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

module.exports = {
  createEstimationRequest,
  getAllEstimationRequests,
  getEstimationRequestById,
  getEstimationRequestByEstimationId,
  updateEstimationRequest,
  updateEstimationRequestStatus,
  deleteEstimationRequest,
  getNextEstimationId,
  getEstimationStatistics,
  getUsers,
};