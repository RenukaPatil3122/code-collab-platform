// src/contexts/AIContext.jsx

import React, { createContext, useContext, useState, useCallback } from "react";
import { socket } from "../utils/socket";
import { SOCKET_EVENTS, AI_FEATURES } from "../utils/constants";
import toast from "react-hot-toast";

const AIContext = createContext();

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within AIProvider");
  }
  return context;
};

export const AIProvider = ({ children, roomId }) => {
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLimitError, setAiLimitError] = useState(null); // "LIMIT_REACHED" | "LOGIN_REQUIRED" | null

  // Listen for AI responses
  React.useEffect(() => {
    socket.on(
      SOCKET_EVENTS.AI_RESPONSE,
      ({ response, feature, error, message }) => {
        setIsAILoading(false);

        if (error) {
          // Limit/auth errors — surface to UI for UpgradePrompt
          if (error === "LIMIT_REACHED" || error === "LOGIN_REQUIRED") {
            setAiLimitError(error);
          } else {
            toast.error("AI request failed");
            setAiResponse({ error, feature });
          }
          return;
        }

        setAiResponse({ response, feature });
        setAiHistory((prev) => [
          ...prev,
          {
            feature,
            response,
            timestamp: new Date().toISOString(),
          },
        ]);

        toast.success("AI response received!");
      },
    );

    return () => {
      socket.off(SOCKET_EVENTS.AI_RESPONSE);
    };
  }, []);

  const explainCode = useCallback(
    (code, language) => {
      if (!code.trim()) {
        toast.error("Please select some code first!");
        return;
      }
      setIsAILoading(true);
      setShowAIPanel(true);
      socket.emit(SOCKET_EVENTS.AI_REQUEST, {
        roomId,
        feature: AI_FEATURES.EXPLAIN,
        code,
        language,
        prompt: `Explain this ${language} code in simple terms:`,
      });
    },
    [roomId],
  );

  const debugCode = useCallback(
    (code, language, error = null) => {
      if (!code.trim()) {
        toast.error("Please write some code first!");
        return;
      }
      setIsAILoading(true);
      setShowAIPanel(true);
      const debugPrompt = error
        ? `Debug this ${language} code. Error: ${error}`
        : `Review this ${language} code for potential bugs and issues:`;
      socket.emit(SOCKET_EVENTS.AI_REQUEST, {
        roomId,
        feature: AI_FEATURES.DEBUG,
        code,
        language,
        error,
        prompt: debugPrompt,
      });
    },
    [roomId],
  );

  const optimizeCode = useCallback(
    (code, language) => {
      if (!code.trim()) {
        toast.error("Please write some code first!");
        return;
      }
      setIsAILoading(true);
      setShowAIPanel(true);
      socket.emit(SOCKET_EVENTS.AI_REQUEST, {
        roomId,
        feature: AI_FEATURES.OPTIMIZE,
        code,
        language,
        prompt: `Suggest optimizations for this ${language} code:`,
      });
    },
    [roomId],
  );

  const generateTests = useCallback(
    (code, language) => {
      if (!code.trim()) {
        toast.error("Please write some code first!");
        return;
      }
      setIsAILoading(true);
      setShowAIPanel(true);
      socket.emit(SOCKET_EVENTS.AI_REQUEST, {
        roomId,
        feature: AI_FEATURES.GENERATE_TESTS,
        code,
        language,
        prompt: `Generate comprehensive test cases for this ${language} code:`,
      });
    },
    [roomId],
  );

  const getSuggestions = useCallback(
    (code, language, context = "") => {
      setIsAILoading(true);
      socket.emit(SOCKET_EVENTS.AI_REQUEST, {
        roomId,
        feature: AI_FEATURES.SUGGEST,
        code,
        language,
        context,
        prompt: `Provide code completion suggestions for this ${language} code:`,
      });
    },
    [roomId],
  );

  const clearHistory = useCallback(() => {
    setAiHistory([]);
    setAiResponse(null);
  }, []);

  const clearAiLimitError = useCallback(() => {
    setAiLimitError(null);
  }, []);

  const value = {
    isAILoading,
    aiResponse,
    aiHistory,
    showAIPanel,
    setShowAIPanel,
    aiLimitError,
    clearAiLimitError,
    explainCode,
    debugCode,
    optimizeCode,
    generateTests,
    getSuggestions,
    clearHistory,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};
