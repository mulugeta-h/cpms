
const mongoose = require("mongoose");

const estimationSchema = new mongoose.Schema(
  {

    estimationId: {
      type: String,
      unique: true,
      trim: true,
      default: "",
    },

    numberOfProperties: {
      type: Number,
      required: true,
      min: 1,
    },

    estimationSiteVisitDate: {
      type: Date,
      default: null,
    },

    estimationReleaseDate: {
      type: Date,
      default: null,
    },

    estimationFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    documentation: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },

    locationCoordinate: {
      type: String,
      trim: true,
      default: "",
    },

    areaOfSite: {
      type: Number,
      min: 0,
      default: null,
    },

    estimationNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
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

module.exports = mongoose.model("Estimation", estimationSchema);
