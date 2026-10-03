// models/EstimationRequest.js
const mongoose = require("mongoose");

const estimationRequestSchema = new mongoose.Schema(
  {
    estimationId: {
      type: String,
      unique: true,
      trim: true,
      default: "",
    },

    requestingOrgan: {
      type: String,
      required: true,
      trim: true,
      default: ""
    },

    requestDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    applicantName: {
      type: String,
      required: true,
      trim: true
    },

    propertyOwner: {
      type: String,
      required: true,
      trim: true
    },

    propertyAddress: {
      type: String,
      required: true,
      trim: true
    },

    purposeOfValuation: {
      type: String,
      required: true,
      default: "not described"
    },

    typeOfProperty: {
      type: String,
      required: true,
      default: "not described"
    },

    assignedBy: {
      type: String,
      trim: true,
      default: ""
    },

    assignedTo: {
      type: String,
      trim: true,
      default: ""
    },

    status: {
      type: String,
      required: true,
      enum: ["In Progress", "Completed", "Rejected", "Cancelled"],
      default: "In Progress"
    }
  },
  {
    timestamps: true
  }
);

/* =====================================================
   GET NEXT ESTIMATION NUMBER
   Sorts by createdAt (newest first), extracts the number
   from the newest doc's estimationId, and adds 1.
===================================================== */
const getNextEST = async () => {
  try {
    const lastDoc = await mongoose
      .model("EstimationRequest")
      .findOne(
        { estimationId: { $regex: /^ESTREQ-/ } },
        { estimationId: 1, createdAt: 1 }
      )
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;

    if (lastDoc?.estimationId) {
      const parsed = parseInt(
        lastDoc.estimationId.replace("ESTREQ-", ""),
        10
      );
      if (!Number.isNaN(parsed)) nextNumber = parsed + 1;
    }

    const formattedNumber =
      nextNumber < 100
        ? String(nextNumber).padStart(3, "0")
        : String(nextNumber);

    return `ESTREQ-${formattedNumber}`;
  } catch (error) {
    console.error("Error generating next EST number:", error);
    throw error;
  }
};

/* =====================================================
   PRE-SAVE — auto-generate estimationId
===================================================== */
estimationRequestSchema.pre("save", async function (next) {
  if (!this.estimationId || this.isNew) {
    this.estimationId = this.estimationId || (await getNextEST());
  }
  next();
});

/* =====================================================
   INDEXES
===================================================== */
estimationRequestSchema.index({ status: 1 });
estimationRequestSchema.index({ assignedTo: 1 });
estimationRequestSchema.index({ requestDate: -1 });
estimationRequestSchema.index({ createdAt: -1 });   // ← supports the new sort

const EstimationRequest = mongoose.model(
  "EstimationRequest",
  estimationRequestSchema
);

module.exports = {
  EstimationRequest,
  getNextEST
};