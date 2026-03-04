// src/components/UpgradePrompt.jsx

import React, { useState } from "react";
import { X, Crown, Zap, Lock, BarChart2, History } from "lucide-react";
import PricingModal from "./PricingModal";
import "./UpgradePrompt.css";

// reason: "ai_limit" | "interview_limit" | "difficulty_limit" | "version_limit" | "complexity_limit"

const MESSAGES = {
  ai_limit: {
    icon: <Zap size={22} />,
    iconColor: "#818cf8",
    title: "AI Assistant limit reached",
    desc: "You've used all 5 AI requests for today. Upgrade to Pro for unlimited AI assistance.",
    cta: "Unlock Unlimited AI",
    highlight: "ai",
  },
  interview_limit: {
    icon: <Lock size={22} />,
    iconColor: "#a78bfa",
    title: "Daily interview limit reached",
    desc: "You've used both interview attempts for today. Upgrade to Pro for unlimited attempts.",
    cta: "Unlock Unlimited Interviews",
    highlight: "interview",
  },
  difficulty_limit: {
    icon: <Lock size={22} />,
    iconColor: "#a78bfa",
    title: "Medium & Hard locked",
    desc: "Free plan only includes Easy difficulty. Upgrade to Pro to access all difficulty levels.",
    cta: "Unlock All Difficulties",
    highlight: "interview",
  },
  version_limit: {
    icon: <History size={22} />,
    iconColor: "#34d399",
    title: "Version History limit reached",
    desc: "You've used all 3 free version saves. Upgrade to Pro for unlimited version history.",
    cta: "Upgrade to Pro",
    highlight: "version",
  },
  complexity_limit: {
    icon: <BarChart2 size={22} />,
    iconColor: "#f59e0b",
    title: "Complexity Analyzer limit reached",
    desc: "You've used all 3 free analyses. Upgrade to Pro for unlimited complexity analysis.",
    cta: "Upgrade to Pro",
    highlight: "complexity",
  },
  default: {
    icon: <Crown size={22} />,
    iconColor: "#fbbf24",
    title: "Upgrade to Pro",
    desc: "Unlock unlimited access to all Pro features.",
    cta: "Upgrade to Pro",
    highlight: "",
  },
};

const PERKS = [
  { key: "ai", icon: <Zap size={13} />, label: "Unlimited AI Assistant" },
  {
    key: "interview",
    icon: <Lock size={13} />,
    label: "All interview difficulties",
  },
  {
    key: "version",
    icon: <History size={13} />,
    label: "Unlimited version history",
  },
  {
    key: "complexity",
    icon: <BarChart2 size={13} />,
    label: "Unlimited Complexity Analyzer",
  },
];

function UpgradePrompt({ reason, onClose, onUpgrade }) {
  const [showPricing, setShowPricing] = useState(false);

  const msg = MESSAGES[reason] || MESSAGES.default;

  const handleCta = () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }
    setShowPricing(true);
  };

  if (showPricing) {
    return (
      <PricingModal
        reason={reason}
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

        <div className="upgrade-icon" style={{ "--icon-color": msg.iconColor }}>
          {msg.icon}
        </div>
        <h3 className="upgrade-title">{msg.title}</h3>
        <p className="upgrade-desc">{msg.desc}</p>

        <div className="upgrade-perks">
          {PERKS.map((perk) => (
            <div
              key={perk.key}
              className={`upgrade-perk ${perk.key === msg.highlight ? "highlighted" : ""}`}
            >
              {perk.icon}
              {perk.label}
            </div>
          ))}
        </div>

        <button className="upgrade-cta" onClick={handleCta}>
          <Crown size={15} />
          {msg.cta}
        </button>

        <button className="upgrade-skip" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default UpgradePrompt;
