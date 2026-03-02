// src/pages/Room.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  PenLine,
  Maximize2,
  Minimize2,
  GripVertical,
  FlaskConical,
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
import Whiteboard from "../components/whiteboard/Whiteboard";

import { LANGUAGES } from "../utils/constants";
import "./Room.css";

const API_BASE = "http://localhost:5000";
const DEFAULT_PANEL_WIDTH = 420;
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 700;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

/* ─────────────────────────────────────────────────────────
   PanelWrapper — adds a title bar with minimize/maximize
   and close X to AI, Chat, Tests, VersionHistory panels.
───────────────────────────────────────────────────────── */
function PanelWrapper({
  title,
  icon,
  onClose,
  isPanelMaximized,
  onToggleMaximize,
  isMobile,
  children,
}) {
  return (
    <div className="side-panel">
      <div className="panel-wrapper-header">
        <div className="panel-wrapper-title">
          {icon}
          <span>{title}</span>
        </div>
        <div className="panel-wrapper-controls">
          {isMobile && (
            <button
              className="control-btn"
              onClick={onToggleMaximize}
              title={isPanelMaximized ? "Restore" : "Maximize"}
            >
              {isPanelMaximized ? (
                <Minimize2 size={15} />
              ) : (
                <Maximize2 size={15} />
              )}
            </button>
          )}
          <button
            className="control-btn control-btn-close"
            onClick={onClose}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="panel-wrapper-body">{children}</div>
    </div>
  );
}

function RoomContent() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
    autoDetectLanguage,
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
    executionTime,
    memoryUsed,
    injectActiveFile,
  } = useRoom();

  const { isInterviewMode } = useInterview();
  const { showAIPanel, setShowAIPanel } = useAI();
  const { files, activeFile, activeFileData, updateFileContent } = useFiles();

  injectActiveFile(activeFileData, updateFileContent);
  useEffect(() => {
    if (activeFile) autoDetectLanguage(activeFile);
  }, [activeFile]);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSaveGistModal, setShowSaveGistModal] = useState(false);
  const [showImportGistModal, setShowImportGistModal] = useState(false);
  const [showComplexity, setShowComplexity] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showStdinPanel, setShowStdinPanel] = useState(false);

  // Mobile panel maximize state
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);

  // Output minimize (collapses to blue tab on right edge, desktop only)
  const [isOutputMinimized, setIsOutputMinimized] = useState(false);

  // Desktop horizontal resize
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Mobile vertical resize
  const getDefaultHeight = () => Math.round(window.innerHeight * 0.45);
  const [panelHeight, setPanelHeight] = useState(getDefaultHeight);
  const isVDragging = useRef(false);
  const vDragStartY = useRef(0);
  const vDragStartHeight = useRef(0);

  const [gistDescription, setGistDescription] = useState("");
  const [gistUrl, setGistUrl] = useState("");
  const [savedGistUrl, setSavedGistUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const moreMenuRef = useRef(null);
  const stdinRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target))
        setShowMoreMenu(false);
      if (
        stdinRef.current &&
        !stdinRef.current.contains(e.target) &&
        showStdinPanel
      )
        setShowStdinPanel(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showStdinPanel]);

  useEffect(() => {
    if (isInterviewMode) setShowInterviewModal(false);
  }, [isInterviewMode]);

  // Desktop horizontal drag
  const startDrag = useCallback(
    (e) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = panelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelWidth],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      setPanelWidth(
        Math.max(
          MIN_PANEL_WIDTH,
          Math.min(MAX_PANEL_WIDTH, dragStartWidth.current + delta),
        ),
      );
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Mobile vertical drag
  const startVDrag = useCallback(
    (e) => {
      e.stopPropagation();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      isVDragging.current = true;
      vDragStartY.current = clientY;
      vDragStartHeight.current = isPanelMaximized
        ? window.innerHeight * 0.92
        : panelHeight;
      document.body.style.userSelect = "none";
      setIsPanelMaximized(false);
    },
    [panelHeight, isPanelMaximized],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!isVDragging.current) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = vDragStartY.current - clientY;
      const maxH = Math.round(window.innerHeight * 0.92);
      setPanelHeight(
        Math.max(120, Math.min(maxH, vDragStartHeight.current + delta)),
      );
    };
    const onUp = () => {
      if (!isVDragging.current) return;
      isVDragging.current = false;
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

  // Toggle maximize/minimize
  const handleToggleMaximize = useCallback(() => {
    setIsPanelMaximized((v) => !v);
  }, []);

  // Close all panels
  const closeAllPanels = useCallback(() => {
    setShowOutput(false);
    setShowTestCases(false);
    setShowAIPanel(false);
    setShowVersionHistory(false);
    setShowChat(false);
    setIsPanelMaximized(false);
    setIsOutputMinimized(false);
  }, [setShowOutput, setShowTestCases, setShowAIPanel, setShowChat]);

  const openPanel = useCallback(
    (panel) => {
      setShowOutput(panel === "output");
      setShowTestCases(panel === "tests");
      setShowAIPanel(panel === "ai");
      setShowVersionHistory(panel === "history");
      setShowChat(panel === "chat");
    },
    [setShowOutput, setShowTestCases, setShowAIPanel, setShowChat],
  );

  const togglePanel = useCallback(
    (panel) => {
      const isOpen = {
        output: showOutput,
        tests: showTestCases,
        ai: showAIPanel,
        history: showVersionHistory,
        chat: showChat,
      }[panel];
      if (isOpen) {
        closeAllPanels();
      } else {
        openPanel(panel);
        setIsPanelMaximized(false);
      }
    },
    [
      showOutput,
      showTestCases,
      showAIPanel,
      showVersionHistory,
      showChat,
      openPanel,
      closeAllPanels,
    ],
  );

  const handleRun = useCallback(() => {
    openPanel("output");
    setIsOutputMinimized(false);
    runCode();
  }, [openPanel, runCode]);
  const handleRunTests = useCallback(() => {
    openPanel("tests");
    runTests();
  }, [openPanel, runTests]);

  const handleToggleChat = (v) => (v ? openPanel("chat") : setShowChat(false));
  const handleToggleAI = (v) => (v ? openPanel("ai") : setShowAIPanel(false));
  const handleToggleVH = (v) =>
    v ? openPanel("history") : setShowVersionHistory(false);
  const handleToggleTestCases = (v) =>
    v ? openPanel("tests") : setShowTestCases(false);

  const anyPanelOpen =
    showOutput ||
    showTestCases ||
    showAIPanel ||
    showVersionHistory ||
    showChat;

  // Mobile panel height
  const headerH = isMobile ? (window.innerWidth <= 480 ? 46 : 50) : 0;
  const mobilePanelHeight = isPanelMaximized
    ? window.innerHeight - headerH
    : panelHeight;

  const handleSelectTemplate = (templateCode) => {
    if (activeFile) updateFileContent(activeFile, templateCode);
    else updateCode(templateCode);
    toast.success("Template loaded!", {
      duration: 2000,
      id: "template-loaded",
    });
    setShowTemplateModal(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied!", { duration: 1500, id: "copy-room-id" });
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
        toast.error("GitHub token not configured", {
          duration: 2000,
          id: "gist-auth-err",
        });
        return;
      }
      if (!files || Object.keys(files).length === 0) {
        toast.error("No files to save", {
          duration: 2000,
          id: "gist-no-files",
        });
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
        toast.success("Saved to Gist! 🎉", {
          duration: 2000,
          id: "gist-save-ok",
        });
      } else throw new Error(data.error || "Failed to save Gist");
    } catch (error) {
      toast.error(error.message || "Failed to save", {
        duration: 2000,
        id: "gist-save-err",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportFromGist = async () => {
    if (!gistUrl.trim()) {
      toast.error("Enter a Gist URL", {
        duration: 1500,
        id: "gist-import-empty",
      });
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
        toast.success("Imported! 🎉", { duration: 2000, id: "gist-import-ok" });
        setShowImportGistModal(false);
        setGistUrl("");
      } else throw new Error(data.error || "Failed to import Gist");
    } catch (error) {
      toast.error(error.message || "Import failed", {
        duration: 2000,
        id: "gist-import-err",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const copyGistUrl = () => {
    navigator.clipboard.writeText(savedGistUrl);
    toast.success("Copied!", { duration: 1500, id: "gist-url-copied" });
  };
  const handleCloseSaveModal = () => {
    setShowSaveGistModal(false);
    setSavedGistUrl("");
    setGistDescription("");
  };
  const menuAction = (fn) => {
    fn();
    setShowMoreMenu(false);
  };

  const activePanelName = showOutput
    ? "output"
    : showAIPanel
      ? "ai"
      : showTestCases
        ? "tests"
        : showChat
          ? "chat"
          : showVersionHistory
            ? "history"
            : null;

  return (
    <div
      className="room-container"
      data-theme={theme === "light" ? "light" : "dark"}
    >
      {/* ════════ HEADER ════════ */}
      <header className="room-header-clean">
        <div className="header-section-left">
          <h1 className="app-logo">CodeTogether</h1>
          <div className="room-info" onClick={copyRoomId} title="Copy Room ID">
            <Copy size={14} />
            <span>{roomId.substring(0, 8)}</span>
          </div>
          <div className="user-count-badge">
            <Users size={14} />
            <span>{users.length}</span>
          </div>
        </div>

        <div className="header-section-center">
          <RecordingControls />
          <select
            value={language}
            onChange={(e) => updateLanguage(e.target.value)}
            className="language-dropdown"
            disabled={isInterviewMode}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <div className="stdin-inline-wrap" ref={stdinRef}>
            <button
              className={`feature-btn stdin-toggle-btn ${showStdinPanel ? "active" : ""}`}
              onClick={() => setShowStdinPanel((v) => !v)}
              title="Standard Input"
            >
              <Terminal size={15} />
              <span className="stdin-btn-label">stdin</span>
            </button>
            {showStdinPanel && (
              <div className="stdin-inline-popover">
                <div className="stdin-popover-header">
                  <Terminal size={12} />
                  <span>Standard Input</span>
                  <button
                    className="stdin-popover-close"
                    onClick={() => setShowStdinPanel(false)}
                  >
                    <X size={12} />
                  </button>
                </div>
                <textarea
                  className="stdin-popover-textarea"
                  rows={4}
                  placeholder="Enter input for your program (one value per line)..."
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          <button
            className="btn-primary desktop-only-run"
            onClick={handleRun}
            disabled={isRunning || isInterviewMode}
            title={isRunning ? "Running..." : "Run Code"}
          >
            {isRunning ? (
              <Loader size={16} className="spin" />
            ) : (
              <Play size={16} />
            )}
            <span className="btn-run-label">
              {isRunning ? "Running" : "Run"}
            </span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleRunTests}
            disabled={isRunningTests}
            title="Run Tests"
          >
            {isRunningTests ? (
              <Loader size={16} className="spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span className="btn-run-label">
              {isRunningTests ? "Testing" : "Test"}
            </span>
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
              className={`feature-btn ${showAIPanel ? "active" : ""}`}
              title="AI Assistant"
              onClick={() => handleToggleAI(!showAIPanel)}
            >
              <Sparkles size={18} />
            </button>
            <button
              className={`feature-btn ${showVersionHistory ? "active" : ""}`}
              title="Version History"
              onClick={() => handleToggleVH(!showVersionHistory)}
            >
              <History size={18} />
            </button>
            <button
              className={`feature-btn ${showTestCases ? "active" : ""}`}
              title="Test Cases"
              onClick={() => handleToggleTestCases(!showTestCases)}
            >
              <ListChecks size={18} />
            </button>
            <button
              className="feature-btn"
              title={theme === "vs-dark" ? "Light Mode" : "Dark Mode"}
              onClick={toggleTheme}
            >
              {theme === "vs-dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="more-menu-container" ref={moreMenuRef}>
            <button
              className="feature-btn"
              title="More Options"
              onClick={() => setShowMoreMenu((v) => !v)}
            >
              <MoreVertical size={18} />
            </button>
            {showMoreMenu && (
              <div className="dropdown-menu">
                {isMobile && (
                  <>
                    <button
                      onClick={() => menuAction(() => togglePanel("history"))}
                    >
                      <History size={16} /> Version History
                    </button>
                    <button
                      onClick={() =>
                        menuAction(() => setShowInterviewModal(true))
                      }
                    >
                      <Trophy size={16} /> Interview Mode
                    </button>
                    <button onClick={() => menuAction(toggleTheme)}>
                      {theme === "vs-dark" ? (
                        <Sun size={16} />
                      ) : (
                        <Moon size={16} />
                      )}
                      {theme === "vs-dark" ? " Light Mode" : " Dark Mode"}
                    </button>
                    <div className="menu-divider" />
                  </>
                )}
                <button
                  onClick={() => menuAction(() => setShowSaveGistModal(true))}
                >
                  <Upload size={16} /> Save to Gist
                </button>
                <button
                  onClick={() => menuAction(() => setShowImportGistModal(true))}
                >
                  <Download size={16} /> Import from Gist
                </button>
                <div className="menu-divider" />
                <button
                  onClick={() => menuAction(() => setShowComplexity(true))}
                >
                  <BarChart2 size={16} /> Complexity Analyzer
                </button>
                <button
                  onClick={() => menuAction(() => setShowWhiteboard(true))}
                >
                  <PenLine size={16} /> Whiteboard
                </button>
                <button
                  onClick={() => menuAction(() => setShowTemplateModal(true))}
                >
                  <BookTemplate size={16} /> Templates
                </button>
                <button
                  onClick={() => menuAction(() => handleToggleChat(!showChat))}
                >
                  <MessageSquare size={16} /> Chat
                </button>
                <div className="menu-divider" />
                <button onClick={handleLeaveRoom} className="danger">
                  <LogOut size={16} /> Leave Room
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ════════ BODY ════════ */}
      <div className="room-body">
        <div className="file-explorer-sidebar">
          <FileExplorer />
        </div>

        <div className="editor-area">
          <CodeEditor
            language={language}
            onChange={updateCode}
            roomId={roomId}
            username={username}
            theme={theme}
          />
        </div>

        {/* Output minimized — blue tab in flex row, editor expands to fill */}
        {showOutput && isOutputMinimized && !isMobile && (
          <button
            className="output-restore-tab"
            onClick={() => setIsOutputMinimized(false)}
            title="Restore Output"
          >
            <Terminal size={13} />
            <span>Output</span>
          </button>
        )}

        {anyPanelOpen && !isMobile && !(showOutput && isOutputMinimized) && (
          <div
            className="panel-resize-handle"
            onMouseDown={startDrag}
            title="Drag to resize"
          >
            <GripVertical size={14} />
          </div>
        )}

        {anyPanelOpen && !(showOutput && isOutputMinimized && !isMobile) && (
          <div
            className={`side-panels ${isPanelMaximized ? "panel-maximized" : ""}`}
            style={{
              width: isMobile ? undefined : panelWidth,
              ...(isMobile ? { height: mobilePanelHeight } : {}),
            }}
          >
            {/* Mobile drag handle — PILL ONLY, no buttons here */}
            <div
              className="panel-top-drag-handle"
              onMouseDown={startVDrag}
              onTouchStart={startVDrag}
            >
              <div className="panel-drag-pill" />
            </div>

            {/* Output */}
            {showOutput && (
              <OutputPanel
                output={output}
                onClose={closeAllPanels}
                isMinimized={false}
                onMinimize={() => setIsOutputMinimized(true)}
                executionTime={executionTime}
                memoryUsed={memoryUsed}
                isPanelMaximized={isPanelMaximized}
                onToggleMaximize={handleToggleMaximize}
                isMobile={isMobile}
              />
            )}

            {/* Test Cases */}
            {showTestCases && (
              <PanelWrapper
                title="Test Cases"
                icon={<FlaskConical size={15} />}
                onClose={closeAllPanels}
                isPanelMaximized={isPanelMaximized}
                onToggleMaximize={handleToggleMaximize}
                isMobile={isMobile}
              >
                <TestCases
                  testCases={testCases}
                  onUpdate={updateTestCases}
                  onClose={closeAllPanels}
                  testResults={testResults}
                  isRunning={isRunningTests}
                />
              </PanelWrapper>
            )}

            {/* AI Assistant */}
            {showAIPanel && (
              <PanelWrapper
                title="AI Assistant"
                icon={<Sparkles size={15} />}
                onClose={closeAllPanels}
                isPanelMaximized={isPanelMaximized}
                onToggleMaximize={handleToggleMaximize}
                isMobile={isMobile}
              >
                <AIAssistant onClose={closeAllPanels} />
              </PanelWrapper>
            )}

            {showVersionHistory && (
              <PanelWrapper
                title="Version History"
                icon={<History size={15} />}
                onClose={closeAllPanels}
                isPanelMaximized={isPanelMaximized}
                onToggleMaximize={handleToggleMaximize}
                isMobile={isMobile}
              >
                <VersionHistory
                  roomId={roomId}
                  currentCode={code}
                  onRestore={handleVersionRestore}
                  onClose={closeAllPanels}
                />
              </PanelWrapper>
            )}

            {/* Chat */}
            {showChat && (
              <PanelWrapper
                title="Chat"
                icon={<MessageSquare size={15} />}
                onClose={closeAllPanels}
                isPanelMaximized={isPanelMaximized}
                onToggleMaximize={handleToggleMaximize}
                isMobile={isMobile}
              >
                <Chat
                  roomId={roomId}
                  username={username}
                  users={users}
                  onClose={closeAllPanels}
                />
              </PanelWrapper>
            )}
          </div>
        )}
      </div>

      {/* ════════ MOBILE BOTTOM NAV ════════ */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button
          className={`mobile-nav-btn ${activePanelName === "output" ? "active" : ""}`}
          onClick={() => togglePanel("output")}
          aria-label="Output"
        >
          <Terminal size={19} />
          <span>Output</span>
        </button>
        <button
          className={`mobile-nav-btn ${activePanelName === "ai" ? "active" : ""}`}
          onClick={() => togglePanel("ai")}
          aria-label="AI"
        >
          <Sparkles size={19} />
          <span>AI</span>
        </button>
        <button
          className={`mobile-nav-btn mob-run ${isRunning ? "running" : ""}`}
          onClick={handleRun}
          disabled={isRunning || isInterviewMode}
          aria-label="Run"
        >
          {isRunning ? (
            <Loader size={20} className="spin" />
          ) : (
            <Play size={20} />
          )}
          <span>{isRunning ? "Running" : "Run"}</span>
        </button>
        <button
          className={`mobile-nav-btn ${activePanelName === "tests" ? "active" : ""}`}
          onClick={() => togglePanel("tests")}
          aria-label="Tests"
        >
          <ListChecks size={19} />
          <span>Tests</span>
        </button>
        <button
          className={`mobile-nav-btn ${activePanelName === "chat" ? "active" : ""}`}
          onClick={() => togglePanel("chat")}
          aria-label="Chat"
        >
          <MessageSquare size={19} />
          <span>Chat</span>
        </button>
      </nav>

      {/* ════════ MODALS ════════ */}
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
      {showComplexity && (
        <ComplexityAnalyzer
          code={code}
          language={language}
          onClose={() => setShowComplexity(false)}
        />
      )}
      {showWhiteboard && (
        <Whiteboard
          roomId={roomId}
          username={username}
          onClose={() => setShowWhiteboard(false)}
        />
      )}

      {showSaveGistModal && (
        <div
          className="modal-overlay gist-modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && handleCloseSaveModal()
          }
        >
          <div className="modal-content">
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
                <>
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
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showImportGistModal && (
        <div
          className="modal-overlay gist-modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowImportGistModal(false)
          }
        >
          <div className="modal-content">
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

function RoomWithFileProvider({ roomId }) {
  const { autoDetectLanguage } = useRoom();
  return (
    <FileProvider roomId={roomId} onLanguageChange={autoDetectLanguage}>
      <RecordingProvider roomId={roomId}>
        <RoomContent />
      </RecordingProvider>
    </FileProvider>
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
          <RoomWithFileProvider roomId={roomId} />
        </AIProvider>
      </InterviewProvider>
    </RoomProvider>
  );
}

export default Room;
