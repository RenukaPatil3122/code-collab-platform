// src/components/UpgradePrompt.jsx

import React, { useState } from "react";
import { X, Crown, Zap, Lock, Activity } from "lucide-react";
import PricingModal from "./PricingModal";
import "./UpgradePrompt.css";

// reason: "ai_limit" | "interview_limit" | "difficulty_limit" | "version_limit"
function UpgradePrompt({ reason, onClose }) {
  const [showPricing, setShowPricing] = useState(false);

  const MESSAGES = {
    ai_limit: {
      icon: <Zap size={22} />,
      title: "AI Assistant limit reached",
      desc: "You've used all 5 AI requests for today. Upgrade to Pro for unlimited AI assistance.",
      cta: "Unlock Unlimited AI",
    },
    interview_limit: {
      icon: <Lock size={22} />,
      title: "Daily interview limit reached",
      desc: "You've used both interview attempts for today. Upgrade to Pro for unlimited attempts.",
      cta: "Unlock Unlimited Interviews",
    },
    difficulty_limit: {
      icon: <Lock size={22} />,
      title: "Medium & Hard locked",
      desc: "Free plan only includes Easy difficulty. Upgrade to Pro to access all difficulty levels.",
      cta: "Unlock All Difficulties",
    },
    version_limit: {
      icon: <Crown size={22} />,
      title: "Version History limit reached",
      desc: "You've used all 3 version saves. Upgrade to Pro for unlimited version history.",
      cta: "Unlock Unlimited Versions",
    },
    complexity_limit: {
      icon: <Lock size={22} />,
      title: "Complexity Analyzer limit reached",
      desc: "You've used all 3 free complexity analyses today...",
      cta: "Unlock Unlimited Complexity",
    },
  };

  const msg = MESSAGES[reason] || MESSAGES.ai_limit;

  if (showPricing) {
    return (
      <PricingModal
        onClose={() => {
          setShowPricing(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="upgrade-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="upgrade-prompt">
        <button className="upgrade-close" onClick={onClose}>
          <X size={16} />
        </button>

        <div className="upgrade-icon">{msg.icon}</div>
        <h3 className="upgrade-title">{msg.title}</h3>
        <p className="upgrade-desc">{msg.desc}</p>

        <div className="upgrade-perks">
          <div className="upgrade-perk">
            <Zap size={13} /> Unlimited AI Assistant
          </div>
          <div className="upgrade-perk">
            <Lock size={13} /> All interview difficulties
          </div>
          <div className="upgrade-perk">
            <Crown size={13} /> Unlimited version history
          </div>
          <div className="upgrade-perk">
            <Activity size={13} /> Unlimited Complexity Analyzer
          </div>
        </div>

        <button
          className="upgrade-cta premium-pill-btn"
          onClick={() => setShowPricing(true)}
        >
          <Crown size={14} className="cta-crown" />
          <span>Unlock Unlimited Complexity</span>
        </button>

        {/* Keep "Maybe later" as is */}
        <button className="upgrade-skip" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default UpgradePrompt;
