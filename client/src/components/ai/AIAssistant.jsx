// src/components/ai/AIAssistant.jsx - WORKING VERSION

import React, { useState } from "react";
import { useAI } from "../../contexts/AIContext";
import { useRoom } from "../../contexts/RoomContext";
import {
  Sparkles,
  X,
  Lightbulb,
  Bug,
  Zap,
  TestTube,
  Loader,
  Copy,
  Check,
  MessageSquare,
  Trash2,
} from "lucide-react";
import "./AIAssistant.css";

function AIAssistant({ onClose }) {
  const {
    isAILoading,
    aiResponse,
    aiHistory,
    explainCode,
    debugCode,
    optimizeCode,
    generateTests,
    clearHistory,
  } = useAI();

  const { code, language } = useRoom();
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleAction = (action) => {
    if (!code || !code.trim()) {
      alert("Please write some code first!");
      return;
    }

    switch (action) {
      case "explain":
        explainCode(code, language);
        break;
      case "debug":
        debugCode(code, language);
        break;
      case "optimize":
        optimizeCode(code, language);
        break;
      case "tests":
        generateTests(code, language);
        break;
      default:
        break;
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getFeatureIcon = (feature) => {
    switch (feature) {
      case "explain":
        return <Lightbulb size={16} />;
      case "debug":
        return <Bug size={16} />;
      case "optimize":
        return <Zap size={16} />;
      case "generate_tests":
        return <TestTube size={16} />;
      default:
        return <MessageSquare size={16} />;
    }
  };

  const getFeatureLabel = (feature) => {
    switch (feature) {
      case "explain":
        return "Code Explanation";
      case "debug":
        return "Debug Assistance";
      case "optimize":
        return "Code Optimization";
      case "generate_tests":
        return "Test Generation";
      default:
        return "AI Response";
    }
  };

  return (
    <div className="ai-assistant-panel">
      {/* HEADER */}
      <div className="ai-header">
        <div className="ai-title">
          <Sparkles size={20} className="ai-icon" />
          <h3>AI Assistant</h3>
        </div>
        <div className="ai-header-actions">
          {aiHistory.length > 0 && (
            <button
              className="btn-clear-history"
              onClick={clearHistory}
              title="Clear history"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button className="btn-close-ai" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="ai-quick-actions">
        <button
          className="ai-action-btn explain"
          onClick={() => handleAction("explain")}
          disabled={isAILoading}
        >
          <Lightbulb size={18} />
          <span>Explain Code</span>
        </button>

        <button
          className="ai-action-btn debug"
          onClick={() => handleAction("debug")}
          disabled={isAILoading}
        >
          <Bug size={18} />
          <span>Debug</span>
        </button>

        <button
          className="ai-action-btn optimize"
          onClick={() => handleAction("optimize")}
          disabled={isAILoading}
        >
          <Zap size={18} />
          <span>Optimize</span>
        </button>

        <button
          className="ai-action-btn tests"
          onClick={() => handleAction("tests")}
          disabled={isAILoading}
        >
          <TestTube size={18} />
          <span>Generate Tests</span>
        </button>
      </div>

      {/* RESPONSE AREA */}
      <div className="ai-response-area">
        {/* Loading State */}
        {isAILoading ? (
          <div className="ai-loading">
            <Loader size={24} className="spin" />
            <p>AI is thinking...</p>
          </div>
        ) : null}

        {/* Empty State */}
        {!isAILoading && !aiResponse && aiHistory.length === 0 ? (
          <div className="ai-empty-state">
            <Sparkles size={48} className="empty-icon" />
            <h4>AI Code Assistant</h4>
            <p>Get instant help with:</p>
            <ul>
              <li>📖 Explaining complex code</li>
              <li>🐛 Finding and fixing bugs</li>
              <li>⚡ Optimizing performance</li>
              <li>🧪 Generating test cases</li>
            </ul>
            <p className="hint-text">Select an action above to get started!</p>
          </div>
        ) : null}

        {/* Latest Response */}
        {aiResponse && !aiResponse.error ? (
          <div className="ai-response-card latest">
            <div className="response-header">
              <div className="response-label">
                {getFeatureIcon(aiResponse.feature)}
                <span>{getFeatureLabel(aiResponse.feature)}</span>
              </div>
              <button
                className="btn-copy-response"
                onClick={() => copyToClipboard(aiResponse.response, "latest")}
              >
                {copiedIndex === "latest" ? (
                  <Check size={16} className="icon-copied" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
            <div className="response-content">
              <pre>{aiResponse.response}</pre>
            </div>
          </div>
        ) : null}

        {/* Error State */}
        {aiResponse?.error ? (
          <div className="ai-error">
            <p>❌ {aiResponse.error}</p>
          </div>
        ) : null}

        {/* History */}
        {aiHistory.length > 0 ? (
          <div className="ai-history">
            <h4>Previous Responses</h4>
            {aiHistory
              .slice()
              .reverse()
              .slice(1)
              .map((item, idx) => (
                <div key={idx} className="ai-response-card">
                  <div className="response-header">
                    <div className="response-label">
                      {getFeatureIcon(item.feature)}
                      <span>{getFeatureLabel(item.feature)}</span>
                    </div>
                    <button
                      className="btn-copy-response"
                      onClick={() => copyToClipboard(item.response, idx)}
                    >
                      {copiedIndex === idx ? (
                        <Check size={16} className="icon-copied" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                  <div className="response-content">
                    <pre>{item.response}</pre>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </div>

      {/* TIPS */}
      <div className="ai-tips">
        <p>
          💡 <strong>Tip:</strong> Select code in the editor before using AI for
          more specific help!
        </p>
      </div>
    </div>
  );
}

export default AIAssistant;
