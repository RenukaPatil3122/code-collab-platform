// server/models/Version.js

const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: null,
    index: true,
  },
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

versionSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model("Version", versionSchema);
