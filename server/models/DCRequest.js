// models/DCRequest.js
const mongoose = require("mongoose");

const DCRequestSchema = new mongoose.Schema(
  {
    DCId: {
      type: String,
      unique: true,
      trim: true,
      default: "",
      index: true
    },

    requestingOrgan: {
      type: String,
      required: true,
      trim: true,
      default: ""
    },

    requestType: {
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

    placeofSite: {
      type: String,
      required: true,
      trim: true,
      default: ""
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
   GET NEXT DC NUMBER
   Sorts by createdAt (newest first), extracts the number
   from the newest doc's DCId, and adds 1.
===================================================== */
const getNextDC = async () => {
  try {
    const lastDoc = await mongoose
      .model("DCRequest")
      .findOne(
        { DCId: { $regex: /^DCREQ-/ } },
        { DCId: 1, createdAt: 1 }
      )
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;

    if (lastDoc?.DCId) {
      const parsed = parseInt(lastDoc.DCId.replace("DCREQ-", ""), 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed + 1;
    }

    const formattedNumber =
      nextNumber < 100
        ? String(nextNumber).padStart(3, "0")
        : String(nextNumber);

    return `DCREQ-${formattedNumber}`;
  } catch (error) {
    console.error("Error generating next DC number:", error);
    throw error;
  }
};

/* =====================================================
   PRE-SAVE — auto-generate DCId
===================================================== */
DCRequestSchema.pre("save", async function (next) {
  if (!this.DCId || this.isNew) {
    this.DCId = this.DCId || (await getNextDC());
  }
  next();
});

/* =====================================================
   INDEXES (declared on the SCHEMA, not the model)
===================================================== */
DCRequestSchema.index({ createdAt: -1 });

const DCRequest = mongoose.model("DCRequest", DCRequestSchema);

module.exports = {
  DCRequest,
  getNextDC
};