// server/models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // ─── Role ─────────────────────────────────────────────
    // "free" | "premium" | "admin"
    // Manually set to "premium" in Atlas for testing
    role: {
      type: String,
      enum: ["free", "premium", "admin"],
      default: "free",
    },

    // ─── AI Usage (resets daily) ───────────────────────────
    aiUsage: {
      count: { type: Number, default: 0 },
      resetDate: { type: Date, default: () => new Date() },
    },

    // ─── Interview Usage (resets daily) ───────────────────
    interviewUsage: {
      count: { type: Number, default: 0 },
      resetDate: { type: Date, default: () => new Date() },
    },

    // ─── Version History (total manual saves, not auto) ───
    versionCount: {
      type: Number,
      default: 0,
    },

    // ─── Razorpay (for later) ─────────────────────────────
    razorpayCustomerId: {
      type: String,
      default: null,
    },
    premiumSince: {
      type: Date,
      default: null,
    },
    premiumExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// ─── Hash password before saving ──────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Compare password on login ────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Reset daily usage if it's a new day ──────────────────
userSchema.methods.resetDailyUsageIfNeeded = function () {
  const now = new Date();
  const isNewDay = (resetDate) => {
    return (
      now.getDate() !== resetDate.getDate() ||
      now.getMonth() !== resetDate.getMonth() ||
      now.getFullYear() !== resetDate.getFullYear()
    );
  };

  if (isNewDay(this.aiUsage.resetDate)) {
    this.aiUsage.count = 0;
    this.aiUsage.resetDate = now;
  }

  if (isNewDay(this.interviewUsage.resetDate)) {
    this.interviewUsage.count = 0;
    this.interviewUsage.resetDate = now;
  }
};

// ─── Limits per role ──────────────────────────────────────
userSchema.methods.getLimits = function () {
  if (this.role === "premium" || this.role === "admin") {
    return {
      aiUsagePerDay: Infinity,
      interviewPerDay: Infinity,
      maxVersions: Infinity,
      interviewDifficulties: ["easy", "medium", "hard"],
    };
  }
  // free
  return {
    aiUsagePerDay: 5,
    interviewPerDay: 2,
    maxVersions: 3,
    interviewDifficulties: ["easy"],
  };
};

// ─── Safe user object (no password) ──────────────────────
userSchema.methods.toSafeObject = function () {
  const limits = this.getLimits();
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    aiUsage: this.aiUsage,
    interviewUsage: this.interviewUsage,
    versionCount: this.versionCount,
    limits,
    premiumSince: this.premiumSince,
    premiumExpiry: this.premiumExpiry,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
