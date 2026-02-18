// src/components/interview/InterviewFeedback.jsx

import React from "react";
import {
  Trophy,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Award,
} from "lucide-react";
import "./InterviewFeedback.css";

function InterviewFeedback({ results, onClose }) {
  const { testResults, timeTaken, totalTime, score, difficulty, problem } =
    results;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreRating = (score) => {
    if (score >= 90) return { text: "Excellent! 🎉", class: "excellent" };
    if (score >= 75) return { text: "Great Job! 👏", class: "great" };
    if (score >= 60) return { text: "Good Effort 👍", class: "good" };
    if (score >= 40) return { text: "Keep Practicing 💪", class: "fair" };
    return { text: "Needs Improvement 📚", class: "poor" };
  };

  const rating = getScoreRating(score);

  return (
    <div className="interview-feedback-overlay">
      <div className="interview-feedback-modal">
        <div className="feedback-header">
          <Trophy size={48} className="feedback-trophy" />
          <h2>Interview Complete!</h2>
          <p className="feedback-subtitle">{problem.title}</p>
        </div>

        {/* Score Card */}
        <div className={`score-card ${rating.class}`}>
          <div className="score-main">
            <div className="score-number">{score}</div>
            <div className="score-total">/ 100</div>
          </div>
          <div className="score-rating">{rating.text}</div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Difficulty</div>
              <div className="stat-value">{difficulty.toUpperCase()}</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Time Taken</div>
              <div className="stat-value">
                {formatTime(timeTaken)} / {formatTime(totalTime)}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Tests Passed</div>
              <div className="stat-value">
                {testResults?.summary?.passed || 0} /{" "}
                {testResults?.summary?.total || 0}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Success Rate</div>
              <div className="stat-value">
                {testResults?.summary?.total
                  ? Math.round(
                      (testResults.summary.passed / testResults.summary.total) *
                        100,
                    )
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Test Results Breakdown */}
        {testResults?.results && testResults.results.length > 0 && (
          <div className="test-results-breakdown">
            <h3>Test Results</h3>
            <div className="test-results-list">
              {testResults.results.map((result, idx) => (
                <div
                  key={idx}
                  className={`test-result-item ${result.passed ? "passed" : "failed"}`}
                >
                  <div className="test-result-icon">
                    {result.passed ? (
                      <CheckCircle size={20} className="icon-pass" />
                    ) : (
                      <XCircle size={20} className="icon-fail" />
                    )}
                  </div>
                  <div className="test-result-content">
                    <div className="test-result-header">
                      <span className="test-number">
                        Test Case {result.testCase}
                      </span>
                      <span className="test-time">
                        {result.executionTime}ms
                      </span>
                    </div>
                    {!result.passed && (
                      <div className="test-result-details">
                        <div className="test-expected">
                          Expected: {result.expectedOutput}
                        </div>
                        <div className="test-actual">
                          Got: {result.actualOutput}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Insights */}
        <div className="performance-insights">
          <h3>
            <Award size={20} /> Performance Insights
          </h3>
          <ul>
            {score >= 90 && (
              <li className="insight-excellent">
                ✨ Outstanding performance! You solved this efficiently.
              </li>
            )}
            {score < 90 && score >= 70 && (
              <li className="insight-good">
                👍 Good work! Consider optimizing your solution further.
              </li>
            )}
            {testResults?.summary?.passed === testResults?.summary?.total && (
              <li className="insight-excellent">
                ✅ Perfect! All test cases passed.
              </li>
            )}
            {timeTaken < totalTime * 0.5 && (
              <li className="insight-excellent">
                ⚡ Great time management! Finished in less than half the
                allocated time.
              </li>
            )}
            {timeTaken > totalTime * 0.9 && (
              <li className="insight-warning">
                ⏰ Work on speed - try to solve problems faster.
              </li>
            )}
            {testResults?.summary &&
              testResults.summary.passed < testResults.summary.total && (
                <li className="insight-warning">
                  🐛 Some edge cases failed. Review your solution for
                  correctness.
                </li>
              )}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="feedback-actions">
          <button className="btn-close-feedback" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-try-again"
            onClick={() => window.location.reload()}
          >
            Try Another Problem
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewFeedback;
