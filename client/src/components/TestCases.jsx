import React, { useState } from "react";
import {
  Plus,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import "./TestCases.css";

function TestCases({ testCases, onUpdate, onClose, testResults, isRunning }) {
  const [activeTab, setActiveTab] = useState("cases"); // 'cases' or 'results'

  const addTestCase = () => {
    const newTestCase = {
      id: Date.now(),
      input: "",
      expectedOutput: "",
    };
    onUpdate([...testCases, newTestCase]);
  };

  const updateTestCase = (id, field, value) => {
    const updated = testCases.map((tc) =>
      tc.id === id ? { ...tc, [field]: value } : tc,
    );
    onUpdate(updated);
  };

  const deleteTestCase = (id) => {
    onUpdate(testCases.filter((tc) => tc.id !== id));
  };

  return (
    <div className="test-cases-panel">
      <div className="test-cases-header">
        <div className="header-tabs">
          <button
            className={`tab ${activeTab === "cases" ? "active" : ""}`}
            onClick={() => setActiveTab("cases")}
          >
            Test Cases ({testCases.length})
          </button>
          <button
            className={`tab ${activeTab === "results" ? "active" : ""}`}
            onClick={() => setActiveTab("results")}
            disabled={!testResults}
          >
            Results
            {testResults && (
              <span className="results-badge">
                {testResults.summary?.passed}/{testResults.summary?.total}
              </span>
            )}
          </button>
        </div>
        <button className="btn-close-panel" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="test-cases-content">
        {activeTab === "cases" ? (
          <div className="test-cases-list">
            {testCases.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={48} />
                <h3>No Test Cases Yet</h3>
                <p>Add test cases to validate your code</p>
                <button className="btn-add-first" onClick={addTestCase}>
                  <Plus size={18} />
                  Add First Test Case
                </button>
              </div>
            ) : (
              <>
                {testCases.map((testCase, index) => (
                  <div key={testCase.id} className="test-case-card">
                    <div className="test-case-header">
                      <span className="test-case-number">
                        Test Case {index + 1}
                      </span>
                      <button
                        className="btn-delete-test"
                        onClick={() => deleteTestCase(testCase.id)}
                        title="Delete test case"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="test-case-fields">
                      <div className="field-group">
                        <label>Input</label>
                        <textarea
                          value={testCase.input}
                          onChange={(e) =>
                            updateTestCase(testCase.id, "input", e.target.value)
                          }
                          placeholder="Enter input (e.g., [1,2,3])"
                          rows={2}
                        />
                      </div>

                      <div className="field-group">
                        <label>Expected Output</label>
                        <textarea
                          value={testCase.expectedOutput}
                          onChange={(e) =>
                            updateTestCase(
                              testCase.id,
                              "expectedOutput",
                              e.target.value,
                            )
                          }
                          placeholder="Enter expected output"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button className="btn-add-test" onClick={addTestCase}>
                  <Plus size={18} />
                  Add Test Case
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="test-results-list">
            {isRunning ? (
              <div className="loading-results">
                <div className="spinner"></div>
                <p>Running tests...</p>
              </div>
            ) : testResults?.error ? (
              <div className="error-state">
                <XCircle size={48} />
                <h3>Test Execution Failed</h3>
                <p>{testResults.error}</p>
              </div>
            ) : testResults?.results ? (
              <>
                <div className="results-summary">
                  <div className="summary-card passed">
                    <CheckCircle size={24} />
                    <div>
                      <span className="summary-number">
                        {testResults.summary.passed}
                      </span>
                      <span className="summary-label">Passed</span>
                    </div>
                  </div>
                  <div className="summary-card failed">
                    <XCircle size={24} />
                    <div>
                      <span className="summary-number">
                        {testResults.summary.failed}
                      </span>
                      <span className="summary-label">Failed</span>
                    </div>
                  </div>
                  <div className="summary-card total">
                    <AlertCircle size={24} />
                    <div>
                      <span className="summary-number">
                        {testResults.summary.total}
                      </span>
                      <span className="summary-label">Total</span>
                    </div>
                  </div>
                </div>

                <div className="results-list">
                  {testResults.results.map((result, index) => (
                    <div
                      key={index}
                      className={`result-card ${result.passed ? "passed" : "failed"}`}
                    >
                      <div className="result-header">
                        <div className="result-title">
                          {result.passed ? (
                            <CheckCircle size={20} className="icon-passed" />
                          ) : (
                            <XCircle size={20} className="icon-failed" />
                          )}
                          <span>Test Case {result.testCase}</span>
                        </div>
                        <div className="result-time">
                          <Clock size={14} />
                          <span>{result.executionTime}ms</span>
                        </div>
                      </div>

                      <div className="result-details">
                        <div className="detail-section">
                          <label>Input:</label>
                          <pre>{result.input || "None"}</pre>
                        </div>

                        <div className="detail-section">
                          <label>Expected Output:</label>
                          <pre className="expected">
                            {result.expectedOutput}
                          </pre>
                        </div>

                        <div className="detail-section">
                          <label>Actual Output:</label>
                          <pre
                            className={
                              result.passed ? "actual-passed" : "actual-failed"
                            }
                          >
                            {result.actualOutput}
                          </pre>
                        </div>

                        {result.error && (
                          <div className="error-message">
                            <AlertCircle size={16} />
                            <span>Execution Error</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-results">
                <AlertCircle size={48} />
                <h3>No Results Yet</h3>
                <p>Run tests to see results here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TestCases;
