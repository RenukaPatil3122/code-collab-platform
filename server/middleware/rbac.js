// server/middleware/rbac.js

const User = require("../models/User");
const Version = require("../models/Version");

// ─── Check AI usage limit ─────────────────────────────────
// Use on AI routes — free users get 5/day
async function checkAILimit(req, res, next) {
  try {
    // Guest — no account, block
    if (!req.userId) {
      return res.status(401).json({
        error: "LOGIN_REQUIRED",
        message: "Please create a free account to use AI Assistant",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Reset daily count if needed
    user.resetDailyUsageIfNeeded();

    const limits = user.getLimits();

    // Premium/admin — unlimited
    if (limits.aiUsagePerDay === Infinity) {
      req.user = user;
      return next();
    }

    // Free — check limit
    if (user.aiUsage.count >= limits.aiUsagePerDay) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        message: `You've used all ${limits.aiUsagePerDay} free AI requests today. Upgrade to Pro for unlimited access.`,
        used: user.aiUsage.count,
        limit: limits.aiUsagePerDay,
        resetAt: "midnight",
      });
    }

    // Increment usage
    user.aiUsage.count += 1;
    await user.save();

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ AI limit check error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ─── Check Interview limit ────────────────────────────────
// Attaches to socket events — returns error object instead of res
async function checkInterviewLimit(userId, difficulty) {
  try {
    // Guest
    if (!userId) {
      return {
        allowed: false,
        error: "LOGIN_REQUIRED",
        message: "Please create a free account to use Interview Mode",
      };
    }

    const user = await User.findById(userId);
    if (!user) return { allowed: false, error: "User not found" };

    user.resetDailyUsageIfNeeded();
    const limits = user.getLimits();

    // Check difficulty access
    if (!limits.interviewDifficulties.includes(difficulty.toLowerCase())) {
      return {
        allowed: false,
        error: "UPGRADE_REQUIRED",
        message: `Medium and Hard difficulty requires Pro. Upgrade for ₹99/month.`,
        currentPlan: user.role,
      };
    }

    // Premium — unlimited
    if (limits.interviewPerDay === Infinity) {
      return { allowed: true, user };
    }

    // Check daily limit
    if (user.interviewUsage.count >= limits.interviewPerDay) {
      return {
        allowed: false,
        error: "LIMIT_REACHED",
        message: `You've used all ${limits.interviewPerDay} free interviews today. Upgrade to Pro for unlimited.`,
        used: user.interviewUsage.count,
        limit: limits.interviewPerDay,
      };
    }

    // Increment
    user.interviewUsage.count += 1;
    await user.save();

    return { allowed: true, user };
  } catch (err) {
    console.error("❌ Interview limit check error:", err);
    return { allowed: false, error: "Server error" };
  }
}

// ─── Check Version History limit ─────────────────────────
// Free users get 3 manual saves PER ROOM
// Counts actual DB records instead of trusting stored counter
async function checkVersionLimit(userId, roomId) {
  try {
    // Guest — not logged in
    if (!userId) {
      return {
        allowed: false,
        error: "LOGIN_REQUIRED",
        message: "Please create a free account to save versions",
      };
    }

    const user = await User.findById(userId);
    if (!user) return { allowed: false, error: "User not found" };

    const limits = user.getLimits();

    // Premium/admin — unlimited
    if (limits.maxVersions === Infinity) {
      return { allowed: true, user };
    }

    // TO THIS — count across all rooms for this user:
    const manualSaveCount = await Version.countDocuments({
      userId,
      auto: false,
    });

    if (manualSaveCount >= limits.maxVersions) {
      return {
        allowed: false,
        error: "LIMIT_REACHED",
        message: `Free plan allows ${limits.maxVersions} saved versions per room. Upgrade to Pro for unlimited.`,
        used: manualSaveCount,
        limit: limits.maxVersions,
      };
    }

    return { allowed: true, user };
  } catch (err) {
    console.error("❌ Version limit check error:", err);
    return { allowed: false, error: "Server error" };
  }
}

module.exports = { checkAILimit, checkInterviewLimit, checkVersionLimit };
