// controllers/DCRequestController.js
const { DCRequest, getNextDC } = require("../models/DCRequest");
const Design = require("../models/Design");
const Specification = require("../models/Specification");
const Construction = require("../models/Construction");
const User = require("../models/User");
const mongoose = require("mongoose");

// =====================================================
// ROLE HELPERS (EST_ADMIN removed)
// =====================================================
const getRole = (req) =>
  String(req.user?.role || req.user?.userRole || "").toUpperCase();

const actorName = (req) => req.user?.name || "";
const actorUsername = (req) => req.user?.username || req.user?.name || "";
const actorId = (req) =>
  String(req.user?.id || req.user?._id || req.user?.sub || "");

// Admin roles for this module: ALL_ADMIN and DC_ADMIN only
const isAdminRole = (req) =>
  ["ALL_ADMIN", "DC_ADMIN"].includes(getRole(req));
const isViewOnly = (req) => getRole(req) === "ALL_VIEW";
const isUserRole = (req) => getRole(req) === "USER";

const isOwner = (req, doc) => {
  const by = String(doc?.assignedBy || "").trim();
  if (!by) return false;
  return by === actorName(req) || by === actorUsername(req);
};

const canCreate = (req) => isAdminRole(req);
const canManage = (req, doc) => isAdminRole(req) && isOwner(req, doc);

const canReadOne = (req, doc) => {
  if (isViewOnly(req)) return true;
  if (isAdminRole(req)) return isOwner(req, doc);
  if (isUserRole(req)) {
    const to = String(doc?.assignedTo || "").trim();
    return !!to && (to === actorUsername(req) || to === actorId(req));
  }
  return false;
};

const readAllScope = (req) => {
  if (isAdminRole(req)) {
    return {
      scope: "own",
      filter: {
        $or: [{ assignedBy: actorName(req) }, { assignedBy: actorUsername(req) }],
      },
    };
  }
  if (isUserRole(req)) {
    return {
      scope: "assigned",
      filter: {
        $or: [{ assignedTo: actorUsername(req) }, { assignedTo: actorId(req) }],
      },
    };
  }
  if (isViewOnly(req)) return { scope: "all", filter: {} };
  return null;
};

const VALID_STATUSES = ["Pending", "In Progress", "Completed", "Rejected", "Cancelled"];

// =====================================================
// CREATE — admins only; assignedBy server-stamped
// =====================================================
const createDCRequest = async (req, res) => {
  try {
    if (!canCreate(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to create DC requests",
      });
    }

    const {
      requestingOrgan,
      requestType,
      requestDate,
      placeofSite,
      assignedTo,
      status,
    } = req.body;

    if (!requestingOrgan || !requestType || !placeofSite) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: requestingOrgan, requestType, and placeofSite are required",
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const dcRequest = new DCRequest({
      requestingOrgan,
      requestType,
      requestDate: requestDate ? new Date(requestDate) : new Date(),
      placeofSite,
      assignedBy: actorName(req) || actorUsername(req), // server-stamped
      assignedTo: assignedTo || "",
      status: status || "Pending",
    });

    try {
      await dcRequest.save();
    } catch (error) {
      // E11000 = duplicate key. Retry once with a fresh DCId.
      if (error && error.code === 11000 && error.message.includes("DCId")) {
        dcRequest.DCId = undefined;
        await dcRequest.save();
      } else {
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      message: "DC request created successfully",
      data: dcRequest,
    });
  } catch (error) {
    console.error("Error creating DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create DC request",
      error: error.message,
    });
  }
};

// =====================================================
// READ ALL — scoped: ADMIN→own, USER→assigned, ALL_VIEW→all
// =====================================================
const getAllDCRequests = async (req, res) => {
  try {
    const scoped = readAllScope(req);
    if (!scoped) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view DC requests",
      });
    }

    const dcRequests = await DCRequest.find(scoped.filter)
      .sort({ requestDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "DC requests retrieved successfully",
      data: dcRequests,
      count: dcRequests.length,
      scope: scoped.scope,
    });
  } catch (error) {
    console.error("Error fetching DC requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DC requests",
      error: error.message,
    });
  }
};

// =====================================================
// READ ONE — by Mongo _id
// =====================================================
const getDCRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID",
      });
    }

    const dcRequest = await DCRequest.findById(id);

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found",
      });
    }

    if (!canReadOne(req, dcRequest)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this request",
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request retrieved successfully",
      data: dcRequest,
    });
  } catch (error) {
    console.error("Error fetching DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DC request",
      error: error.message,
    });
  }
};

// =====================================================
// READ ONE — by DCId (e.g. DCREQ-001)
// =====================================================
const getDCRequestByDCId = async (req, res) => {
  try {
    const { dcId } = req.params;

    const dcRequest = await DCRequest.findOne({ DCId: dcId });

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found",
      });
    }

    if (!canReadOne(req, dcRequest)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this request",
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request retrieved successfully",
      data: dcRequest,
    });
  } catch (error) {
    console.error("Error fetching DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DC request",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE — owner only
// =====================================================
const updateDCRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID",
      });
    }

    const existing = await DCRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "DC request not found",
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
    delete updateData.DCId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.assignedBy; // immutable

    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    if (updateData.requestDate) {
      updateData.requestDate = new Date(updateData.requestDate);
    }

    const updated = await DCRequest.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "DC request updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update DC request",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE STATUS — owner only
// =====================================================
const updateDCRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const existing = await DCRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "DC request not found",
      });
    }

    if (!canManage(req, existing)) {
      return res.status(403).json({
        success: false,
        message: "You can only update status for requests you created",
      });
    }

    const updated = await DCRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "DC request status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating DC request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update DC request status",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE — owner only + cascade
// =====================================================
const deleteDCRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID",
      });
    }

    const dcRequest = await DCRequest.findById(id);
    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found",
      });
    }

    if (!canManage(req, dcRequest)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete requests you created",
      });
    }

    const dcId = dcRequest.DCId;
    await DCRequest.findByIdAndDelete(id);

    let deletedRelated = { design: 0, specification: 0, construction: 0 };
    if (dcId) {
      const [designRes, specRes, constrRes] = await Promise.all([
        Design.deleteMany({ DCId: dcId }),
        Specification.deleteMany({ DCId: dcId }),
        Construction.deleteMany({ DCId: dcId }),
      ]);
      deletedRelated = {
        design: designRes.deletedCount || 0,
        specification: specRes.deletedCount || 0,
        construction: constrRes.deletedCount || 0,
      };
    }

    return res.status(200).json({
      success: true,
      message: "DC request and related records deleted successfully",
      data: dcRequest,
      deletedRelated,
    });
  } catch (error) {
    console.error("Error deleting DC request:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete DC request",
      error: error.message,
    });
  }
};

// =====================================================
// GET next DC ID
// =====================================================
const getNextDCId = async (req, res) => {
  try {
    const nextId = await getNextDC();
    res.status(200).json({
      success: true,
      message: "Next DC ID generated successfully",
      data: { nextDCId: nextId },
    });
  } catch (error) {
    console.error("Error generating next DC ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate next DC ID",
      error: error.message,
    });
  }
};

// =====================================================
// GET statistics
// =====================================================
const getDCStatistics = async (req, res) => {
  try {
    const stats = await DCRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const total = await DCRequest.countDocuments();

    const statusMap = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
      Rejected: 0,
      Cancelled: 0,
    };

    stats.forEach((stat) => {
      if (stat._id in statusMap) statusMap[stat._id] = stat.count;
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
    const users = await User.find({
      role: { $in: ["USER", "DC_ADMIN", "EST_ADMIN", "ALL_ADMIN"] },
      enabled: true,
    })
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

// =====================================================
// EXPORT ALL CONTROLLERS
// =====================================================
module.exports = {
  createDCRequest,
  getAllDCRequests,
  getDCRequestById,
  getDCRequestByDCId,
  updateDCRequest,
  updateDCRequestStatus,
  deleteDCRequest,
  getNextDCId,
  getDCStatistics,
  getUsers,
};