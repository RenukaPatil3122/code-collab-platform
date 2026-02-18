// server/models/Version.js

const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: "",
  },
  auto: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
versionSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model("Version", versionSchema);
