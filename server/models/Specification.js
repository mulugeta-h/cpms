// models/Specification.js
const mongoose = require("mongoose");

const SpecificationSchema = new mongoose.Schema(
  {
    // Reference to the original DCId Request
    DCId: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // SPECIFICATION INFORMATION
    // =========================
    siteVisitDate: {
      type: Date,
    },

    siteVisitPurpose: {
      type: String,
      trim: true,
    },

    specReleaseDate: {
      type: Date,
    },

    branchHandOverDate: {
      type: Date,
    },

    acceptedBy: {
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

// One Specification record per DC request
SpecificationSchema.index({ DCId: 1 }, { unique: true });

const Specification = mongoose.model(
  "Specification",
  SpecificationSchema
);

module.exports = Specification;