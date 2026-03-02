// src/components/TestCases.jsx
import React, { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Loader,
  Lock,
} from "lucide-react";
import "./TestCases.css";

function TestCases({ testCases, onUpdate, onClose, testResults, isRunning }) {
  const [activeTab, setActiveTab] = useState("cases");
  const [expandedResults, setExpandedResults] = useState(new Set());

  const addTestCase = useCallback(() => {
    onUpdate([...testCases, { id: Date.now(), input: "", expectedOutput: "" }]);
  }, [testCases, onUpdate]);

  const updateTestCase = useCallback(
    (id, field, value) => {
      onUpdate(
        testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)),
      );
    },
    [testCases, onUpdate],
  );

  const deleteTestCase = useCallback(
    (id) => {
      onUpdate(testCases.filter((tc) => tc.id !== id));
    },
    [testCases, onUpdate],
  );

  const toggleResultExpand = (idx) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  React.useEffect(() => {
    if (testResults && !isRunning) setActiveTab("results");
  }, [testResults, isRunning]);

  const passRate = testResults?.summary
    ? Math.round((testResults.summary.passed / testResults.summary.total) * 100)
    : 0;

  const resultsAvailable = !!(testResults || isRunning);

  return (
    <div className="tc-panel">
      {/* ── Tab bar ── */}
      <div className="tc-tabs-bar">
        <button
          className={`tc-tab ${activeTab === "cases" ? "active" : ""}`}
          onClick={() => setActiveTab("cases")}
        >
          Cases
          <span className="tc-tab-count">{testCases.length}</span>
        </button>

        <button
          className={`tc-tab ${activeTab === "results" ? "active" : ""} ${!resultsAvailable ? "disabled" : ""}`}
          onClick={() => resultsAvailable && setActiveTab("results")}
          title={!resultsAvailable ? "Run tests to see results" : undefined}
        >
          Results
          {/* Lock icon when no results yet */}
          {!resultsAvailable && (
            <span className="tc-tab-lock">
              <Lock size={11} />
            </span>
          )}
          {/* Pass/fail badge once results exist */}
          {testResults && (
            <span
              className={`tc-tab-badge ${
                passRate === 100
                  ? "all-pass"
                  : passRate === 0
                    ? "all-fail"
                    : "partial"
              }`}
            >
              {testResults.summary.passed}/{testResults.summary.total}
            </span>
          )}
          {isRunning && <Loader size={11} className="tc-tab-spin" />}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="tc-body">
        {activeTab === "cases" ? (
          <div className="tc-cases">
            {testCases.length === 0 ? (
              <div className="tc-empty">
                <FlaskConical size={32} className="tc-empty-icon" />
                <p className="tc-empty-title">No test cases yet</p>
                <p className="tc-empty-sub">
                  Add inputs and expected outputs to validate your code
                  automatically
                </p>
                <button className="tc-btn-add-first" onClick={addTestCase}>
                  <Plus size={13} /> Add First Test Case
                </button>
              </div>
            ) : (
              <>
                <div className="tc-list">
                  {testCases.map((tc, index) => (
                    <div
                      key={tc.id}
                      className="tc-card"
                      style={{ animationDelay: `${index * 0.04}s` }}
                    >
                      <div className="tc-card-header">
                        <div className="tc-card-label">
                          <span className="tc-card-num">#{index + 1}</span>
                          <span className="tc-card-title">Test Case</span>
                        </div>
                        <button
                          className="tc-btn-delete"
                          onClick={() => deleteTestCase(tc.id)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="tc-card-fields">
                        <div className="tc-field">
                          <label className="tc-field-label">Input</label>
                          <textarea
                            className="tc-textarea"
                            value={tc.input}
                            onChange={(e) =>
                              updateTestCase(tc.id, "input", e.target.value)
                            }
                            placeholder="e.g. 5&#10;3 1 4 1 5"
                            rows={2}
                            spellCheck={false}
                          />
                        </div>
                        <div className="tc-field">
                          <label className="tc-field-label">
                            Expected Output
                          </label>
                          <textarea
                            className="tc-textarea expected"
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              updateTestCase(
                                tc.id,
                                "expectedOutput",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. 14"
                            rows={2}
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="tc-btn-add" onClick={addTestCase}>
                  <Plus size={13} /> Add Test Case
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="tc-results">
            {isRunning ? (
              <div className="tc-running">
                <div className="tc-running-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <p>
                  Running {testCases.length} test
                  {testCases.length !== 1 ? "s" : ""}...
                </p>
              </div>
            ) : testResults?.error ? (
              <div className="tc-empty">
                <XCircle size={32} className="tc-empty-icon error" />
                <p className="tc-empty-title">Execution Failed</p>
                <p className="tc-empty-sub tc-error-msg">{testResults.error}</p>
              </div>
            ) : testResults?.results ? (
              <>
                <div className="tc-summary">
                  <div className="tc-summary-bar">
                    <div
                      className="tc-summary-fill"
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                  <div className="tc-summary-stats">
                    <span className="tc-stat passed">
                      <CheckCircle size={12} />
                      {testResults.summary.passed} passed
                    </span>
                    <span className="tc-stat failed">
                      <XCircle size={12} />
                      {testResults.summary.failed} failed
                    </span>
                    <span className="tc-stat rate">{passRate}%</span>
                  </div>
                </div>
                <div className="tc-result-list">
                  {testResults.results.map((result, idx) => {
                    const expanded = expandedResults.has(idx);
                    return (
                      <div
                        key={idx}
                        className={`tc-result-card ${result.passed ? "pass" : "fail"}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <button
                          className="tc-result-header"
                          onClick={() => toggleResultExpand(idx)}
                        >
                          <div className="tc-result-left">
                            {result.passed ? (
                              <CheckCircle size={14} className="icon-pass" />
                            ) : (
                              <XCircle size={14} className="icon-fail" />
                            )}
                            <span className="tc-result-name">
                              Test #{result.testCase}
                            </span>
                            {result.error && (
                              <span className="tc-result-error-badge">
                                Error
                              </span>
                            )}
                          </div>
                          <div className="tc-result-right">
                            <span className="tc-result-time">
                              <Clock size={11} />
                              {result.executionTime}ms
                            </span>
                            {expanded ? (
                              <ChevronUp size={13} />
                            ) : (
                              <ChevronDown size={13} />
                            )}
                          </div>
                        </button>
                        {expanded && (
                          <div className="tc-result-body">
                            {result.input && (
                              <div className="tc-result-section">
                                <span className="tc-result-label">Input</span>
                                <pre className="tc-result-pre input">
                                  {result.input}
                                </pre>
                              </div>
                            )}
                            <div className="tc-result-section">
                              <span className="tc-result-label">Expected</span>
                              <pre className="tc-result-pre expected">
                                {result.expectedOutput}
                              </pre>
                            </div>
                            <div className="tc-result-section">
                              <span className="tc-result-label">Got</span>
                              <pre
                                className={`tc-result-pre ${result.passed ? "got-pass" : "got-fail"}`}
                              >
                                {result.actualOutput}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="tc-empty">
                <FlaskConical size={32} className="tc-empty-icon" />
                <p className="tc-empty-title">No results yet</p>
                <p className="tc-empty-sub">
                  Run your test cases to see results
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TestCases;
