const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    refreshToken: {
      type: String,
      required: true,
    },

    deviceId: {
      type: String,
      required: true,
    },

    ipAddress: String,
    userAgent: String,

    lastActivity: {
      type: Date,
      default: Date.now,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    lastIn: {
      type: Date,
      default: null, // 👈 last login time
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);