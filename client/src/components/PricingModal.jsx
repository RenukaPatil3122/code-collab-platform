// src/components/PricingModal.jsx

import React, { useState } from "react";
import {
  X,
  Check,
  Crown,
  Zap,
  Shield,
  GitBranch,
  Cpu,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./PricingModal.css";

const FEATURES_FREE = [
  "Real-time collaboration",
  "10+ programming languages",
  "Code execution",
  "AI Assistant — 5 uses/day",
  "Interview Mode — Easy only, 2/day",
  "Version History — 3 saves",
  "Chat & Whiteboard",
];

const FEATURES_PRO = [
  "Everything in Free",
  "AI Assistant — Unlimited",
  "Interview Mode — All difficulties, unlimited",
  "Version History — Unlimited saves",
  "Priority support",
  "Early access to new features",
];

function PricingModal({ onClose }) {
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token, login, isLoggedIn, updateUser } = useAuth();

  const price = plan === "monthly" ? "₹99" : "₹799";
  const perMonth = plan === "monthly" ? "₹99/mo" : "₹67/mo";
  const saving = plan === "yearly" ? "Save 33%" : null;

  async function handleUpgrade() {
    if (!isLoggedIn) {
      setError("Please sign in first to upgrade.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const API_URL =
        process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

      // 1. Create order on backend
      const orderRes = await fetch(`${API_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok)
        throw new Error(orderData.error || "Failed to create order");

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CodeTogether",
        description:
          plan === "monthly" ? "Pro Monthly Plan" : "Pro Yearly Plan",
        order_id: orderData.orderId,
        theme: { color: "#6366f1" },
        prefill: {},

        handler: async function (response) {
          try {
            // 3. Verify payment on backend
            const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);

            // 4. Update user in context
            if (updateUser) updateUser(verifyData.user);
            onClose();
            alert("🎉 Welcome to CodeTogether Pro!");
          } catch (err) {
            setError("Payment verification failed. Contact support.");
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="pricing-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pricing-modal">
        {/* Header */}
        <div className="pricing-header">
          <div className="pricing-header-left">
            <div className="pricing-icon">
              <Crown size={18} />
            </div>
            <span>Upgrade to Pro</span>
          </div>
          <button className="pricing-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Toggle */}
        <div className="pricing-toggle-wrap">
          <div className="pricing-toggle">
            <button
              className={`toggle-btn ${plan === "monthly" ? "active" : ""}`}
              onClick={() => setPlan("monthly")}
            >
              Monthly
            </button>
            <button
              className={`toggle-btn ${plan === "yearly" ? "active" : ""}`}
              onClick={() => setPlan("yearly")}
            >
              Yearly
              {saving && <span className="toggle-save">{saving}</span>}
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="pricing-plans">
          {/* Free */}
          <div className="plan-card">
            <div className="plan-name">Free</div>
            <div className="plan-price">
              ₹0<span>/forever</span>
            </div>
            <ul className="plan-features">
              {FEATURES_FREE.map((f, i) => (
                <li key={i}>
                  <Check size={14} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="plan-current">Current plan</div>
          </div>

          {/* Pro */}
          <div className="plan-card pro">
            <div className="plan-badge">
              <Sparkles size={11} /> Most Popular
            </div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">
              {price}
              <span>/{plan === "monthly" ? "month" : "year"}</span>
            </div>
            {plan === "yearly" && (
              <div className="plan-per-month">
                Just {perMonth} billed yearly
              </div>
            )}
            <ul className="plan-features">
              {FEATURES_PRO.map((f, i) => (
                <li key={i}>
                  <Check size={14} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {error && <div className="pricing-error">{error}</div>}

            <button
              className="plan-upgrade-btn"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <span className="pricing-spinner" />
              ) : (
                `Upgrade for ${price}`
              )}
            </button>

            <p className="plan-note">
              Secure payment via Razorpay · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingModal;
