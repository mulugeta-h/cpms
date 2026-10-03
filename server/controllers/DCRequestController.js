// controllers/DCRequestController.js
const { DCRequest, getNextDC } = require("../models/DCRequest");
const User = require("../models/User");
const mongoose = require("mongoose");

const VALID_STATUSES = [
  "Pending",
  "In Progress",
  "Completed",
  "Rejected",
  "Cancelled"
];

// =====================================================
// CREATE - Create a new DC request
// =====================================================
const createDCRequest = async (req, res) => {
  try {
    const {
      requestingOrgan,
      requestType,
      requestDate,
      placeofSite,
      assignedBy,
      assignedTo,
      status
    } = req.body;

    // Validate required fields
    if (!requestingOrgan || !requestType || !placeofSite) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: requestingOrgan, requestType, and placeofSite are required"
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      });
    }

    const dcRequest = new DCRequest({
      requestingOrgan,
      requestType,
      requestDate: requestDate ? new Date(requestDate) : new Date(),
      placeofSite,
      assignedBy: assignedBy || "",
      assignedTo: assignedTo || "",
      status: status || "Pending"
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
      data: dcRequest
    });
  } catch (error) {
    console.error("Error creating DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create DC request",
      error: error.message
    });
  }
};

// =====================================================
// READ - Get ALL DC requests
// =====================================================
const getAllDCRequests = async (req, res) => {
  try {
    const dcRequests = await DCRequest.find()
      .sort({ requestDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "DC requests retrieved successfully",
      data: dcRequests,
      count: dcRequests.length
    });
  } catch (error) {
    console.error("Error fetching DC requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DC requests",
      error: error.message
    });
  }
};

// =====================================================
// READ - Get single DC request by Mongo _id
// =====================================================
const getDCRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID"
      });
    }

    const dcRequest = await DCRequest.findById(id);

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request retrieved successfully",
      data: dcRequest
    });
  } catch (error) {
    console.error("Error fetching DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DC request",
      error: error.message
    });
  }
};

// =====================================================
// READ - Get DC request by DCId (e.g. DCREQ-001)
// =====================================================
const getDCRequestByDCId = async (req, res) => {
  try {
    const { dcId } = req.params;

    const dcRequest = await DCRequest.findOne({ DCId: dcId });

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request retrieved successfully",
      data: dcRequest
    });
  } catch (error) {
    console.error("Error fetching DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DC request",
      error: error.message
    });
  }
};

// =====================================================
// UPDATE - Update DC request
// =====================================================
const updateDCRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID"
      });
    }

    // Remove immutable fields
    delete updateData._id;
    delete updateData.DCId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Validate status if provided
    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      });
    }

    if (updateData.requestDate) {
      updateData.requestDate = new Date(updateData.requestDate);
    }

    const dcRequest = await DCRequest.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request updated successfully",
      data: dcRequest
    });
  } catch (error) {
    console.error("Error updating DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update DC request",
      error: error.message
    });
  }
};

// =====================================================
// UPDATE - Update status only
// =====================================================
const updateDCRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      });
    }

    const dcRequest = await DCRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request status updated successfully",
      data: dcRequest
    });
  } catch (error) {
    console.error("Error updating DC request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update DC request status",
      error: error.message
    });
  }
};

// =====================================================
// DELETE - Delete DC request
// =====================================================
const deleteDCRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid DC request ID"
      });
    }

    const dcRequest = await DCRequest.findByIdAndDelete(id);

    if (!dcRequest) {
      return res.status(404).json({
        success: false,
        message: "DC request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "DC request deleted successfully",
      data: dcRequest
    });
  } catch (error) {
    console.error("Error deleting DC request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete DC request",
      error: error.message
    });
  }
};

// =====================================================
// GET - Next DC ID (utility)
// =====================================================
const getNextDCId = async (req, res) => {
  try {
    const nextId = await getNextDC();
    res.status(200).json({
      success: true,
      message: "Next DC ID generated successfully",
      data: { nextDCId: nextId }
    });
  } catch (error) {
    console.error("Error generating next DC ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate next DC ID",
      error: error.message
    });
  }
};

// =====================================================
// GET - Statistics / summary
// =====================================================
const getDCStatistics = async (req, res) => {
  try {
    const stats = await DCRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const total = await DCRequest.countDocuments();

    const statusMap = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
      Rejected: 0,
      Cancelled: 0
    };

    stats.forEach((stat) => {
      if (stat._id in statusMap) statusMap[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: { total, ...statusMap }
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message
    });
  }
};

// =====================================================
// GET - All users (for Assigned To dropdown)
// =====================================================
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "USER" })
      .select("-password -__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
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
  getUsers
};