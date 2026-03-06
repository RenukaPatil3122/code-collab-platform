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
import { SOCKET_EVENTS, EXT_TO_LANGUAGE } from "../utils/constants";
import toast from "react-hot-toast";

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error("useRoom must be used within RoomProvider");
  return context;
};

const detectLang = (fileName) => {
  if (!fileName) return null;
  const ext = fileName.split(".").pop().toLowerCase();
  return EXT_TO_LANGUAGE[ext] || null;
};

export const RoomProvider = ({ children, roomId, username }) => {
  const activeFileRef = useRef(null);
  const updateFileContentRef = useRef(null);

  const injectActiveFile = useCallback((fileData, updateFn) => {
    activeFileRef.current = fileData;
    if (updateFn) updateFileContentRef.current = updateFn;
  }, []);

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

  const chatMessagesRef = useRef([]);
  const [chatMessages, setChatMessages] = useState([]);
  const runStartTimeRef = useRef(null);

  const clearOutput = useCallback(() => {
    setOutput("");
    setExecutionTime(null);
    setMemoryUsed(null);
  }, []);

  const addChatMessage = useCallback((msg) => {
    chatMessagesRef.current = [...chatMessagesRef.current, msg];
    setChatMessages([...chatMessagesRef.current]);
  }, []);

  const setChatHistory = useCallback((msgs) => {
    chatMessagesRef.current = msgs;
    setChatMessages([...msgs]);
  }, []);

  useEffect(() => {
    if (code && roomId) localStorage.setItem(`ct-code-${roomId}`, code);
  }, [code, roomId]);

  useEffect(() => {
    if (!roomId || !username) return;

    socket.disconnect();
    socket.connect();

    const handleConnected = () => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, username });
    };
    socket.once("connect", handleConnected);

    socket.on(
      SOCKET_EVENTS.ROOM_STATE,
      ({
        code: initialCode,
        language: initialLang,
        users: roomUsers,
        testCases: roomTestCases,
        stdin: roomStdin,
        chatMessages: roomChat,
      }) => {
        const saved = localStorage.getItem(`ct-code-${roomId}`);
        setCode(saved || initialCode);
        setLanguage(initialLang);
        setUsers(roomUsers);
        setTestCases(roomTestCases || []);
        setIsConnected(true);
        if (roomStdin) setStdin(roomStdin);
        if (roomChat && roomChat.length > 0) {
          setChatHistory(roomChat);
          window.dispatchEvent(
            new CustomEvent("chat-history", {
              detail: { roomId, messages: roomChat },
            }),
          );
        }
        toast.success("Connected!", { duration: 1500, id: "room-connected" });
      },
    );

    socket.on(
      SOCKET_EVENTS.USER_JOINED,
      ({ username: newUser, users: updatedUsers }) => {
        setUsers(updatedUsers);
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

    // CODE_UPDATE intentionally NOT handled here.
    // CodeEditor listens to it directly and applies via applyRemoteContent.
    // Having RoomContext also handle it caused a double-apply loop.

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
        setExecutionTime(time || clientTime);
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

    socket.on(SOCKET_EVENTS.TEST_CASES_UPDATED, ({ testCases: updated }) =>
      setTestCases(updated),
    );

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
      setOutput("Cancelled");
      setExecutionTime(null);
      setMemoryUsed(null);
      runStartTimeRef.current = null;
    });

    socket.on("chat-message", (msg) => addChatMessage(msg));

    return () => {
      socket.off("connect", handleConnected);
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off(SOCKET_EVENTS.USER_JOINED);
      socket.off(SOCKET_EVENTS.USER_LEFT);
      socket.off(SOCKET_EVENTS.LANGUAGE_UPDATE);
      socket.off(SOCKET_EVENTS.CODE_OUTPUT);
      socket.off(SOCKET_EVENTS.TEST_CASES_UPDATED);
      socket.off(SOCKET_EVENTS.TEST_RESULTS);
      socket.off("execution-cancelled");
      socket.off("chat-message");
      socket.disconnect();
      setIsConnected(false);
    };
  }, [roomId, username]);

  const updateCode = useCallback((newCode) => {
    // ── THE FIX ──────────────────────────────────────────────────────────────
    // Only update RoomContext.code state here.
    // DO NOT call updateFileContent — CodeEditor's onDidChangeContent already
    // called it. Calling it again here was causing double-emit per keystroke:
    // keystroke → updateFileContent (emit #1) → onChange → updateCode →
    // updateFileContent again (emit #2) → server gets 2 updates → Rose gets
    // 2 updates → content thrashes back and forth.
    // ─────────────────────────────────────────────────────────────────────────
    setCode(newCode);
  }, []);

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
      if (detected) {
        setLanguage(detected);
        socket.emit(SOCKET_EVENTS.LANGUAGE_CHANGE, {
          roomId,
          language: detected,
        });
      }
    },
    [roomId],
  );

  const cancelExecution = useCallback(() => {
    socket.emit("cancel-execution");
    setIsRunning(false);
    setOutput("Cancelled");
    setExecutionTime(null);
    setMemoryUsed(null);
    runStartTimeRef.current = null;
  }, []);

  const runCode = useCallback(() => {
    const activeFile = activeFileRef.current;
    const currentContent = activeFile?.content ?? code;
    const currentFileName = activeFile?.name ?? "main.js";
    const detectedLang = detectLang(currentFileName) || language;

    if (!currentContent?.trim()) {
      toast.error("Open a file and write some code first!", {
        id: "run-no-code",
      });
      return;
    }

    setIsRunning(true);
    setOutput("Running...");
    setShowOutput(true);
    setExecutionTime(null);
    setMemoryUsed(null);
    runStartTimeRef.current = Date.now();

    socket.emit(SOCKET_EVENTS.RUN_CODE, {
      roomId,
      code: currentContent,
      language: detectedLang,
      stdin: stdin || "",
      activeFile: currentFileName,
    });
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
    const activeFile = activeFileRef.current;
    const currentContent = activeFile?.content ?? code;
    if (!currentContent?.trim()) {
      toast.error("Open a file first!", { id: "run-no-code" });
      return;
    }
    setIsRunningTests(true);
    setTestResults(null);
    socket.emit(SOCKET_EVENTS.RUN_TEST_CASES, {
      roomId,
      code: currentContent,
      language,
      testCases,
    });
  }, [roomId, code, language, testCases]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"));
  }, []);

  const sendChatMessage = useCallback(
    (message) => {
      if (!message?.trim()) return;
      socket.emit("chat-message", { roomId, message: message.trim() });
    },
    [roomId],
  );

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
    injectActiveFile,
    clearOutput,
    chatMessages,
    sendChatMessage,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
