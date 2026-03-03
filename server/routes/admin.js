// server/routes/admin.js

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// ─── Admin-only middleware ────────────────────────────────
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

// ─── GET /api/admin/users — list all users ────────────────
router.get("/users", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search = "", role = "", page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/admin/users/:id — upgrade/downgrade user ─
router.patch("/users/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["free", "premium", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Prevent self-demotion
    if (req.params.id === req.userId && role !== "admin") {
      return res
        .status(400)
        .json({ error: "Cannot change your own admin role" });
    }

    const update = { role };
    if (role === "premium") update.premiumSince = new Date();
    if (role === "free") update.premiumSince = null;

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      select: "-password",
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("Admin update user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/admin/users/:id — delete a user ─────────
router.delete("/users/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/admin/stats — usage overview ────────────────
router.get("/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [total, free, premium, admin, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "free" }),
      User.countDocuments({ role: "premium" }),
      User.countDocuments({ role: "admin" }),
      User.find().select("-password").sort({ createdAt: -1 }).limit(5),
    ]);

    // Today's active users (those who used AI today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await User.countDocuments({
      "aiUsage.resetDate": { $gte: today },
      "aiUsage.count": { $gt: 0 },
    });

    // Total AI usage today
    const aiUsageAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$aiUsage.count" } } },
    ]);
    const totalAIUsage = aiUsageAgg[0]?.total || 0;

    res.json({
      stats: {
        totalUsers: total,
        freeUsers: free,
        premiumUsers: premium,
        adminUsers: admin,
        activeToday,
        totalAIUsage,
        conversionRate: total > 0 ? ((premium / total) * 100).toFixed(1) : 0,
      },
      recentUsers,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
