// src/contexts/RoomContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { socket } from "../utils/socket";
import { SOCKET_EVENTS } from "../utils/constants";
import toast from "react-hot-toast";

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error("useRoom must be used within RoomProvider");
  return context;
};

const EXT_LANGUAGE_MAP = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "c",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
};

const detectLang = (fileName) => {
  if (!fileName) return null;
  const ext = fileName.split(".").pop().toLowerCase();
  return EXT_LANGUAGE_MAP[ext] || null;
};

export const RoomProvider = ({ children, roomId, username }) => {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [memoryUsed, setMemoryUsed] = useState(null);

  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState("");

  const [testCases, setTestCases] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [showTestCases, setShowTestCases] = useState(false);
  const [theme, setTheme] = useState("vs-dark");

  useEffect(() => {
    if (code && roomId) {
      localStorage.setItem(`ct-code-${roomId}`, code);
    }
  }, [code, roomId]);

  useEffect(() => {
    if (!roomId || !username) return;

    socket.connect();
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, username });

    socket.on(
      SOCKET_EVENTS.ROOM_STATE,
      ({
        code: initialCode,
        language: initialLang,
        users: roomUsers,
        testCases: roomTestCases,
      }) => {
        const saved = localStorage.getItem(`ct-code-${roomId}`);
        setCode(saved || initialCode);
        setLanguage(initialLang);
        setUsers(roomUsers);
        setTestCases(roomTestCases || []);
        setIsConnected(true);
        // ✅ id prevents double toast from Strict Mode double-mount
        toast.success("Connected!", { duration: 1500, id: "room-connected" });
      },
    );

    socket.on(
      SOCKET_EVENTS.USER_JOINED,
      ({ username: newUser, users: updatedUsers }) => {
        setUsers(updatedUsers);
        // ✅ id includes username so different users each get one toast
        toast.success(`${newUser} joined`, {
          duration: 2000,
          id: `user-joined-${newUser}`,
        });
      },
    );

    socket.on(
      SOCKET_EVENTS.USER_LEFT,
      ({ username: leftUser, users: updatedUsers }) => {
        setUsers(updatedUsers);
        toast(`${leftUser} left`, {
          icon: "👋",
          duration: 2000,
          id: `user-left-${leftUser}`,
        });
      },
    );

    socket.on(SOCKET_EVENTS.CODE_UPDATE, ({ code: newCode }) => {
      setCode(newCode);
    });

    socket.on(SOCKET_EVENTS.LANGUAGE_UPDATE, ({ language: newLang }) => {
      setLanguage(newLang);
      toast(`→ ${newLang}`, { duration: 1200, id: `lang-update-${newLang}` });
    });

    socket.on(
      SOCKET_EVENTS.CODE_OUTPUT,
      ({
        output: result,
        error,
        success,
        executionTime: time,
        memoryUsed: memory,
      }) => {
        setIsRunning(false);
        const clientTime = runStartTimeRef.current
          ? Date.now() - runStartTimeRef.current
          : null;
        setExecutionTime(time || clientTime); // prefer real Judge0 CPU time
        setMemoryUsed(memory || null);
        runStartTimeRef.current = null;
        if (success) {
          setOutput(result);
          toast.success("Done!", { duration: 1500, id: "code-output-done" });
        } else {
          setOutput(`Error:\n${error}`);
          toast.error("Error", { duration: 2000, id: "code-output-error" });
        }
        setShowOutput(true);
      },
    );

    socket.on(SOCKET_EVENTS.TEST_CASES_UPDATED, ({ testCases: updated }) => {
      setTestCases(updated);
    });

    socket.on(SOCKET_EVENTS.TEST_RESULTS, ({ results, summary, error }) => {
      setIsRunningTests(false);
      if (error) {
        toast.error("Tests failed", {
          duration: 2000,
          id: "test-results-fail",
        });
        setTestResults({ results: [], error });
      } else {
        setTestResults({ results, summary });
        toast.success(`${summary.passed}/${summary.total} passed!`, {
          duration: 2000,
          id: "test-results-pass",
        });
      }
    });

    socket.on("execution-cancelled", () => {
      setIsRunning(false);
      setOutput("Execution cancelled.");
      runStartTimeRef.current = null;
    });

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off(SOCKET_EVENTS.USER_JOINED);
      socket.off(SOCKET_EVENTS.USER_LEFT);
      socket.off(SOCKET_EVENTS.CODE_UPDATE);
      socket.off(SOCKET_EVENTS.LANGUAGE_UPDATE);
      socket.off(SOCKET_EVENTS.CODE_OUTPUT);
      socket.off(SOCKET_EVENTS.TEST_CASES_UPDATED);
      socket.off(SOCKET_EVENTS.TEST_RESULTS);
      socket.off("execution-cancelled");
      socket.disconnect();
      setIsConnected(false);
    };
  }, [roomId, username]);

  const updateCode = useCallback(
    (newCode) => {
      setCode(newCode);
      socket.emit(SOCKET_EVENTS.CODE_CHANGE, { roomId, code: newCode });
    },
    [roomId],
  );

  const updateLanguage = useCallback(
    (newLang) => {
      setLanguage(newLang);
      socket.emit(SOCKET_EVENTS.LANGUAGE_CHANGE, { roomId, language: newLang });
    },
    [roomId],
  );

  const autoDetectLanguage = useCallback(
    (fileName) => {
      const detected = detectLang(fileName);
      if (detected && detected !== language) {
        setLanguage(detected);
        socket.emit(SOCKET_EVENTS.LANGUAGE_CHANGE, {
          roomId,
          language: detected,
        });
      }
    },
    [roomId, language],
  );

  const runStartTimeRef = useRef(null);

  const cancelExecution = useCallback(() => {
    socket.emit("cancel-execution");
    setIsRunning(false);
    runStartTimeRef.current = null;
  }, []);

  const runCode = useCallback(() => {
    if (!code.trim()) {
      toast.error("Write some code first!", { id: "run-no-code" });
      return;
    }
    setIsRunning(true);
    setOutput("Running...");
    setShowOutput(true);
    setExecutionTime(null);
    runStartTimeRef.current = Date.now(); // ✅ start client-side timer
    socket.emit(SOCKET_EVENTS.RUN_CODE, { roomId, code, language, stdin });
  }, [roomId, code, language, stdin]);

  const updateTestCases = useCallback(
    (updatedTestCases) => {
      setTestCases(updatedTestCases);
      socket.emit(SOCKET_EVENTS.UPDATE_TEST_CASES, {
        roomId,
        testCases: updatedTestCases,
      });
    },
    [roomId],
  );

  const runTests = useCallback(() => {
    if (testCases.length === 0) {
      toast.error("Add test cases first!", { id: "run-no-tests" });
      return;
    }
    if (!code.trim()) {
      toast.error("Write some code first!", { id: "run-no-code" });
      return;
    }
    setIsRunningTests(true);
    setTestResults(null);
    socket.emit(SOCKET_EVENTS.RUN_TEST_CASES, {
      roomId,
      code,
      language,
      testCases,
    });
  }, [roomId, code, language, testCases]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"));
  }, []);

  const value = {
    roomId,
    username,
    code,
    language,
    users,
    output,
    isRunning,
    stdin,
    testCases,
    testResults,
    isRunningTests,
    showChat,
    showOutput,
    showTestCases,
    theme,
    isConnected,
    executionTime,
    memoryUsed,
    cancelExecution,
    updateCode,
    updateLanguage,
    autoDetectLanguage,
    runCode,
    updateTestCases,
    runTests,
    setShowChat,
    setShowOutput,
    setShowTestCases,
    toggleTheme,
    setCode,
    setTestCases,
    setStdin,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
