// controllers/EstimationRequestController.js
const { EstimationRequest, getNextEST } = require("../models/EstimationRequest");
const User = require("../models/User");
const mongoose = require("mongoose");

// =====================================================
// CREATE - Create a new estimation request
// =====================================================
const createEstimationRequest = async (req, res) => {
  try {
    const {
      requestingOrgan,
      applicantName,
      propertyOwner,
      propertyAddress,
      purposeOfValuation,
      typeOfProperty,
      assignedBy,
      assignedTo,
      status
    } = req.body;

    // Validate required fields
    if (!requestingOrgan || !applicantName || !propertyOwner || !propertyAddress) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: requestingOrgan, applicantName, propertyOwner, propertyAddress are required"
      });
    }

    // Create new estimation request (estimationId is generated
    // in the model's pre('save') hook via getNextEST())
    const estimationRequest = new EstimationRequest({
      requestingOrgan,
      applicantName,
      propertyOwner,
      propertyAddress,
      purposeOfValuation: purposeOfValuation || "not described",
      typeOfProperty: typeOfProperty || "not described",
      assignedBy: assignedBy || "",
      assignedTo: assignedTo || "",
      status: status || "Pending"
    });

    try {
      await estimationRequest.save();
    } catch (error) {
      // E11000 = duplicate key. Retry once with a fresh ID.
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
      data: estimationRequest
    });
  } catch (error) {
    console.error("Error creating estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create estimation request",
      error: error.message
    });
  }
};

// =====================================================
// READ - Get ALL estimation requests
// (no query params, no filtering, no pagination —
//  frontend fetches once and filters in memory)
// =====================================================
const getAllEstimationRequests = async (req, res) => {
  try {
    const estimationRequests = await EstimationRequest.find()
      .sort({ requestDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Estimation requests retrieved successfully",
      data: estimationRequests,
      count: estimationRequests.length
    });
  } catch (error) {
    console.error("Error fetching estimation requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch estimation requests",
      error: error.message
    });
  }
};

// =====================================================
// READ - Get single estimation request by ID
// =====================================================
const getEstimationRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID"
      });
    }

    const estimationRequest = await EstimationRequest.findById(id);

    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request retrieved successfully",
      data: estimationRequest
    });
  } catch (error) {
    console.error("Error fetching estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch estimation request",
      error: error.message
    });
  }
};

// =====================================================
// READ - Get estimation request by estimationId
// =====================================================
const getEstimationRequestByEstimationId = async (req, res) => {
  try {
    const { estimationId } = req.params;

    const estimationRequest = await EstimationRequest.findOne({ estimationId });

    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request retrieved successfully",
      data: estimationRequest
    });
  } catch (error) {
    console.error("Error fetching estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch estimation request",
      error: error.message
    });
  }
};

// =====================================================
// UPDATE - Update estimation request
// =====================================================
const updateEstimationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID"
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.estimationId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = [
        "Pending",
        "In Progress",
        "Completed",
        "Rejected",
        "Cancelled"
      ];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Must be one of: Pending, In Progress, Completed, Rejected, Cancelled"
        });
      }
    }

    const estimationRequest = await EstimationRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request updated successfully",
      data: estimationRequest
    });
  } catch (error) {
    console.error("Error updating estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update estimation request",
      error: error.message
    });
  }
};

// =====================================================
// UPDATE - Update status only
// =====================================================
const updateEstimationRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const validStatuses = [
      "Pending",
      "In Progress",
      "Completed",
      "Rejected",
      "Cancelled"
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be one of: Pending, In Progress, Completed, Rejected, Cancelled"
      });
    }

    const estimationRequest = await EstimationRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request status updated successfully",
      data: estimationRequest
    });
  } catch (error) {
    console.error("Error updating estimation request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update estimation request status",
      error: error.message
    });
  }
};

// =====================================================
// DELETE - Delete estimation request
// =====================================================
const deleteEstimationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid estimation request ID"
      });
    }

    const estimationRequest = await EstimationRequest.findByIdAndDelete(id);

    if (!estimationRequest) {
      return res.status(404).json({
        success: false,
        message: "Estimation request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Estimation request deleted successfully",
      data: estimationRequest
    });
  } catch (error) {
    console.error("Error deleting estimation request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete estimation request",
      error: error.message
    });
  }
};

// =====================================================
// GET - Get next estimation ID (utility)
// =====================================================
const getNextEstimationId = async (req, res) => {
  try {
    const nextId = await getNextEST();
    res.status(200).json({
      success: true,
      message: "Next estimation ID generated successfully",
      data: { nextEstimationId: nextId }
    });
  } catch (error) {
    console.error("Error generating next estimation ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate next estimation ID",
      error: error.message
    });
  }
};

// =====================================================
// GET - Get statistics/summary
// =====================================================
const getEstimationStatistics = async (req, res) => {
  try {
    const stats = await EstimationRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await EstimationRequest.countDocuments();

    const statusMap = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
      Rejected: 0,
      Cancelled: 0
    };

    stats.forEach((stat) => {
      statusMap[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        total,
        ...statusMap
      }
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
// GET - Get all users (for Assigned To dropdown)
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
  createEstimationRequest,
  getAllEstimationRequests,
  getEstimationRequestById,
  getEstimationRequestByEstimationId,
  updateEstimationRequest,
  updateEstimationRequestStatus,
  deleteEstimationRequest,
  getNextEstimationId,
  getEstimationStatistics,
  getUsers
};