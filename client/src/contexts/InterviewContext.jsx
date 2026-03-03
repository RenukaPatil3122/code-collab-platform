// src/contexts/InterviewContext.jsx
// ✅ totalDuration exposed for TimerWidget percentage
// ✅ pauseTimer/resumeTimer defined as proper useCallback at top level
// ✅ No inline useCallback in value object

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { socket } from "../utils/socket";
import { SOCKET_EVENTS, INTERVIEW_DURATIONS } from "../utils/constants";
import { getRandomProblem } from "../utils/interviewProblems";
import toast from "react-hot-toast";

const InterviewContext = createContext();

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context)
    throw new Error("useInterview must be used within InterviewProvider");
  return context;
};

export const InterviewProvider = ({ children, roomId }) => {
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [timeRemaining, setTimeRemaining] = useState(0);
  // ✅ totalDuration tracks the full time so TimerWidget can show correct %
  const [totalDuration, setTotalDuration] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [interviewResults, setInterviewResults] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [interviewCode, setInterviewCode] = useState("");
  const [interviewLanguage, setInterviewLanguage] = useState("javascript");
  const [interviewLimitError, setInterviewLimitError] = useState(null);

  const pendingInterview = useRef(null);
  const timerRef = useRef(null);
  const isEndingLocally = useRef(false);

  // ✅ Defined at top level as proper useCallback — not inline in value object
  const pauseTimer = useCallback(() => setIsTimerRunning(false), []);
  const resumeTimer = useCallback(() => setIsTimerRunning(true), []);
  const updateInterviewCode = useCallback(
    (newCode) => setInterviewCode(newCode),
    [],
  );
  const clearInterviewLimitError = useCallback(
    () => setInterviewLimitError(null),
    [],
  );

  // Timer logic
  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          if (prev === 300)
            toast("⏰ 5 minutes remaining!", {
              icon: "⚠️",
              duration: 5000,
              id: "timer-5min",
            });
          if (prev === 60)
            toast("⏰ 1 minute remaining!", {
              icon: "🚨",
              duration: 5000,
              id: "timer-1min",
            });
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeRemaining]);

  // Replay events
  useEffect(() => {
    const handleReplayEvent = (e) => {
      const { type, data } = e.detail;
      if (type === "interview-started") {
        if (data.problem) {
          const dur = INTERVIEW_DURATIONS[data.difficulty || "easy"];
          setCurrentProblem(data.problem);
          setDifficulty(data.difficulty || "easy");
          setInterviewLanguage(data.language || "javascript");
          setInterviewCode(data.starterCode || "");
          setTimeRemaining(dur);
          setTotalDuration(dur);
          setIsInterviewMode(true);
          setIsTimerRunning(false);
        }
      } else if (type === "replay-stopped") {
        setIsInterviewMode(false);
        setCurrentProblem(null);
        setInterviewCode("");
        setTimeRemaining(0);
        setTotalDuration(0);
        setIsTimerRunning(false);
      }
    };
    window.addEventListener("replay-event", handleReplayEvent);
    return () => window.removeEventListener("replay-event", handleReplayEvent);
  }, []);

  // Socket events
  useEffect(() => {
    socket.on(
      SOCKET_EVENTS.INTERVIEW_STARTED,
      ({ problem, difficulty, duration }) => {
        const pending = pendingInterview.current;
        pendingInterview.current = null;

        const resolvedProblem = pending?.problem || problem;
        const resolvedLanguage = pending?.language || "javascript";
        const resolvedCode =
          pending?.starterCode ||
          resolvedProblem.starterCode?.[resolvedLanguage] ||
          resolvedProblem.starterCode?.javascript ||
          `// ${resolvedProblem.title}\n// Write your solution here\n\nfunction solve() {\n    // Your code here\n}\n`;

        setInterviewCode(resolvedCode);
        setInterviewLanguage(resolvedLanguage);
        setCurrentProblem(resolvedProblem);
        setDifficulty(difficulty);
        setTimeRemaining(duration);
        setTotalDuration(duration); // ✅ store for TimerWidget
        setIsInterviewMode(true);
        setIsTimerRunning(true);
        setStartTime(Date.now());
        setInterviewResults(null);

        toast.success(`Interview started! ${difficulty.toUpperCase()}`, {
          id: "interview-started",
          duration: 2000,
        });
      },
    );

    socket.on(SOCKET_EVENTS.INTERVIEW_ENDED, () => {
      if (isEndingLocally.current) {
        isEndingLocally.current = false;
        return;
      }
      handleEndInterview();
    });

    socket.on(SOCKET_EVENTS.INTERVIEW_RESULTS, ({ results }) => {
      setInterviewResults(results);
      setIsInterviewMode(false);
      setIsTimerRunning(false);
    });

    socket.on("interview-error", ({ error, message }) => {
      pendingInterview.current = null;
      setInterviewLimitError({ error, message });
    });

    return () => {
      socket.off(SOCKET_EVENTS.INTERVIEW_STARTED);
      socket.off(SOCKET_EVENTS.INTERVIEW_ENDED);
      socket.off(SOCKET_EVENTS.INTERVIEW_RESULTS);
      socket.off("interview-error");
    };
  }, []);

  const startInterview = useCallback(
    (
      selectedDifficulty = "easy",
      problem = null,
      selectedLanguage = "javascript",
    ) => {
      const selectedProblem = problem || getRandomProblem(selectedDifficulty);
      const duration = INTERVIEW_DURATIONS[selectedDifficulty];
      const starterCode =
        selectedProblem.starterCode?.[selectedLanguage] ||
        selectedProblem.starterCode?.javascript ||
        `// ${selectedProblem.title}\n// Write your solution here\n\nfunction solve() {\n    // Your code here\n}\n`;

      pendingInterview.current = {
        problem: selectedProblem,
        language: selectedLanguage,
        starterCode,
        difficulty: selectedDifficulty,
        duration,
      };

      socket.emit(SOCKET_EVENTS.START_INTERVIEW, {
        roomId,
        problem: selectedProblem,
        difficulty: selectedDifficulty,
        duration,
      });
    },
    [roomId],
  );

  const handleEndInterview = () => {
    setIsInterviewMode(false);
    setIsTimerRunning(false);
    setInterviewCode("");
    setCurrentProblem(null);
    setTotalDuration(0);
    toast("Interview ended", {
      icon: "🏁",
      id: "interview-ended",
      duration: 2000,
    });
  };

  const endInterview = useCallback(() => {
    isEndingLocally.current = true;
    socket.emit(SOCKET_EVENTS.END_INTERVIEW, { roomId });
    handleEndInterview();
  }, [roomId]);

  const handleTimeUp = () => {
    setIsTimerRunning(false);
    toast.error("⏰ Time's up! Interview ended.", {
      id: "interview-timeout",
      duration: 3000,
    });
    isEndingLocally.current = true;
    socket.emit(SOCKET_EVENTS.END_INTERVIEW, { roomId, reason: "timeout" });
  };

  const submitInterview = useCallback(
    (testResults) => {
      const timeTaken = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;
      const total = totalDuration || INTERVIEW_DURATIONS[difficulty];
      socket.emit(SOCKET_EVENTS.SUBMIT_INTERVIEW, {
        roomId,
        code: interviewCode,
        testResults,
        timeTaken,
        totalTime: total,
        difficulty,
        problem: currentProblem,
      });
      const score = calculateScore(testResults, timeTaken, total);
      setInterviewResults({
        code: interviewCode,
        testResults,
        timeTaken,
        totalTime: total,
        score,
        difficulty,
        problem: currentProblem,
      });
      setIsInterviewMode(false);
      setIsTimerRunning(false);
      setInterviewCode("");
      toast.success("Interview submitted!", {
        id: "interview-submitted",
        duration: 2000,
      });
    },
    [
      roomId,
      difficulty,
      currentProblem,
      startTime,
      interviewCode,
      totalDuration,
    ],
  );

  const calculateScore = (testResults, timeTaken, total) => {
    if (!testResults?.summary) return 0;
    const { passed, totalTests } = testResults.summary;
    const t = totalTests || testResults.summary.total || 1;
    return Math.round(
      (passed / t) * 70 + Math.max(0, ((total - timeTaken) / total) * 30),
    );
  };

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const value = {
    isInterviewMode,
    currentProblem,
    difficulty,
    timeRemaining,
    totalDuration, // ✅ exposed for TimerWidget
    isTimerRunning,
    interviewResults,
    interviewCode,
    interviewLanguage,
    interviewLimitError,
    clearInterviewLimitError,
    startInterview,
    endInterview,
    submitInterview,
    pauseTimer, // ✅ stable ref, defined above
    resumeTimer, // ✅ stable ref, defined above
    formatTime,
    updateInterviewCode,
    setInterviewCode,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};
