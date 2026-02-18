// src/components/interview/ProblemPanel.jsx

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

      {/* Test Cases Preview */}
      {problem.testCases && problem.testCases.length > 0 && (
        <div className="problem-examples">
          <h3>Examples</h3>
          {problem.testCases.slice(0, 2).map((testCase, idx) => (
            <div key={idx} className="example-case">
              <div className="example-label">Example {idx + 1}:</div>
              <div className="example-io">
                <div className="example-input">
                  <strong>Input:</strong> {testCase.input}
                </div>
                <div className="example-output">
                  <strong>Output:</strong> {testCase.expectedOutput}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hints Section */}
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

      {/* Constraints */}
      <div className="problem-constraints">
        <h4>⚠️ Remember:</h4>
        <ul>
          <li>Consider edge cases</li>
          <li>Optimize for time and space complexity</li>
          <li>Test your solution before submitting</li>
        </ul>
      </div>
    </div>
  );
}

export default ProblemPanel;
