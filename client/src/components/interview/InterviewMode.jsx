// src/components/interview/InterviewMode.jsx
// ✅ SCREEN RECORDING VERSION - No event capture needed

import React, { useState, useEffect, useRef } from "react";
import { useInterview } from "../../contexts/InterviewContext";
import { useRoom } from "../../contexts/RoomContext";
import { INTERVIEW_DIFFICULTIES } from "../../utils/constants";
import {
  INTERVIEW_PROBLEMS,
  getRandomProblem,
} from "../../utils/interviewProblems";
import ProblemPanel from "./ProblemPanel";
import TimerWidget from "./TimerWidget";
import InterviewFeedback from "./InterviewFeedback";
import InterviewEditor from "./InterviewEditor";
import {
  Trophy,
  Clock,
  Code,
  X,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  Languages,
} from "lucide-react";
import "./InterviewMode.css";

function InterviewMode({ onClose }) {
  const {
    isInterviewMode,
    currentProblem,
    difficulty,
    interviewResults,
    interviewLanguage,
    startInterview,
    endInterview,
    submitInterview,
  } = useInterview();
  const { testResults, theme } = useRoom();

  const [selectedDifficulty, setSelectedDifficulty] = useState(
    INTERVIEW_DIFFICULTIES.EASY,
  );
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [showProblemSelect, setShowProblemSelect] = useState(false);
  const problemPanelRef = useRef(null);

  const handleStart = () => {
    const problem = selectedProblem || getRandomProblem(selectedDifficulty);
    startInterview(selectedDifficulty, problem, selectedLanguage);
    onClose();
  };

  const handleSubmit = () => {
    if (
      window.confirm(
        "Are you sure you want to submit? This will end the interview.",
      )
    ) {
      submitInterview(testResults);
    }
  };

  const handleEnd = () => {
    if (window.confirm("Are you sure you want to end the interview?")) {
      endInterview();
    }
  };

  // ✅ Show fullscreen interview FIRST (highest priority)
  if (isInterviewMode && currentProblem) {
    return (
      <div className="interview-mode-fullscreen">
        <div className="interview-header">
          <div className="interview-header-left">
            <Trophy className="interview-icon" />
            <div>
              <h3>Interview Mode - {currentProblem.title}</h3>
              <span className={`difficulty-badge ${difficulty}`}>
                {difficulty.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="interview-header-right">
            <TimerWidget />
            <button className="btn-submit-interview" onClick={handleSubmit}>
              <CheckCircle size={18} /> Submit
            </button>
            <button className="btn-end-interview" onClick={handleEnd}>
              <Square size={18} /> End
            </button>
          </div>
        </div>

        <div className="interview-content-split">
          <div className="interview-problem-side" ref={problemPanelRef}>
            <ProblemPanel problem={currentProblem} />
          </div>
          <div className="interview-editor-side">
            <div className="interview-editor-header">
              <Code size={16} />
              <span>Code Editor ({interviewLanguage})</span>
            </div>
            <div className="interview-editor-container">
              <InterviewEditor theme={theme} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (interviewResults) {
    return <InterviewFeedback results={interviewResults} onClose={onClose} />;
  }

  // Setup/start screen
  return (
    <div className="interview-mode-overlay">
      <div className="interview-mode-modal">
        <div className="interview-modal-header">
          <div className="interview-modal-title">
            <Trophy size={24} />
            <h2>Interview Mode</h2>
          </div>
          <button className="btn-close-interview" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="interview-modal-content">
          <div className="interview-info-card">
            <Clock size={20} />
            <div>
              <h4>Timed Coding Challenge</h4>
              <p>
                Solve algorithmic problems under time pressure, just like real
                interviews!
              </p>
            </div>
          </div>

          <div className="language-selection">
            <h3>
              <Languages size={20} /> Select Programming Language
            </h3>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="interview-language-dropdown"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>

          <div className="difficulty-selection">
            <h3>Select Difficulty</h3>
            <div className="difficulty-options">
              {[
                {
                  key: INTERVIEW_DIFFICULTIES.EASY,
                  label: "Easy",
                  time: "15 minutes",
                  desc: "Basic problems, good for beginners",
                },
                {
                  key: INTERVIEW_DIFFICULTIES.MEDIUM,
                  label: "Medium",
                  time: "30 minutes",
                  desc: "Intermediate algorithmic challenges",
                },
                {
                  key: INTERVIEW_DIFFICULTIES.HARD,
                  label: "Hard",
                  time: "45 minutes",
                  desc: "Advanced problems for experts",
                },
              ].map(({ key, label, time, desc }) => (
                <button
                  key={key}
                  className={`difficulty-btn ${key} ${selectedDifficulty === key ? "active" : ""}`}
                  onClick={() => setSelectedDifficulty(key)}
                >
                  <div className="difficulty-label">{label}</div>
                  <div className="difficulty-time">{time}</div>
                  <div className="difficulty-desc">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="problem-selection">
            <div className="problem-selection-header">
              <h3>Choose Problem</h3>
              <button
                className="btn-toggle-problems"
                onClick={() => setShowProblemSelect(!showProblemSelect)}
              >
                {showProblemSelect ? "Hide" : "Show"} Problems
              </button>
            </div>
            {showProblemSelect && (
              <div className="problem-list">
                {INTERVIEW_PROBLEMS[selectedDifficulty].map((problem) => (
                  <div
                    key={problem.id}
                    className={`problem-item ${selectedProblem?.id === problem.id ? "selected" : ""}`}
                    onClick={() => setSelectedProblem(problem)}
                  >
                    <Code size={16} />
                    <div className="problem-info">
                      <h4>{problem.title}</h4>
                      <p>{problem.description.substring(0, 100)}...</p>
                    </div>
                    {selectedProblem?.id === problem.id && (
                      <CheckCircle size={16} className="selected-icon" />
                    )}
                  </div>
                ))}
              </div>
            )}
            {!selectedProblem && (
              <div className="random-problem-notice">
                <AlertCircle size={16} />
                <span>A random problem will be selected</span>
              </div>
            )}
          </div>

          <button className="btn-start-interview" onClick={handleStart}>
            <Play size={20} />
            Start Interview in{" "}
            {selectedLanguage.charAt(0).toUpperCase() +
              selectedLanguage.slice(1)}
          </button>

          <div className="interview-tips">
            <h4>💡 Tips</h4>
            <ul>
              <li>Read the problem carefully before coding</li>
              <li>Think about edge cases and test cases</li>
              <li>Code efficiency matters - optimize when possible</li>
              <li>Submit before time runs out!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewMode;
