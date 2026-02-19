// src/pages/Room.jsx - SCREEN RECORDING VERSION
import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../utils/socket";
import toast from "react-hot-toast";
import {
  Users,
  Copy,
  LogOut,
  Play,
  Loader,
  MessageSquare,
  CheckCircle2,
  ListChecks,
  BookTemplate,
  Sparkles,
  Trophy,
  History,
  Moon,
  Sun,
  MoreVertical,
  Upload,
  Download,
  Github,
  X,
  Terminal,
  BarChart2,
} from "lucide-react";

import { RoomProvider, useRoom } from "../contexts/RoomContext";
import { InterviewProvider, useInterview } from "../contexts/InterviewContext";
import { AIProvider, useAI } from "../contexts/AIContext";
import { FileProvider, useFiles } from "../contexts/FileContext";
import { RecordingProvider } from "../contexts/RecordingContext";

import CodeEditor from "../components/CodeEditor";
import FileExplorer from "../components/FileExplorer/FileExplorer";
import Chat from "../components/Chat";
import OutputPanel from "../components/OutputPanel";
import TestCases from "../components/TestCases";
import TemplateModal from "../components/TemplateModal";
import InterviewMode from "../components/interview/InterviewMode";
import AIAssistant from "../components/ai/AIAssistant";
import VersionHistory from "../components/version/VersionHistory";
import RecordingControls from "../components/recording/RecordingControls";
import ComplexityAnalyzer from "../components/complexity/ComplexityAnalyzer";

import "./Room.css";

const API_BASE = "http://localhost:5000";

function RoomContent() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const {
    username,
    code,
    language,
    users,
    output,
    isRunning,
    testCases,
    testResults,
    isRunningTests,
    showChat,
    showOutput,
    showTestCases,
    theme,
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
    stdin,
    setStdin,
  } = useRoom();

  const { isInterviewMode } = useInterview();
  const { showAIPanel, setShowAIPanel } = useAI();
  const { files, activeFile, updateFileContent } = useFiles();

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSaveGistModal, setShowSaveGistModal] = useState(false);
  const [showImportGistModal, setShowImportGistModal] = useState(false);
  const [showStdinPanel, setShowStdinPanel] = useState(false);
  const [showComplexity, setShowComplexity] = useState(false); // ✅ NEW

  const [gistDescription, setGistDescription] = useState("");
  const [gistUrl, setGistUrl] = useState("");
  const [savedGistUrl, setSavedGistUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target))
        setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isInterviewMode) {
      setShowInterviewModal(false);
    }
  }, [isInterviewMode]);

  const handleCodeChange = (newCode) => updateCode(newCode);
  const handleLanguageChange = (newLang) => updateLanguage(newLang);
  const handleToggleTheme = () => toggleTheme();
  const handleToggleOutput = (v) => setShowOutput(v);
  const handleToggleChat = (v) => setShowChat(v);
  const handleToggleTestCases = (v) => setShowTestCases(v);
  const handleToggleAI = (v) => setShowAIPanel(v);
  const handleToggleVH = (v) => setShowVersionHistory(v);

  const handleSelectTemplate = (templateCode) => {
    if (activeFile) {
      updateFileContent(activeFile, templateCode);
    } else {
      updateCode(templateCode);
    }
    toast.success("Template loaded!");
    setShowTemplateModal(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied!");
  };

  const handleLeaveRoom = () => {
    socket.disconnect();
    navigate("/");
  };

  const handleVersionRestore = (restoredCode) => {
    setCode(restoredCode);
    updateCode(restoredCode);
    setShowVersionHistory(false);
  };

  const handleSaveToGist = async () => {
    try {
      setIsSaving(true);
      const authRes = await fetch(`${API_BASE}/api/gist/check-auth`, {
        credentials: "include",
      });
      if (!authRes.ok) throw new Error("Failed to check authentication");
      const authData = await authRes.json();
      if (!authData.authenticated) {
        toast.error("GitHub token not configured. Check server .env");
        return;
      }

      if (!files || Object.keys(files).length === 0) {
        toast.error("No files to save");
        return;
      }

      const response = await fetch(`${API_BASE}/api/gist/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          files,
          description: gistDescription || `CodeTogether - Room ${roomId}`,
          roomId,
          username,
        }),
      });

      if (!response.ok) {
        const e = await response.json();
        throw new Error(e.error || "Failed to save");
      }

      const data = await response.json();
      if (data.success) {
        setSavedGistUrl(data.gistUrl);
        toast.success("Saved to GitHub Gist! 🎉");
      } else {
        throw new Error(data.error || "Failed to save Gist");
      }
    } catch (error) {
      toast.error(error.message || "Failed to save to Gist");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportFromGist = async () => {
    if (!gistUrl.trim()) {
      toast.error("Please enter a Gist URL");
      return;
    }
    try {
      setIsImporting(true);
      const response = await fetch(`${API_BASE}/api/gist/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gistUrl: gistUrl.trim() }),
      });

      if (!response.ok) {
        const e = await response.json();
        throw new Error(e.error || "Failed to import");
      }

      const data = await response.json();
      if (data.success) {
        const ext = Object.keys(data.files)[0]?.split(".").pop();
        const languageMap = {
          js: "javascript",
          jsx: "javascript",
          ts: "typescript",
          tsx: "typescript",
          py: "python",
          java: "java",
          cpp: "cpp",
          c: "c",
          go: "go",
          rs: "rust",
        };

        Object.entries(data.files).forEach(([fileName, content]) => {
          socket.emit("file-create", {
            roomId,
            file: {
              name: fileName,
              content: content || "",
              language: languageMap[ext] || "javascript",
            },
          });
          setTimeout(
            () =>
              socket.emit("file-content-change", {
                roomId,
                fileName,
                content: content || "",
              }),
            100,
          );
        });

        toast.success(`Imported ${Object.keys(data.files).length} files! 🎉`);
        setShowImportGistModal(false);
        setGistUrl("");
      } else {
        throw new Error(data.error || "Failed to import Gist");
      }
    } catch (error) {
      toast.error(error.message || "Failed to import from Gist");
    } finally {
      setIsImporting(false);
    }
  };

  const copyGistUrl = () => {
    navigator.clipboard.writeText(savedGistUrl);
    toast.success("Gist URL copied!");
  };

  const handleCloseSaveModal = () => {
    setShowSaveGistModal(false);
    setSavedGistUrl("");
    setGistDescription("");
  };

  return (
    <div className="room-container">
      <header className="room-header-clean">
        <div className="header-section-left">
          <h1 className="app-logo">CodeTogether</h1>
          <div className="room-info" onClick={copyRoomId}>
            <Copy size={14} />
            <span>{roomId.substring(0, 8)}</span>
          </div>
          <div className="user-count-badge">
            <Users size={16} />
            <span>{users.length}</span>
          </div>
        </div>

        <div className="header-section-center">
          <RecordingControls />
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-dropdown"
            disabled={isInterviewMode}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="typescript">TypeScript</option>
          </select>

          <button
            className={`feature-btn ${showStdinPanel ? "active" : ""}`}
            onClick={() => setShowStdinPanel((v) => !v)}
            title="Standard Input"
          >
            <Terminal size={16} />
          </button>

          <button
            className="btn-primary"
            onClick={runCode}
            disabled={isRunning || isInterviewMode}
            data-tooltip="Run Code"
          >
            {isRunning ? (
              <Loader size={16} className="spin" />
            ) : (
              <Play size={16} />
            )}
          </button>
          <button
            className="btn-secondary"
            onClick={runTests}
            disabled={isRunningTests}
            data-tooltip="Run Tests"
          >
            {isRunningTests ? (
              <Loader size={16} className="spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
          </button>
        </div>

        <div className="header-section-right">
          <div className="feature-buttons">
            <button
              className="feature-btn"
              title="Interview Mode"
              onClick={() => setShowInterviewModal(true)}
            >
              <Trophy size={18} />
            </button>
            <button
              className="feature-btn"
              title="AI Assistant"
              onClick={() => handleToggleAI(!showAIPanel)}
            >
              <Sparkles size={18} />
            </button>
            <button
              className="feature-btn"
              title="Version History"
              onClick={() => handleToggleVH(!showVersionHistory)}
            >
              <History size={18} />
            </button>
            <button
              className="feature-btn"
              title="Test Cases"
              onClick={() => handleToggleTestCases(!showTestCases)}
            >
              <ListChecks size={18} />
            </button>
            <button
              className="feature-btn"
              title="Toggle Theme"
              onClick={handleToggleTheme}
            >
              {theme === "vs-dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="more-menu-container" ref={moreMenuRef}>
            <button
              className="feature-btn"
              onClick={() => setShowMoreMenu((v) => !v)}
            >
              <MoreVertical size={18} />
            </button>
            {showMoreMenu && (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    setShowSaveGistModal(true);
                    setShowMoreMenu(false);
                  }}
                >
                  <Upload size={16} />
                  Save to Gist
                </button>
                <button
                  onClick={() => {
                    setShowImportGistModal(true);
                    setShowMoreMenu(false);
                  }}
                >
                  <Download size={16} />
                  Import from Gist
                </button>
                <div className="menu-divider"></div>
                <button
                  onClick={() => {
                    setShowComplexity(true); // ✅ NEW
                    setShowMoreMenu(false);
                  }}
                >
                  <BarChart2 size={16} />
                  Complexity Analyzer
                </button>
                <button
                  onClick={() => {
                    setShowTemplateModal(true);
                    setShowMoreMenu(false);
                  }}
                >
                  <BookTemplate size={16} />
                  Templates
                </button>
                <button
                  onClick={() => {
                    handleToggleChat(!showChat);
                    setShowMoreMenu(false);
                  }}
                >
                  <MessageSquare size={16} />
                  Chat
                </button>
                <button onClick={handleLeaveRoom} className="danger">
                  <LogOut size={16} />
                  Leave Room
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showStdinPanel && (
        <div className="stdin-bar">
          <label className="stdin-label">
            <Terminal size={14} /> stdin
          </label>
          <textarea
            className="stdin-textarea"
            rows={3}
            placeholder="Enter input for your program (one value per line)..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
          />
          <button
            className="stdin-close"
            onClick={() => setShowStdinPanel(false)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="room-body">
        <div className="file-explorer-sidebar">
          <FileExplorer />
        </div>
        <div className="editor-area">
          <CodeEditor
            language={language}
            onChange={handleCodeChange}
            roomId={roomId}
            username={username}
            theme={theme}
          />
        </div>
        <div className="side-panels">
          {showOutput && (
            <div className="side-panel">
              <OutputPanel
                output={output}
                onClose={() => handleToggleOutput(false)}
              />
            </div>
          )}
          {showTestCases && (
            <div className="side-panel">
              <TestCases
                testCases={testCases}
                onUpdate={updateTestCases}
                onClose={() => handleToggleTestCases(false)}
                testResults={testResults}
                isRunning={isRunningTests}
              />
            </div>
          )}
          {showAIPanel && (
            <div className="side-panel">
              <AIAssistant onClose={() => handleToggleAI(false)} />
            </div>
          )}
          {showVersionHistory && (
            <div className="side-panel">
              <VersionHistory
                roomId={roomId}
                currentCode={code}
                onRestore={handleVersionRestore}
                onClose={() => handleToggleVH(false)}
              />
            </div>
          )}
          {showChat && (
            <div className="side-panel">
              <Chat
                roomId={roomId}
                username={username}
                users={users}
                onClose={() => handleToggleChat(false)}
              />
            </div>
          )}
        </div>
      </div>

      {showTemplateModal && (
        <TemplateModal
          language={language}
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {(showInterviewModal || isInterviewMode) && (
        <InterviewMode onClose={() => setShowInterviewModal(false)} />
      )}

      {/* ✅ NEW — Complexity Analyzer Modal */}
      {showComplexity && (
        <ComplexityAnalyzer
          code={code}
          language={language}
          onClose={() => setShowComplexity(false)}
        />
      )}

      {showSaveGistModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && handleCloseSaveModal()
          }
        >
          <div className="modal-content gist-modal">
            <div className="modal-header">
              <div className="modal-title">
                <Github size={20} />
                <h3>Save to GitHub Gist</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseSaveModal}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {!savedGistUrl ? (
                <div>
                  <p>Save all your files to a GitHub Gist for easy sharing.</p>
                  <div className="form-group">
                    <label>Description (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., My awesome project"
                      value={gistDescription}
                      onChange={(e) => setGistDescription(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary full-width"
                    onClick={handleSaveToGist}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save to Gist"}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="success-message">
                    <div className="success-icon">✅</div>
                    <h4>Gist Created!</h4>
                    <p>Your files have been saved</p>
                  </div>
                  <div className="gist-url-box">
                    <input type="text" value={savedGistUrl} readOnly />
                    <button onClick={copyGistUrl}>Copy</button>
                  </div>
                  <a
                    href={savedGistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gist-view-link"
                  >
                    View on GitHub
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showImportGistModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowImportGistModal(false)
          }
        >
          <div className="modal-content gist-modal">
            <div className="modal-header">
              <div className="modal-title">
                <Github size={20} />
                <h3>Import from Gist</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowImportGistModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Paste a GitHub Gist URL to import files into this room.</p>
              <div className="form-group">
                <label>Gist URL</label>
                <input
                  type="text"
                  placeholder="https://gist.github.com/username/gist-id"
                  value={gistUrl}
                  onChange={(e) => setGistUrl(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    gistUrl.trim() &&
                    handleImportFromGist()
                  }
                />
              </div>
              <button
                className="btn-primary full-width"
                onClick={handleImportFromGist}
                disabled={isImporting || !gistUrl.trim()}
              >
                {isImporting ? "Importing..." : "Import Files"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || "Guest";

  if (!location.state?.username) {
    navigate("/");
    return null;
  }

  return (
    <RoomProvider roomId={roomId} username={username}>
      <InterviewProvider roomId={roomId}>
        <AIProvider roomId={roomId}>
          <FileProvider roomId={roomId}>
            <RecordingProvider roomId={roomId}>
              <RoomContent />
            </RecordingProvider>
          </FileProvider>
        </AIProvider>
      </InterviewProvider>
    </RoomProvider>
  );
}

export default Room;
