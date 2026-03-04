// src/components/PricingModal.jsx

import React, { useState } from "react";
import { X, Check, Crown, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./PricingModal.css";
import toast from "react-hot-toast";

const FEATURES_FREE = [
  "Real-time collaboration",
  "10+ programming languages",
  "Code execution",
  "AI Assistant — 5 uses/day",
  "Interview Mode — Easy only, 2/day",
  "Version History — 3 saves/room",
];

const FEATURES_PRO = [
  "Everything in Free",
  "AI Assistant — Unlimited",
  "Interview Mode — All difficulties, unlimited",
  "Version History — Unlimited saves",
  "Priority support",
  "Early access to new features",
];

// Dynamic header title based on what triggered the modal
const MODAL_TITLES = {
  ai_limit: "Unlock Unlimited AI",
  interview_limit: "Unlock Unlimited Interviews",
  difficulty_limit: "Unlock All Difficulties",
  version_limit: "Unlock Unlimited Versions",
  complexity_limit: "Unlock Unlimited Complexity",
  default: "Upgrade to Pro",
};

function PricingModal({ onClose, reason }) {
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token, isLoggedIn, updateUser } = useAuth();

  const price = plan === "monthly" ? "₹99" : "₹799";
  const perMonth = plan === "monthly" ? "₹99/mo" : "₹67/mo";
  const saving = plan === "yearly" ? "Save 33%" : null;

  const modalTitle = MODAL_TITLES[reason] || MODAL_TITLES.default;

  async function handleUpgrade() {
    if (!isLoggedIn) {
      setError("Please sign in first to upgrade.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

      const orderRes = await fetch(`${API_BASE}/api/payment/create-order`, {
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
            const verifyRes = await fetch(`${API_BASE}/api/payment/verify`, {
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

            if (updateUser) updateUser(verifyData.user);
            onClose();
            toast.success("🎉 Welcome to CodeTogether Pro!", {
              duration: 3000,
              id: "upgrade-success",
            });
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
            <span>{modalTitle}</span>
          </div>
          <button className="pricing-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="pricing-body">
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
    </div>
  );
}

export default PricingModal;
