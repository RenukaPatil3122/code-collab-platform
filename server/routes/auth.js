// server/routes/auth.js

const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "codetogether-jwt-secret-change-me";
const JWT_EXPIRES = "7d";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─── POST /api/auth/register ──────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username: rawUsername, email: rawEmail, password } = req.body;
    const username = rawUsername?.trim();
    const email = rawEmail?.trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check duplicates
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: "Server error, please try again" });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Reset daily usage if new day
    user.resetDailyUsageIfNeeded();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: "Welcome back!",
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error, please try again" });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
// Returns current user from token — frontend calls this on app load
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.resetDailyUsageIfNeeded();
    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────
// JWT is stateless — just tell frontend to delete token
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
