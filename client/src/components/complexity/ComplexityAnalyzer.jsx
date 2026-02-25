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

  // Extract function name
  const funcDeclMatch = code.match(/^\s*(?:async\s+)?function\s+(\w+)\s*\(/m);
  const funcExprMatch = code.match(
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>)/m,
  );
  const pyFuncMatch = code.match(/^\s*def\s+(\w+)\s*\(/m);
  if (funcDeclMatch) functionName = funcDeclMatch[1];
  else if (funcExprMatch) functionName = funcExprMatch[1];
  else if (pyFuncMatch) functionName = pyFuncMatch[1];

  // Find which line the function is defined on
  if (functionName) {
    const defRe = new RegExp(
      `(?:function\\s+${functionName}|(?:const|let|var)\\s+${functionName}\\s*=|def\\s+${functionName})`,
    );
    lines.forEach((line, i) => {
      if (funcDefLine === -1 && defRe.test(line)) funcDefLine = i;
    });
  }

  const isLoopLine = (s) => {
    if (/^\s*for\s*\(/.test(s)) return true;
    if (/^\s*for\s+\w+\s+(?:in|of)\b/.test(s)) return true;
    if (/^\s*while\s*\(/.test(s)) return true;
    if (/^\s*do\s*[\{$]/.test(s)) return true;
    if (/\.\s*(?:forEach|map|filter|reduce|flatMap)\s*\(/.test(s)) return true;
    return false;
  };

  const isSortLine = (s) => {
    if (/\.\s*sort\s*\(/.test(s)) return true;
    if (
      /\b(?:mergeSort|quickSort|heapSort|bubbleSort|insertionSort)\s*\(/.test(s)
    )
      return true;
    if (/\bsorted\s*\(/.test(s)) return true;
    if (/\bArrays\s*\.\s*sort\b/.test(s)) return true;
    if (/\bCollections\s*\.\s*sort\b/.test(s)) return true;
    return false;
  };

  const isDivideConquerLine = (s) => {
    if (/\bMath\s*\.\s*log\s*\(/.test(s)) return true;
    if (/\bbinarySearch\b/.test(s)) return true;
    if (/\bbinary[\s_]?[Ss]earch\b/.test(s)) return true;
    if (
      /\bmid\s*=\s*(?:Math\.floor|Math\.ceil|\(?\s*(?:low|left|lo|start)\s*\+)/.test(
        s,
      )
    )
      return true;
    if (/\b(?:low|high|left|right|lo|hi)\s*=\s*mid\s*[+\-]/.test(s))
      return true;
    return false;
  };

  const isHashLine = (s) => {
    if (/\bnew\s+Map\s*\(/.test(s)) return true;
    if (/\bnew\s+Set\s*\(/.test(s)) return true;
    if (/\bnew\s+(?:HashMap|HashSet|LinkedHashMap|TreeMap)\s*\(/.test(s))
      return true;
    if (/\bdict\s*\(\s*\)/.test(s)) return true;
    if (/\bdefaultdict\b/.test(s)) return true;
    if (/\b(?:const|let|var)\s+\w+\s*=\s*\{\s*\}/.test(s)) return true;
    return false;
  };

  const isMemoLine = (s) => {
    if (/\b(?:memo|cache|dp)\s*[\[=\(]/.test(s)) return true;
    if (/\bmemoize\b|\blru_cache\b|@cache\b/.test(s)) return true;
    return false;
  };

  lines.forEach((line, i) => {
    const s = stripNoise(line);
    if (!s) return;

    if (isLoopLine(s)) {
      currentDepth++;
      maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
    }

    const opens = (s.match(/\{/g) || []).length;
    const closes = (s.match(/\}/g) || []).length;
    if (closes > opens && currentDepth > 0) {
      currentDepth = Math.max(0, currentDepth - (closes - opens));
    }

    if (functionName) {
      const callRe = new RegExp(`\\b${functionName}\\s*\\(`, "g");
      if (i > funcDefLine) {
        // Normal case: call appears on a line after the definition
        if (callRe.test(s)) hasRecursion = true;
      } else if (i === funcDefLine) {
        // Single-line arrow: const fib = (n) => fib(n-1) — appears twice on same line
        const matches = s.match(callRe) || [];
        if (matches.length > 1) hasRecursion = true;
      }
    }

    if (isSortLine(s)) hasSorting = true;
    if (isDivideConquerLine(s)) hasDivideConquer = true;
    if (isHashLine(s)) hasHashMap = true;
    if (isMemoLine(s)) hasMemo = true;
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
    if (hasMemo) {
      timeComplexity = "O(n)";
      reasons.push("Memoized recursion detected");
    } else {
      timeComplexity = "O(2ⁿ)";
      reasons.push("Recursion detected without memoization");
      warnings.push(
        "Exponential recursion — consider adding memoization or DP",
      );
    }
  } else if (maxLoopDepth === 1) {
    timeComplexity = "O(n)";
    reasons.push("Single loop detected");
  } else {
    timeComplexity = "O(1)";
    reasons.push("No loops or recursion found — constant time");
  }

  // Determine space complexity
  if (hasRecursion && !hasMemo) spaceComplexity = "O(n)";
  else if (hasHashMap || hasMemo) spaceComplexity = "O(n)";
  else if (maxLoopDepth >= 2) spaceComplexity = "O(n)";
  else spaceComplexity = "O(1)";

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
    return { label: "Excellent", color: "var(--ca-green)" };
  if (complexity.includes("O(log n)"))
    return { label: "Great", color: "var(--ca-green)" };
  if (complexity.includes("O(n log n)"))
    return { label: "Good", color: "var(--ca-amber)" };
  if (complexity.includes("O(n)"))
    return { label: "Fair", color: "var(--ca-amber)" };
  if (complexity.includes("O(n²)"))
    return { label: "Poor", color: "var(--ca-red)" };
  return { label: "Bad", color: "var(--ca-red)" };
}

function ComplexityAnalyzer({ code, language, onClose }) {
  const [result, setResult] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = () => {
    setResult(null);
    setTimeout(() => {
      const r = analyzeComplexity(code, language);
      setResult(r);
      setAnalyzed(true);
    }, 0);
  };

  const timeRating = result ? getRating(result.timeComplexity) : null;
  const spaceRating = result ? getRating(result.spaceComplexity) : null;

  const BIG_O_REF = [
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
          <button className="ca-close" onClick={onClose}>
            <X size={15} />
          </button>
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
              <button
                className="ca-analyze-btn"
                onClick={handleAnalyze}
                disabled={!code?.trim()}
              >
                <Zap size={14} />
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
                  {BIG_O_REF.map((item) => (
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
                <Zap size={14} />
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
