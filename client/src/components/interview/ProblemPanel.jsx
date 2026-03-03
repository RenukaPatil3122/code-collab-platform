// src/components/interview/ProblemPanel.jsx
// ✅ Renders actual problem.constraints from data — not hardcoded strings

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle2 } from "lucide-react";
import "./ProblemPanel.css";

function ProblemPanel({ problem }) {
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState([]);

  const revealHint = (index) => {
    if (!revealedHints.includes(index)) {
      setRevealedHints([...revealedHints, index]);
    }
  };

  if (!problem) return null;

  return (
    <div className="problem-panel">
      <div className="problem-header">
        <div className="problem-title-section">
          <h2>{problem.title}</h2>
          <span className={`problem-difficulty ${problem.difficulty}`}>
            {problem.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="problem-description">
        <h3>Problem Description</h3>
        <div className="description-content">
          {problem.description.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      </div>

      {/* Examples from problem data */}
      {problem.examples && problem.examples.length > 0 && (
        <div className="problem-examples">
          <h3>Examples</h3>
          {problem.examples.map((example, idx) => (
            <div key={idx} className="example-case">
              <div className="example-label">Example {idx + 1}:</div>
              <div className="example-io">
                <div className="example-input">
                  <strong>Input:</strong> {example.input}
                </div>
                <div className="example-output">
                  <strong>Output:</strong> {example.output}
                </div>
                {example.explanation && (
                  <div className="example-explanation">
                    <strong>Explanation:</strong> {example.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hints */}
      {problem.hints && problem.hints.length > 0 && (
        <div className="problem-hints">
          <button
            className="hints-toggle"
            onClick={() => setShowHints(!showHints)}
          >
            <Lightbulb size={18} />
            <span>Hints ({problem.hints.length})</span>
            {showHints ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHints && (
            <div className="hints-list">
              {problem.hints.map((hint, idx) => (
                <div key={idx} className="hint-item">
                  {revealedHints.includes(idx) ? (
                    <div className="hint-revealed">
                      <CheckCircle2 size={16} className="hint-icon" />
                      <span>{hint}</span>
                    </div>
                  ) : (
                    <button
                      className="btn-reveal-hint"
                      onClick={() => revealHint(idx)}
                    >
                      🔒 Click to reveal hint {idx + 1}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ Real constraints from problem data, fallback to sensible defaults */}
      <div className="problem-constraints">
        <h4>⚠️ Constraints</h4>
        <ul>
          {problem.constraints && problem.constraints.length > 0 ? (
            problem.constraints.map((c, idx) => <li key={idx}>{c}</li>)
          ) : (
            <>
              <li>Consider edge cases in your solution</li>
              <li>Optimize for time and space complexity</li>
              <li>Test your solution before submitting</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

export default ProblemPanel;
