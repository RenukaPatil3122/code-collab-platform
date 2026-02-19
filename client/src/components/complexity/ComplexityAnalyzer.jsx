// src/components/complexity/ComplexityAnalyzer.jsx
import React, { useState } from "react";
import {
  X,
  BarChart2,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import "./ComplexityAnalyzer.css";

function analyzeComplexity(code, language) {
  if (!code || !code.trim()) {
    return null;
  }

  const lines = code.split("\n");
  let timeComplexity = "O(1)";
  let spaceComplexity = "O(1)";
  let reasons = [];
  let warnings = [];

  // Count nesting depth of loops
  let maxLoopDepth = 0;
  let currentDepth = 0;
  let hasRecursion = false;
  let hasSorting = false;
  let hasDivideConquer = false;
  let hasHashMap = false;
  let functionName = null;

  // Detect function name for recursion check
  const funcMatch = code.match(
    /function\s+(\w+)|def\s+(\w+)|(\w+)\s*=\s*(?:function|\(.*?\)\s*=>)/,
  );
  if (funcMatch) {
    functionName = funcMatch[1] || funcMatch[2] || funcMatch[3];
  }

  const loopPatterns = [
    /\bfor\b/,
    /\bwhile\b/,
    /\bdo\b/,
    /\.forEach\b/,
    /\.map\b/,
    /\.filter\b/,
    /\.reduce\b/,
    /\.find\b/,
    /\.some\b/,
    /\.every\b/,
    /\bfor\s+\w+\s+in\b/, // Python for..in
    /\bfor\s+\w+\s+of\b/, // JS for..of
  ];

  const sortPatterns = [
    /\.sort\b/,
    /\bmergeSort\b/,
    /\bquickSort\b/,
    /\bheapSort\b/,
    /sorted\(/,
    /Arrays\.sort/,
    /Collections\.sort/,
  ];

  const dividePatterns = [
    /Math\.log/,
    /\blog\b/,
    /binary.?search/i,
    /binarySearch/i,
    /mid\s*=/,
  ];

  const hashPatterns = [
    /new\s+Map\b/,
    /new\s+Set\b/,
    /new\s+HashMap/,
    /new\s+HashSet/,
    /new\s+Dict/,
    /\{\}/,
    /dict\(/,
    /defaultdict/,
  ];

  // Analyze line by line
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return;

    // Track loop depth via braces/indentation
    const isLoop = loopPatterns.some((p) => p.test(trimmed));
    if (isLoop) {
      currentDepth++;
      maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
    }

    // Rough brace tracking to reduce depth
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    if (closes > opens && currentDepth > 0) {
      currentDepth = Math.max(0, currentDepth - (closes - opens));
    }

    // Recursion
    if (functionName && trimmed.includes(functionName + "(") && i > 2) {
      hasRecursion = true;
    }

    // Sorting
    if (sortPatterns.some((p) => p.test(trimmed))) hasSorting = true;

    // Divide & conquer signals
    if (dividePatterns.some((p) => p.test(trimmed))) hasDivideConquer = true;

    // Hash structures
    if (hashPatterns.some((p) => p.test(trimmed))) hasHashMap = true;
  });

  // Determine time complexity
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
    reasons.push("Sorting operation detected (.sort / sorted)");
  } else if (hasDivideConquer) {
    timeComplexity = "O(log n)";
    reasons.push("Binary search or logarithmic pattern detected");
  } else if (hasRecursion) {
    timeComplexity = "O(2ⁿ)";
    reasons.push("Recursion detected without memoization");
    warnings.push("Exponential recursion — consider adding memoization or DP");
  } else if (maxLoopDepth === 1) {
    timeComplexity = "O(n)";
    reasons.push("Single loop detected");
  } else {
    timeComplexity = "O(1)";
    reasons.push("No loops or recursion found");
  }

  // Determine space complexity
  if (hasRecursion) {
    spaceComplexity = "O(n)";
  } else if (hasHashMap) {
    spaceComplexity = "O(n)";
  } else if (maxLoopDepth >= 2) {
    spaceComplexity = "O(n)";
  } else {
    spaceComplexity = "O(1)";
  }

  return {
    timeComplexity,
    spaceComplexity,
    reasons,
    warnings,
    maxLoopDepth,
    hasRecursion,
    hasSorting,
  };
}

function getRating(complexity) {
  if (complexity.includes("O(1)"))
    return { label: "Excellent", color: "#10b981", icon: "excellent" };
  if (complexity.includes("O(log n)"))
    return { label: "Great", color: "#10b981", icon: "great" };
  if (complexity.includes("O(n log n)"))
    return { label: "Good", color: "#f59e0b", icon: "good" };
  if (complexity.includes("O(n)"))
    return { label: "Fair", color: "#f59e0b", icon: "fair" };
  if (complexity.includes("O(n²)"))
    return { label: "Poor", color: "#ef4444", icon: "poor" };
  return { label: "Bad", color: "#ef4444", icon: "bad" };
}

function ComplexityAnalyzer({ code, language, onClose }) {
  const [result, setResult] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = () => {
    setResult(null); // reset first
    setTimeout(() => {
      const r = analyzeComplexity(code, language);
      setResult(r);
      setAnalyzed(true);
    }, 0);
  };

  const timeRating = result ? getRating(result.timeComplexity) : null;
  const spaceRating = result ? getRating(result.spaceComplexity) : null;

  return (
    <div
      className="ca-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ca-modal">
        {/* Header */}
        <div className="ca-header">
          <div className="ca-title">
            <BarChart2 size={20} />
            <span>Complexity Analyzer</span>
          </div>
          <button className="ca-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ca-body">
          {!analyzed ? (
            <div className="ca-idle">
              <div className="ca-idle-icon">
                <BarChart2 size={40} />
              </div>
              <p className="ca-idle-text">
                Analyze your code to estimate Big O time and space complexity.
              </p>
              <p className="ca-idle-sub">
                Works with loops, recursion, sorting, and hash structures.
              </p>
              <button
                className="ca-analyze-btn"
                onClick={handleAnalyze}
                disabled={!code?.trim()}
              >
                <Zap size={16} />
                Analyze Code
              </button>
            </div>
          ) : !result ? (
            <div className="ca-idle">
              <p className="ca-idle-text">
                No code to analyze. Write some code first.
              </p>
            </div>
          ) : (
            <div className="ca-results">
              {/* Complexity Cards */}
              <div className="ca-cards">
                <div className="ca-card">
                  <div className="ca-card-label">Time Complexity</div>
                  <div
                    className="ca-card-value"
                    style={{ color: timeRating.color }}
                  >
                    {result.timeComplexity}
                  </div>
                  <div
                    className="ca-card-rating"
                    style={{ color: timeRating.color }}
                  >
                    {timeRating.label}
                  </div>
                </div>
                <div className="ca-card">
                  <div className="ca-card-label">Space Complexity</div>
                  <div
                    className="ca-card-value"
                    style={{ color: spaceRating.color }}
                  >
                    {result.spaceComplexity}
                  </div>
                  <div
                    className="ca-card-rating"
                    style={{ color: spaceRating.color }}
                  >
                    {spaceRating.label}
                  </div>
                </div>
              </div>

              {/* Why section */}
              {result.reasons.length > 0 && (
                <div className="ca-section">
                  <div className="ca-section-title">
                    <Info size={14} />
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

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="ca-section">
                  <div className="ca-section-title warning">
                    <AlertTriangle size={14} />
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

              {/* Big O Reference */}
              <div className="ca-section">
                <div className="ca-section-title">
                  <Info size={14} />
                  Big O Reference
                </div>
                <div className="ca-reference">
                  {[
                    {
                      o: "O(1)",
                      label: "Constant",
                      color: "#10b981",
                      width: "8%",
                    },
                    {
                      o: "O(log n)",
                      label: "Logarithmic",
                      color: "#10b981",
                      width: "20%",
                    },
                    {
                      o: "O(n)",
                      label: "Linear",
                      color: "#f59e0b",
                      width: "40%",
                    },
                    {
                      o: "O(n log n)",
                      label: "Linearithmic",
                      color: "#f59e0b",
                      width: "55%",
                    },
                    {
                      o: "O(n²)",
                      label: "Quadratic",
                      color: "#ef4444",
                      width: "75%",
                    },
                    {
                      o: "O(2ⁿ)",
                      label: "Exponential",
                      color: "#ef4444",
                      width: "100%",
                    },
                  ].map((item) => (
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

              <button className="ca-analyze-btn" onClick={handleAnalyze}>
                <Zap size={16} />
                Re-analyze
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComplexityAnalyzer;
