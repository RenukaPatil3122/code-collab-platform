// src/components/ai/AIAssistant.jsx — Clean Single-Response Edition
import React, { useState, useRef, useEffect } from "react";
import { useAI } from "../../contexts/AIContext";
import { useRoom } from "../../contexts/RoomContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  Sparkles,
  Lightbulb,
  Bug,
  Zap,
  FlaskConical,
  Copy,
  Check,
  AlertTriangle,
  Crown,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import "./AIAssistant.css";

/* ─── Feature config ──────────────────────────────────── */
const FEATURES = {
  explain: {
    label: "Explain",
    tag: "understand",
    icon: Lightbulb,
    iconColor: "#3b82f6",
    iconBg: "rgba(59,130,246,0.12)",
    btnClass: "explain",
  },
  debug: {
    label: "Debug",
    tag: "find bugs",
    icon: Bug,
    iconColor: "#ef4444",
    iconBg: "rgba(239,68,68,0.12)",
    btnClass: "debug",
  },
  optimize: {
    label: "Optimize",
    tag: "performance",
    icon: Zap,
    iconColor: "#f59e0b",
    iconBg: "rgba(245,158,11,0.12)",
    btnClass: "optimize",
  },
  generate_tests: {
    label: "Tests",
    tag: "coverage",
    icon: FlaskConical,
    iconColor: "#10b981",
    iconBg: "rgba(16,185,129,0.12)",
    btnClass: "tests",
  },
};

const ACTION_BUTTONS = [
  { id: "explain", featureKey: "explain" },
  { id: "debug", featureKey: "debug" },
  { id: "optimize", featureKey: "optimize" },
  { id: "tests", featureKey: "generate_tests" },
];

const CAPABILITIES = [
  { label: "Explain complex logic clearly", color: "#3b82f6" },
  { label: "Find & fix bugs instantly", color: "#ef4444" },
  { label: "Optimize for performance", color: "#f59e0b" },
  { label: "Generate test coverage", color: "#10b981" },
];

/* ─── Loading state ───────────────────────────────────── */
function LoadingState({ featureKey }) {
  const meta = featureKey ? FEATURES[featureKey] : null;
  const Icon = meta?.icon;
  return (
    <div className="ai-loading">
      <div className="ai-loading-orb">
        <div className="ai-loading-orb-inner" />
        <div className="ai-loading-orb-pulse" />
      </div>
      <div className="ai-loading-text">
        {Icon && (
          <Icon size={16} style={{ color: meta.iconColor, marginBottom: 4 }} />
        )}
        <p>{meta ? `Running ${meta.label}…` : "Analyzing your code…"}</p>
        <div className="ai-loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="ai-empty-state">
      <div className="empty-icon-wrapper">
        <div className="empty-icon-bg" />
        <Sparkles size={26} className="empty-icon" />
      </div>
      <h4>AI Code Assistant</h4>
      <p>
        Your intelligent pair programmer.
        <br />
        Pick an action above to get started.
      </p>
      <div className="empty-capabilities">
        {CAPABILITIES.map(({ label, color }) => (
          <div className="capability-item" key={label}>
            <div
              className="capability-dot"
              style={{ background: color, boxShadow: `0 0 5px ${color}` }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="hint-text">// results replace on each action</p>
    </div>
  );
}

/* ─── Response card ───────────────────────────────────── */
function ResponseCard({ item, onCopy, copied }) {
  const meta = FEATURES[item.feature] ?? {
    label: "AI Response",
    tag: "result",
    icon: Sparkles,
    iconColor: "#8b5cf6",
    iconBg: "rgba(139,92,246,0.12)",
  };
  const Icon = meta.icon;
  return (
    <div className="ai-response-card latest">
      <div className="response-header">
        <div className="response-label">
          <div
            className="response-label-icon"
            style={{ background: meta.iconBg }}
          >
            <Icon size={13} style={{ color: meta.iconColor }} />
          </div>
          <div className="response-label-text">
            <span className="response-label-name">{meta.label}</span>
            <span
              className="response-label-tag"
              style={{ color: meta.iconColor }}
            >
              {meta.tag}
            </span>
          </div>
        </div>
        <button
          className={`btn-copy-response${copied ? " copied" : ""}`}
          onClick={() => onCopy(item.response)}
        >
          {copied ? (
            <>
              <Check size={11} /> Copied
            </>
          ) : (
            <>
              <Copy size={11} /> Copy
            </>
          )}
        </button>
      </div>
      <div className="response-content">
        <MarkdownRenderer content={item.response} />
      </div>
    </div>
  );
}

/* ─── Footer bar sub-components ──────────────────────── */

function FooterPro() {
  return (
    <div className="ai-tips ai-tips--pro">
      <Crown size={13} className="ai-tips-crown" />
      <p>
        <span className="ai-tips-pro-badge">PRO</span>
        &nbsp;<strong>Unlimited</strong> AI requests
      </p>
    </div>
  );
}

function FooterUsage({ remaining, dailyLimit }) {
  return (
    <div className="ai-tips">
      <Lightbulb size={12} className="ai-tips-icon" />
      <p>
        <strong>
          {remaining}/{dailyLimit}
        </strong>{" "}
        AI requests left today
      </p>
    </div>
  );
}

function FooterLow({ remaining, dailyLimit, onUpgrade }) {
  return (
    <div className="ai-tips ai-tips--low">
      <Zap size={12} className="ai-tips-zap" style={{ color: "#f59e0b" }} />
      <p>
        <strong>
          {remaining}/{dailyLimit}
        </strong>{" "}
        request left
        <span className="ai-tips-divider">·</span>
        <span className="ai-tips-upgrade" onClick={onUpgrade}>
          Upgrade to Pro
        </span>
      </p>
    </div>
  );
}

function FooterOut({ onUpgrade }) {
  return (
    <div className="ai-tips ai-tips--out">
      <Zap size={13} className="ai-tips-zap" />
      <p>
        <strong>0 requests left</strong>
        <span className="ai-tips-divider">·</span>
        <span className="ai-tips-upgrade" onClick={onUpgrade}>
          Upgrade to Pro
        </span>
      </p>
    </div>
  );
}

function FooterGuest() {
  return (
    <div className="ai-tips">
      <Lightbulb size={12} className="ai-tips-icon" />
      <p>
        <strong>Pro tip:</strong> Select code in the editor for targeted
        analysis.
      </p>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────── */
export default function AIAssistant({ onClose, onUpgrade }) {
  const {
    isAILoading,
    aiResponse,
    aiLimitError,
    clearAiLimitError,
    localUsageCount,
    setLocalUsageCount,
    explainCode,
    debugCode,
    optimizeCode,
    generateTests,
  } = useAI();
  const { code, language } = useRoom();
  const { user, isPremium } = useAuth();

  const [copied, setCopied] = useState(false);
  const [activeFeature, setActive] = useState(null);
  const responseRef = useRef(null);

  // Seed local count from user on first open
  useEffect(() => {
    if (user?.aiUsage?.count !== undefined && localUsageCount === null) {
      setLocalUsageCount(user.aiUsage.count);
    }
  }, [user]);

  useEffect(() => {
    if (aiResponse && responseRef.current) {
      responseRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [aiResponse]);

  // Bubble AI limit error up to Room so PricingModal renders at root level
  useEffect(() => {
    if (aiLimitError) {
      clearAiLimitError();
      onUpgrade?.();
    }
  }, [aiLimitError]);

  const handleAction = (actionId) => {
    if (!code?.trim()) {
      alert("Write some code first!");
      return;
    }
    setActive(actionId);
    const map = {
      explain: () => explainCode(code, language),
      debug: () => debugCode(code, language),
      optimize: () => optimizeCode(code, language),
      tests: () => generateTests(code, language),
    };
    map[actionId]?.();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Footer upgrade clicks also bubble up to Room
  const handleUpgrade = () => onUpgrade?.();

  const featureKeyMap = {
    explain: "explain",
    debug: "debug",
    optimize: "optimize",
    tests: "generate_tests",
  };
  const activeFeatureKey = activeFeature ? featureKeyMap[activeFeature] : null;
  const showEmpty = !isAILoading && !aiResponse;

  const usedCount = localUsageCount ?? user?.aiUsage?.count ?? 0;
  const dailyLimit = user?.limits?.aiUsagePerDay ?? 5;
  const remaining = Math.max(dailyLimit - usedCount, 0);

  const renderFooter = () => {
    if (isPremium) return <FooterPro />;
    if (!user) return <FooterGuest />;
    if (remaining === 0) return <FooterOut onUpgrade={handleUpgrade} />;
    if (remaining === 1)
      return (
        <FooterLow
          remaining={remaining}
          dailyLimit={dailyLimit}
          onUpgrade={handleUpgrade}
        />
      );
    return <FooterUsage remaining={remaining} dailyLimit={dailyLimit} />;
  };

  return (
    <div className="ai-assistant-panel">
      {/* ACTION BUTTONS */}
      <div className="ai-quick-actions">
        {ACTION_BUTTONS.map(({ id, featureKey }) => {
          const meta = FEATURES[featureKey];
          const Icon = meta.icon;
          const isRunning = isAILoading && activeFeature === id;
          return (
            <button
              key={id}
              className={`ai-action-btn ${meta.btnClass}${isRunning ? " running" : ""}`}
              onClick={() => handleAction(id)}
              disabled={isAILoading}
            >
              <Icon
                size={14}
                className="btn-icon"
                style={{ color: meta.iconColor }}
              />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* RESPONSE AREA */}
      <div className="ai-response-area" ref={responseRef}>
        {isAILoading && <LoadingState featureKey={activeFeatureKey} />}
        {showEmpty && <EmptyState />}
        {!isAILoading && aiResponse && !aiResponse.error && (
          <ResponseCard item={aiResponse} onCopy={handleCopy} copied={copied} />
        )}
        {!isAILoading && aiResponse?.error && (
          <div className="ai-error">
            <AlertTriangle size={14} className="ai-error-icon" />
            <p>{aiResponse.error}</p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      {renderFooter()}
    </div>
  );
}
