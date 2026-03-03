// src/components/interview/TimerWidget.jsx
import React from "react";
import { useInterview } from "../../contexts/InterviewContext";
import { Clock, Pause, Play } from "lucide-react";
import "./TimerWidget.css";

function TimerWidget() {
  const {
    timeRemaining,
    totalDuration,
    isTimerRunning,
    formatTime,
    pauseTimer,
    resumeTimer,
  } = useInterview();

  const getTimerClass = () => {
    if (timeRemaining <= 60) return "critical";
    if (timeRemaining <= 300) return "warning";
    return "normal";
  };

  // ✅ Use actual totalDuration from context instead of hardcoded 45*60
  const percentage =
    totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;

  return (
    <div className={`timer-widget ${getTimerClass()}`}>
      <div className="timer-display">
        <Clock size={18} className="timer-icon" />
        <span className="timer-text">{formatTime(timeRemaining)}</span>
      </div>

      <div className="timer-progress-bar">
        <div
          className="timer-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <button
        className="btn-timer-control"
        onClick={isTimerRunning ? pauseTimer : resumeTimer}
        title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
      >
        {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
      </button>
    </div>
  );
}

export default TimerWidget;
