const mongoose = require("mongoose");

const ConstructionSchema = new mongoose.Schema(
  {
    // Reference to the original DC Request
    DCId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    submissionDate: {
      type: String,
      trim: true,
    },

    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // CONSTRUCTION WORK
    // =========================

    designWorkLayout: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    specificationWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    partitionWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    strongRoomPartition: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    strongRoomDoor: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    sentryBoxPlace: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    grilledAndSecurityWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    toiletRoomWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    verandaOrCorridorWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    electricalInstallationWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    sanitaryInstallationWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    ceilingFinishWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    paintingWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    electricalFittingWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    sanitaryFittingWork: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    siteClearance: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    parkingArea: {
      type: String,
      enum: ["Pending", "Completed", "Not Required"],
      default: "Pending",
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },

    percentage: {
      type: String,
      trim: true,
      default: "",
    },
    
  },
  {
    timestamps: true,
  }
);

// Index using the field that actually exists
ConstructionSchema.index({ DCId: 1 });

const Construction = mongoose.model(
  "Construction",
  ConstructionSchema
);

module.exports = Construction;