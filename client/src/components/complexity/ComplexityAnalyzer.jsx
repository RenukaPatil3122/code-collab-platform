// src/components/complexity/ComplexityAnalyzer.jsx
import React, { useState } from "react";
import {
  X,
  BarChart2,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Crown,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import UpgradePrompt from "../UpgradePrompt";
import "./ComplexityAnalyzer.css";

const FREE_LIMIT = 3;
const SESSION_KEY = "ct_complexity_uses";

function getCount() {
  try {
    return parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10);
  } catch {
    return 0;
  }
}
function saveCount(n) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(n));
  } catch {}
}

function stripNoise(line) {
  let s = line.replace(/\/\/.*$/, "").replace(/#.*$/, "");
  s = s.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '""');
  return s.trim();
}

function analyzeComplexity(code) {
  if (!code || !code.trim()) return null;
  const lines = code.split("\n");
  let timeComplexity = "O(1)",
    spaceComplexity = "O(1)";
  let reasons = [],
    warnings = [];
  let maxLoopDepth = 0,
    currentDepth = 0;
  let hasRecursion = false,
    hasSorting = false,
    hasDivideConquer = false;
  let hasHashMap = false,
    hasMemo = false;
  let functionName = null,
    funcDefLine = -1;
  const funcDeclMatch = code.match(/^\s*(?:async\s+)?function\s+(\w+)\s*\(/m);
  const funcExprMatch = code.match(
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>)/m,
  );
  const pyFuncMatch = code.match(/^\s*def\s+(\w+)\s*\(/m);
  if (funcDeclMatch) functionName = funcDeclMatch[1];
  else if (funcExprMatch) functionName = funcExprMatch[1];
  else if (pyFuncMatch) functionName = pyFuncMatch[1];
  if (functionName) {
    const defRe = new RegExp(
      `(?:function\\s+${functionName}|(?:const|let|var)\\s+${functionName}\\s*=|def\\s+${functionName})`,
    );
    lines.forEach((line, i) => {
      if (funcDefLine === -1 && defRe.test(line)) funcDefLine = i;
    });
  }
  const isLoop = (s) =>
    /^\s*for\s*\(/.test(s) ||
    /^\s*for\s+\w+\s+(?:in|of)\b/.test(s) ||
    /^\s*while\s*\(/.test(s) ||
    /^\s*do\s*[\{$]/.test(s) ||
    /\.\s*(?:forEach|map|filter|reduce|flatMap)\s*\(/.test(s);
  const isSort = (s) =>
    /\.\s*sort\s*\(/.test(s) ||
    /\b(?:mergeSort|quickSort|heapSort|bubbleSort|insertionSort)\s*\(/.test(
      s,
    ) ||
    /\bsorted\s*\(/.test(s) ||
    /\bArrays\s*\.\s*sort\b/.test(s) ||
    /\bCollections\s*\.\s*sort\b/.test(s);
  const isDC = (s) =>
    /\bMath\s*\.\s*log\s*\(/.test(s) ||
    /\bbinarySearch\b/.test(s) ||
    /\bbinary[\s_]?[Ss]earch\b/.test(s) ||
    /\bmid\s*=\s*(?:Math\.floor|Math\.ceil|\(?\s*(?:low|left|lo|start)\s*\+)/.test(
      s,
    ) ||
    /\b(?:low|high|left|right|lo|hi)\s*=\s*mid\s*[+\-]/.test(s);
  const isHash = (s) =>
    /\bnew\s+Map\s*\(/.test(s) ||
    /\bnew\s+Set\s*\(/.test(s) ||
    /\bnew\s+(?:HashMap|HashSet|LinkedHashMap|TreeMap)\s*\(/.test(s) ||
    /\bdict\s*\(\s*\)/.test(s) ||
    /\bdefaultdict\b/.test(s) ||
    /\b(?:const|let|var)\s+\w+\s*=\s*\{\s*\}/.test(s);
  const isMemo = (s) =>
    /\b(?:memo|cache|dp)\s*[\[=\(]/.test(s) ||
    /\bmemoize\b|\blru_cache\b|@cache\b/.test(s);
  lines.forEach((line, i) => {
    const s = stripNoise(line);
    if (!s) return;
    if (isLoop(s)) {
      currentDepth++;
      maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
    }
    const opens = (s.match(/\{/g) || []).length,
      closes = (s.match(/\}/g) || []).length;
    if (closes > opens && currentDepth > 0)
      currentDepth = Math.max(0, currentDepth - (closes - opens));
    if (functionName) {
      const callRe = new RegExp(`\\b${functionName}\\s*\\(`, "g");
      if (i > funcDefLine) {
        if (callRe.test(s)) hasRecursion = true;
      } else if (i === funcDefLine) {
        if ((s.match(callRe) || []).length > 1) hasRecursion = true;
      }
    }
    if (isSort(s)) hasSorting = true;
    if (isDC(s)) hasDivideConquer = true;
    if (isHash(s)) hasHashMap = true;
    if (isMemo(s)) hasMemo = true;
  });
  if (maxLoopDepth >= 3) {
    timeComplexity = "O(n³)";
    reasons.push(`${maxLoopDepth} levels of nested loops detected`);
    warnings.push("Triple nested loops are very slow for large inputs");
  } else if (maxLoopDepth === 2) {
    timeComplexity = "O(n²)";
    reasons.push("2 levels of nested loops detected");
    warnings.push("Quadratic complexity — consider optimizing with a hash map");
  } else if (hasRecursion && hasDivideConquer) {
    timeComplexity = "O(n log n)";
    reasons.push("Recursive divide-and-conquer pattern detected");
  } else if (hasSorting) {
    timeComplexity = "O(n log n)";
    reasons.push("Sorting operation detected");
  } else if (hasDivideConquer) {
    timeComplexity = "O(log n)";
    reasons.push("Binary search or logarithmic pattern detected");
  } else if (hasRecursion) {
    if (hasMemo) {
      timeComplexity = "O(n)";
      reasons.push("Memoized recursion detected");
    } else {
      timeComplexity = "O(2ⁿ)";
      reasons.push("Recursion without memoization");
      warnings.push("Exponential recursion — consider memoization or DP");
    }
  } else if (maxLoopDepth === 1) {
    timeComplexity = "O(n)";
    reasons.push("Single loop detected");
  } else {
    timeComplexity = "O(1)";
    reasons.push("No loops or recursion found — constant time");
  }
  if (hasRecursion && !hasMemo) spaceComplexity = "O(n)";
  else if (hasHashMap || hasMemo) spaceComplexity = "O(n)";
  else if (maxLoopDepth >= 2) spaceComplexity = "O(n)";
  else spaceComplexity = "O(1)";
  return { timeComplexity, spaceComplexity, reasons, warnings };
}

function getRating(c) {
  if (c.includes("O(1)"))
    return { label: "Excellent", color: "var(--ca-green)" };
  if (c.includes("O(log n)"))
    return { label: "Great", color: "var(--ca-green)" };
  if (c.includes("O(n log n)"))
    return { label: "Good", color: "var(--ca-amber)" };
  if (c.includes("O(n)")) return { label: "Fair", color: "var(--ca-amber)" };
  if (c.includes("O(n²)")) return { label: "Poor", color: "var(--ca-red)" };
  return { label: "Bad", color: "var(--ca-red)" };
}

const BIG_O = [
  { o: "O(1)", label: "Constant", color: "var(--ca-green)", width: "8%" },
  {
    o: "O(log n)",
    label: "Logarithmic",
    color: "var(--ca-green)",
    width: "20%",
  },
  { o: "O(n)", label: "Linear", color: "var(--ca-amber)", width: "40%" },
  {
    o: "O(n log n)",
    label: "Linearithmic",
    color: "var(--ca-amber)",
    width: "55%",
  },
  { o: "O(n²)", label: "Quadratic", color: "var(--ca-red)", width: "75%" },
  { o: "O(2ⁿ)", label: "Exponential", color: "var(--ca-red)", width: "100%" },
];

export default function ComplexityAnalyzer({
  code,
  language,
  onClose,
  onUpgrade,
}) {
  const { isPremium } = useAuth();
  // Read from sessionStorage so count persists across modal close/reopen
  const [useCount, setUseCount] = useState(() => (isPremium ? 0 : getCount()));
  const [result, setResult] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const remaining = Math.max(FREE_LIMIT - useCount, 0);
  const limitReached = !isPremium && useCount >= FREE_LIMIT;

  const handleAnalyze = () => {
    if (limitReached) {
      setShowUpgrade(true);
      return;
    }
    setResult(null);
    setTimeout(() => {
      const r = analyzeComplexity(code, language);
      setResult(r);
      setAnalyzed(true);
      if (!isPremium) {
        const next = useCount + 1;
        setUseCount(next);
        saveCount(next);
      }
    }, 0);
  };

  if (showUpgrade) {
    return (
      <UpgradePrompt
        reason="complexity_limit"
        onClose={() => {
          setShowUpgrade(false);
          onClose();
        }}
        onUpgrade={onUpgrade}
      />
    );
  }

  const tr = result ? getRating(result.timeComplexity) : null;
  const sr = result ? getRating(result.spaceComplexity) : null;

  return (
    <div
      className="ca-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ca-modal">
        <div className="ca-header">
          <div className="ca-title">
            <BarChart2 size={18} />
            <span>Complexity Analyzer</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isPremium && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: remaining <= 1 ? "#f59e0b" : "rgba(255,255,255,0.4)",
                  fontWeight: 500,
                }}
              >
                {remaining}/{FREE_LIMIT} free uses
              </span>
            )}
            {isPremium && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.72rem",
                  color: "#fbbf24",
                  fontWeight: 600,
                }}
              >
                <Crown size={11} /> Unlimited
              </span>
            )}
            <button className="ca-close" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="ca-body">
          {!analyzed ? (
            <div className="ca-idle">
              <div className="ca-idle-icon">
                <BarChart2 size={38} />
              </div>
              <p className="ca-idle-text">
                Analyze your code to estimate Big O time and space complexity.
              </p>
              <p className="ca-idle-sub">
                Works with loops, recursion, sorting, and hash structures.
              </p>
              {limitReached ? (
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      color: "#f59e0b",
                      fontSize: "0.85rem",
                      marginBottom: 12,
                    }}
                  >
                    You've used all {FREE_LIMIT} free analyses.
                  </p>
                  <button
                    className="ca-analyze-btn"
                    onClick={() => setShowUpgrade(true)}
                  >
                    <Crown size={14} /> Upgrade to Pro for unlimited
                  </button>
                </div>
              ) : (
                <button
                  className="ca-analyze-btn"
                  onClick={handleAnalyze}
                  disabled={!code?.trim()}
                >
                  <Zap size={14} /> Analyze Code
                  {!isPremium && remaining === 1 && (
                    <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                      {" "}
                      (last free use)
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : !result ? (
            <div className="ca-idle">
              <p className="ca-idle-text">No code to analyze.</p>
            </div>
          ) : (
            <div className="ca-results">
              <div className="ca-cards">
                <div className="ca-card">
                  <div className="ca-card-label">Time Complexity</div>
                  <div className="ca-card-value" style={{ color: tr.color }}>
                    {result.timeComplexity}
                  </div>
                  <div className="ca-card-rating" style={{ color: tr.color }}>
                    {tr.label}
                  </div>
                </div>
                <div className="ca-card">
                  <div className="ca-card-label">Space Complexity</div>
                  <div className="ca-card-value" style={{ color: sr.color }}>
                    {result.spaceComplexity}
                  </div>
                  <div className="ca-card-rating" style={{ color: sr.color }}>
                    {sr.label}
                  </div>
                </div>
              </div>
              {result.reasons.length > 0 && (
                <div className="ca-section">
                  <div className="ca-section-title">
                    <Info size={12} />
                    Why?
                  </div>
                  {result.reasons.map((r, i) => (
                    <div key={i} className="ca-reason">
                      <CheckCircle size={13} />
                      {r}
                    </div>
                  ))}
                </div>
              )}
              {result.warnings.length > 0 && (
                <div className="ca-section">
                  <div className="ca-section-title warning">
                    <AlertTriangle size={12} />
                    Suggestions
                  </div>
                  {result.warnings.map((w, i) => (
                    <div key={i} className="ca-warning">
                      <AlertTriangle size={13} />
                      {w}
                    </div>
                  ))}
                </div>
              )}
              <div className="ca-section">
                <div className="ca-section-title">
                  <Info size={12} />
                  Big O Reference
                </div>
                <div className="ca-reference">
                  {BIG_O.map((item) => (
                    <div
                      key={item.o}
                      className={`ca-ref-row ${result.timeComplexity === item.o ? "active" : ""}`}
                    >
                      <span className="ca-ref-o" style={{ color: item.color }}>
                        {item.o}
                      </span>
                      <div className="ca-ref-bar-bg">
                        <div
                          className="ca-ref-bar"
                          style={{ width: item.width, background: item.color }}
                        />
                      </div>
                      <span className="ca-ref-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {limitReached ? (
                <button
                  className="ca-analyze-btn"
                  onClick={() => setShowUpgrade(true)}
                >
                  <Crown size={14} /> Upgrade for unlimited re-analysis
                </button>
              ) : (
                <button className="ca-analyze-btn" onClick={handleAnalyze}>
                  <Zap size={14} /> Re-analyze
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
