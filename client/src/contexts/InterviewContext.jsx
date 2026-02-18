// src/contexts/InterviewContext.jsx
// ✅ Sets state BEFORE socket emit (interview shows immediately)
// ✅ Handles replay - shows interview read-only without starting real timer

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
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [interviewResults, setInterviewResults] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [interviewCode, setInterviewCode] = useState("");
  const [interviewLanguage, setInterviewLanguage] = useState("javascript");
  const timerRef = useRef(null);

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
            toast("⏰ 5 minutes remaining!", { icon: "⚠️", duration: 5000 });
          if (prev === 60)
            toast("⏰ 1 minute remaining!", { icon: "🚨", duration: 5000 });
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

  // ✅ Listen for replay events to show interview during playback (READ-ONLY)
  useEffect(() => {
    const handleReplayEvent = (e) => {
      const { type, data } = e.detail;
      if (type === "interview-started") {
        // Show interview fullscreen during replay WITHOUT starting timer
        if (data.problem) {
          setCurrentProblem(data.problem);
          setDifficulty(data.difficulty || "easy");
          setInterviewLanguage(data.language || "javascript");
          setInterviewCode(data.starterCode || "");
          setTimeRemaining(INTERVIEW_DURATIONS[data.difficulty || "easy"]);
          setIsInterviewMode(true);
          setIsTimerRunning(false); // ✅ NO timer during replay
        }
      } else if (type === "replay-stopped") {
        // Clean up interview when replay ends
        setIsInterviewMode(false);
        setCurrentProblem(null);
        setInterviewCode("");
        setTimeRemaining(0);
        setIsTimerRunning(false);
      }
    };
    window.addEventListener("replay-event", handleReplayEvent);
    return () => window.removeEventListener("replay-event", handleReplayEvent);
  }, []);

  // Socket events from other users
  useEffect(() => {
    socket.on(
      SOCKET_EVENTS.INTERVIEW_STARTED,
      ({ problem, difficulty, duration }) => {
        setCurrentProblem(problem);
        setDifficulty(difficulty);
        setTimeRemaining(duration);
        setIsInterviewMode(true);
        setIsTimerRunning(true);
        setStartTime(Date.now());
        toast.success(
          `Interview started! Difficulty: ${difficulty.toUpperCase()}`,
        );
      },
    );
    socket.on(SOCKET_EVENTS.INTERVIEW_ENDED, () => {
      handleEndInterview();
    });
    socket.on(SOCKET_EVENTS.INTERVIEW_RESULTS, ({ results }) => {
      setInterviewResults(results);
      setIsInterviewMode(false);
      setIsTimerRunning(false);
    });
    return () => {
      socket.off(SOCKET_EVENTS.INTERVIEW_STARTED);
      socket.off(SOCKET_EVENTS.INTERVIEW_ENDED);
      socket.off(SOCKET_EVENTS.INTERVIEW_RESULTS);
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

      // ✅ Set state FIRST (don't wait for socket)
      setInterviewCode(starterCode);
      setInterviewLanguage(selectedLanguage);
      setCurrentProblem(selectedProblem);
      setDifficulty(selectedDifficulty);
      setTimeRemaining(duration);
      setIsInterviewMode(true);
      setIsTimerRunning(true);
      setStartTime(Date.now());
      setInterviewResults(null);

      socket.emit(SOCKET_EVENTS.START_INTERVIEW, {
        roomId,
        problem: selectedProblem,
        difficulty: selectedDifficulty,
        duration,
      });

      return { starterCode, problem: selectedProblem };
    },
    [roomId],
  );

  const endInterview = useCallback(() => {
    socket.emit(SOCKET_EVENTS.END_INTERVIEW, { roomId });
    handleEndInterview();
  }, [roomId]);

  const handleEndInterview = () => {
    setIsInterviewMode(false);
    setIsTimerRunning(false);
    setInterviewCode("");
    setCurrentProblem(null);
    toast("Interview ended", { icon: "🏁" });
  };

  const handleTimeUp = () => {
    setIsTimerRunning(false);
    toast.error("⏰ Time's up! Interview ended.");
    socket.emit(SOCKET_EVENTS.END_INTERVIEW, { roomId, reason: "timeout" });
  };

  const submitInterview = useCallback(
    (testResults) => {
      const timeTaken = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;
      const totalTime = INTERVIEW_DURATIONS[difficulty];
      socket.emit(SOCKET_EVENTS.SUBMIT_INTERVIEW, {
        roomId,
        code: interviewCode,
        testResults,
        timeTaken,
        totalTime,
        difficulty,
        problem: currentProblem,
      });
      const score = calculateScore(testResults, timeTaken, totalTime);
      setInterviewResults({
        code: interviewCode,
        testResults,
        timeTaken,
        totalTime,
        score,
        difficulty,
        problem: currentProblem,
      });
      setIsInterviewMode(false);
      setIsTimerRunning(false);
      setInterviewCode("");
      toast.success("Interview submitted!");
    },
    [roomId, difficulty, currentProblem, startTime, interviewCode],
  );

  const calculateScore = (testResults, timeTaken, totalTime) => {
    if (!testResults?.summary) return 0;
    const { passed, total } = testResults.summary;
    return Math.round(
      (passed / total) * 70 +
        Math.max(0, ((totalTime - timeTaken) / totalTime) * 30),
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const value = {
    isInterviewMode,
    currentProblem,
    difficulty,
    timeRemaining,
    isTimerRunning,
    interviewResults,
    interviewCode,
    interviewLanguage,
    startInterview,
    endInterview,
    submitInterview,
    pauseTimer: useCallback(() => setIsTimerRunning(false), []),
    resumeTimer: useCallback(() => setIsTimerRunning(true), []),
    formatTime,
    updateInterviewCode: useCallback(
      (newCode) => setInterviewCode(newCode),
      [],
    ),
    setInterviewCode,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};
