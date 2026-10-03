const mongoose = require("mongoose");

const DesignSchema = new mongoose.Schema(
  {
    // Reference to the original DC Request
    DCId: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // DESIGN INFORMATION
    // =========================
    siteVisitDate: {
      type: Date,
    },

    siteVisitPurpose: {
      type: String,
      trim: true,
    },

    drawingReleaseDate: {
      type: Date,
    },

    branchHandOverDate: {
      type: Date,
    },

    acceptedBy: {
      type: String,
      trim: true,
    },

    drawingFileName: {
      type: String,
      trim: true,
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One Design record per DC request
DesignSchema.index({ DCId: 1 }, { unique: true });

const Design = mongoose.model("Design", DesignSchema);

module.exports = Design;