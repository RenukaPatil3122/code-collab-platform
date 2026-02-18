// src/contexts/RoomContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { socket } from "../utils/socket";
import { SOCKET_EVENTS } from "../utils/constants";
import toast from "react-hot-toast";

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within RoomProvider");
  }
  return context;
};

export const RoomProvider = ({ children, roomId, username }) => {
  // Room State
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Output State
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState(""); // ✅ stdin input

  // Test Cases State
  const [testCases, setTestCases] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // UI State
  const [showChat, setShowChat] = useState(false);
  const [showOutput, setShowOutput] = useState(true); // ✅ Show output by default
  const [showTestCases, setShowTestCases] = useState(false);
  const [theme, setTheme] = useState("vs-dark");

  // Connect to room
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
        setCode(initialCode);
        setLanguage(initialLang);
        setUsers(roomUsers);
        setTestCases(roomTestCases || []);
        setIsConnected(true);
        toast.success("Connected to room!");
      },
    );

    socket.on(
      SOCKET_EVENTS.USER_JOINED,
      ({ username: newUser, users: updatedUsers }) => {
        setUsers(updatedUsers);
        toast.success(`${newUser} joined the room`);
      },
    );

    socket.on(
      SOCKET_EVENTS.USER_LEFT,
      ({ username: leftUser, users: updatedUsers }) => {
        setUsers(updatedUsers);
        toast(`${leftUser} left the room`, { icon: "👋" });
      },
    );

    socket.on(SOCKET_EVENTS.CODE_UPDATE, ({ code: newCode }) => {
      setCode(newCode);
    });

    socket.on(SOCKET_EVENTS.LANGUAGE_UPDATE, ({ language: newLang }) => {
      setLanguage(newLang);
      toast(`Language changed to ${newLang}`);
    });

    socket.on(
      SOCKET_EVENTS.CODE_OUTPUT,
      ({ output: result, error, success }) => {
        setIsRunning(false);
        if (success) {
          setOutput(result);
          toast.success("Code executed successfully!");
        } else {
          setOutput(`Error:\n${error}`);
          toast.error("Execution failed");
        }
        setShowOutput(true);
      },
    );

    socket.on(
      SOCKET_EVENTS.TEST_CASES_UPDATED,
      ({ testCases: updatedTestCases }) => {
        setTestCases(updatedTestCases);
      },
    );

    socket.on(SOCKET_EVENTS.TEST_RESULTS, ({ results, summary, error }) => {
      setIsRunningTests(false);
      if (error) {
        toast.error("Test execution failed");
        setTestResults({ results: [], error });
      } else {
        setTestResults({ results, summary });
        toast.success(`${summary.passed}/${summary.total} tests passed!`);
      }
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
      socket.disconnect();
      setIsConnected(false);
    };
  }, [roomId, username]);

  // Actions
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

  const runCode = useCallback(() => {
    if (!code.trim()) {
      toast.error("Please write some code first!");
      return;
    }
    setIsRunning(true);
    setOutput("Running...");
    setShowOutput(true);
    // ✅ Send stdin with code
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
      toast.error("Please add test cases first!");
      return;
    }
    if (!code.trim()) {
      toast.error("Please write some code first!");
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
    // State
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

    // Actions
    updateCode,
    updateLanguage,
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
