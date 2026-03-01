// server/routes/payment.js

const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Plan amounts in paise (1 INR = 100 paise)
const PLANS = {
  monthly: {
    amount: 9900,
    currency: "INR",
    description: "CodeTogether Pro - Monthly",
  },
  yearly: {
    amount: 79900,
    currency: "INR",
    description: "CodeTogether Pro - Yearly",
  },
};

// ── POST /api/payment/create-order ──────────────────────────
// Creates a Razorpay order, returns order_id to frontend
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANS[plan]) {
      return res
        .status(400)
        .json({ error: "Invalid plan. Choose monthly or yearly." });
    }

    const { amount, currency, description } = PLANS[plan];

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `r_${Date.now().toString().slice(-10)}`,
      notes: {
        userId: req.userId,
        plan,
        description,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────
// Verifies Razorpay signature, upgrades user to premium
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      req.body;

    // Verify signature using HMAC SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ error: "Payment verification failed. Invalid signature." });
    }

    // Upgrade user to premium
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        role: "premium",
        "subscription.plan": plan,
        "subscription.startDate": new Date(),
        "subscription.paymentId": razorpay_payment_id,
        "subscription.orderId": razorpay_order_id,
      },
      { new: true },
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    console.log(`✅ User ${user.email} upgraded to premium (${plan})`);

    res.json({
      success: true,
      message: "Payment verified! You are now a Pro member.",
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

module.exports = router;
