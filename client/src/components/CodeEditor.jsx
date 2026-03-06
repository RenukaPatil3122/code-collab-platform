// src/components/CodeEditor.jsx
import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import FileTabs from "./FileTabs/FileTabs";
import { useFiles } from "../contexts/FileContext";
import { socket } from "../utils/socket";

export let IS_REPLAYING = false;
export const setIsReplayingFlag = (val) => {
  IS_REPLAYING = val;
};

const DARK_THEME = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#0d0f1a",
    "editor.lineHighlightBackground": "#1a1d35",
    "editor.lineHighlightBorder": "#6366f140",
    "editorLineNumber.foreground": "#3d4663",
    "editorLineNumber.activeForeground": "#8892a4",
    "editorGutter.background": "#0d0f1a",
    "editorIndentGuide.background1": "#1e2235",
    "editorIndentGuide.activeBackground1": "#2e3450",
    "editor.selectionBackground": "#6366f140",
    "editor.inactiveSelectionBackground": "#6366f120",
    "editor.wordHighlightBackground": "#6366f125",
    "editorCursor.foreground": "#818cf8",
    "scrollbarSlider.background": "#ffffff0c",
    "scrollbarSlider.hoverBackground": "#ffffff16",
    "scrollbarSlider.activeBackground": "#ffffff20",
  },
};

const LIGHT_THEME = {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#ffffff",
    "editor.lineHighlightBackground": "#f0f0f0",
    "editor.lineHighlightBorder": "#00000000",
    "editorLineNumber.foreground": "#b0b8cc",
    "editorLineNumber.activeForeground": "#6366f1",
    "editorGutter.background": "#ffffff",
    "editorIndentGuide.background1": "#e8eaf4",
    "editorIndentGuide.activeBackground1": "#c7c9e8",
    "editor.selectionBackground": "#6366f130",
    "editor.inactiveSelectionBackground": "#6366f115",
    "editor.wordHighlightBackground": "#6366f118",
    "editorCursor.foreground": "#6366f1",
    "scrollbarSlider.background": "#00000010",
    "scrollbarSlider.hoverBackground": "#00000018",
    "scrollbarSlider.activeBackground": "#00000025",
  },
};

function getMonacoTheme() {
  const isLight =
    document.querySelector(".room-container")?.getAttribute("data-theme") ===
    "light";
  return isLight ? "codetogether-light-v2" : "codetogether-dark";
}

function configureMonacoValidation(monaco, language) {
  try {
    const isJsTs = language === "javascript" || language === "typescript";
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: !isJsTs,
      noSyntaxValidation: !isJsTs,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: !isJsTs,
      noSyntaxValidation: !isJsTs,
    });
  } catch (_) {}
}

// Derive Yjs WebSocket URL from the API URL
function getYjsWsUrl() {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  return apiUrl.replace(/^https/, "wss").replace(/^http/, "ws");
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual MonacoBinding — connects a Y.Text to a Monaco editor model.
// This replaces the y-monaco package which can't resolve monaco-editor internals
// when used with @monaco-editor/react.
//
// How it works:
//   - Observes Y.Text changes and applies them as Monaco edit operations
//   - Observes Monaco model changes and applies them to Y.Text
//   - Uses an isApplying flag to break the feedback loop
// ─────────────────────────────────────────────────────────────────────────────
class MonacoBinding {
  constructor(yText, monacoModel, editor) {
    this.yText = yText;
    this.model = monacoModel;
    this.editor = editor;
    this.isApplying = false;
    this._disposed = false;

    // Yjs → Monaco: when remote (or local) Yjs change arrives, update Monaco
    this._yObserver = (event, transaction) => {
      if (this._disposed) return;
      if (this.isApplying) return; // We caused this change, skip

      this.isApplying = true;
      try {
        // Save cursor/selection before applying remote changes
        const position = this.editor.getPosition();
        const selection = this.editor.getSelection();

        // Apply the full Yjs text to Monaco via a single edit operation
        // (MonacoBinding proper uses delta ops, but full replace is safe here
        //  because isApplying prevents the Monaco→Yjs observer from firing)
        const newContent = this.yText.toString();
        if (this.model.getValue() !== newContent) {
          this.model.pushEditOperations(
            [],
            [{ range: this.model.getFullModelRange(), text: newContent }],
            () => null,
          );
        }

        // Restore cursor (clamp to new line count)
        const lc = this.model.getLineCount();
        if (position) {
          const line = Math.min(position.lineNumber, lc);
          const col = Math.min(
            position.column,
            this.model.getLineMaxColumn(line),
          );
          try {
            this.editor.setPosition({ lineNumber: line, column: col });
          } catch (_) {}
        }
        if (selection) {
          try {
            const sl = Math.min(selection.startLineNumber, lc);
            const el = Math.min(selection.endLineNumber, lc);
            this.editor.setSelection({
              startLineNumber: sl,
              startColumn: Math.min(
                selection.startColumn,
                this.model.getLineMaxColumn(sl),
              ),
              endLineNumber: el,
              endColumn: Math.min(
                selection.endColumn,
                this.model.getLineMaxColumn(el),
              ),
            });
          } catch (_) {}
        }
      } finally {
        this.isApplying = false;
      }
    };

    // Monaco → Yjs: when the local user types, sync to Yjs
    this._monacoDisposable = this.model.onDidChangeContent((e) => {
      if (this._disposed) return;
      if (this.isApplying) return; // Remote change, skip

      this.isApplying = true;
      try {
        // Apply each Monaco change as a Yjs insert/delete
        // Monaco gives us: range (lines/cols) + text inserted + rangeLength (chars deleted)
        const doc = this.yText.doc;
        doc.transact(() => {
          // We process changes in reverse order so offsets don't shift
          const changes = [...e.changes].sort(
            (a, b) => b.rangeOffset - a.rangeOffset,
          );
          for (const change of changes) {
            const { rangeOffset, rangeLength, text } = change;
            if (rangeLength > 0) this.yText.delete(rangeOffset, rangeLength);
            if (text.length > 0) this.yText.insert(rangeOffset, text);
          }
        });
      } finally {
        this.isApplying = false;
      }
    });

    this.yText.observe(this._yObserver);
  }

  destroy() {
    this._disposed = true;
    this.yText.unobserve(this._yObserver);
    this._monacoDisposable?.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function CodeEditor({ language, onChange, roomId, username }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { activeFileData, updateFileContent, activeFile } = useFiles();
  const activeFileRef = useRef(activeFile);
  const isReplayingLocal = useRef(false);
  const cursorDecorationsRef = useRef({});

  // Yjs refs — recreated on each file switch
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  const onChangeRef = useRef(onChange);
  const updateFileContentRef = useRef(updateFileContent);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    updateFileContentRef.current = updateFileContent;
  }, [updateFileContent]);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // ── Language change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) monacoRef.current.editor.setModelLanguage(model, language);
    configureMonacoValidation(monacoRef.current, language);
  }, [language]);

  // ── Destroy Yjs binding for current file ────────────────────────────────
  const destroyYjs = () => {
    try {
      bindingRef.current?.destroy();
    } catch (_) {}
    try {
      providerRef.current?.destroy();
    } catch (_) {}
    try {
      ydocRef.current?.destroy();
    } catch (_) {}
    bindingRef.current = null;
    providerRef.current = null;
    ydocRef.current = null;
  };

  // ── Setup Yjs for a file ─────────────────────────────────────────────────
  const setupYjs = (editor, monaco, fileName, initialContent) => {
    destroyYjs();

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Each file gets its own Yjs room: "ct-{roomId}-{safeFileName}"
    const safeFile = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const yjsRoom = `ct-${roomId}-${safeFile}`;
    const wsUrl = getYjsWsUrl();

    const provider = new WebsocketProvider(wsUrl, yjsRoom, ydoc, {
      connect: true,
    });
    providerRef.current = provider;

    provider.awareness.setLocalStateField("user", {
      name: username || "Guest",
      color:
        "#" +
        Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0"),
    });

    const yText = ydoc.getText("content");

    // Seed the doc with initial content once synced (only if doc is empty)
    let seeded = false;
    provider.on("sync", (isSynced) => {
      if (isSynced && !seeded) {
        seeded = true;
        if (yText.length === 0 && initialContent) {
          ydoc.transact(() => yText.insert(0, initialContent));
        }
      }
    });

    const model = editor.getModel();
    if (!model) return;

    // Bind Yjs ↔ Monaco
    const binding = new MonacoBinding(yText, model, editor);
    bindingRef.current = binding;

    // Keep FileContext + RoomContext in sync so Run Code works
    yText.observe(() => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const content = yText.toString();
      updateFileContentRef.current(fileName, content, true);
      onChangeRef.current(content);

      // Keep server room.code updated for Run Code / Version History
      socket.emit("file-content-change", { roomId, fileName, content });
    });
  };

  // ── Monaco beforeMount ───────────────────────────────────────────────────
  const handleBeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("codetogether-dark", DARK_THEME);
    monaco.editor.defineTheme("codetogether-light-v2", LIGHT_THEME);
    configureMonacoValidation(monaco, language);
  };

  // ── Monaco onMount ───────────────────────────────────────────────────────
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    if (monacoRef.current) monacoRef.current.editor.setTheme(getMonacoTheme());

    const roomEl = document.querySelector(".room-container");
    if (roomEl && monacoRef.current) {
      const observer = new MutationObserver(() =>
        monacoRef.current?.editor.setTheme(getMonacoTheme()),
      );
      observer.observe(roomEl, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      editor._themeObserver = observer;
    }

    if (activeFile) {
      setupYjs(
        editor,
        monacoRef.current,
        activeFile,
        activeFileData?.content ?? "",
      );
    }

    editor.onDidChangeCursorPosition((e) => {
      if (roomId)
        socket.emit("cursor-move", {
          roomId,
          position: {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
            file: activeFileRef.current,
          },
        });
    });
  };

  // ── File switch → re-setup Yjs ───────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeFile) return;
    setupYjs(editor, monaco, activeFile, activeFileData?.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      editorRef.current?._themeObserver?.disconnect();
      destroyYjs();
    };
  }, []);

  // ── Remote cursor decorations (via existing socket) ──────────────────────
  useEffect(() => {
    const handleCursorUpdate = ({
      socketId,
      username: remoteUser,
      color,
      position,
    }) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      if (position.file && position.file !== activeFileRef.current) {
        if (cursorDecorationsRef.current[socketId]) {
          editor.deltaDecorations(cursorDecorationsRef.current[socketId], []);
          delete cursorDecorationsRef.current[socketId];
        }
        return;
      }
      const styleId = `cursor-style-${socketId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `.remote-cursor-${socketId}{border-left:2px solid ${color};margin-left:-1px}.remote-cursor-label-${socketId}::after{content:"${remoteUser}";background:${color};color:#fff;font-size:10px;font-weight:600;padding:1px 5px;border-radius:3px;position:absolute;top:-18px;left:0;white-space:nowrap;pointer-events:none;z-index:100}`;
        document.head.appendChild(style);
      }
      const prev = cursorDecorationsRef.current[socketId] || [];
      cursorDecorationsRef.current[socketId] = editor.deltaDecorations(prev, [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          options: {
            className: `remote-cursor-${socketId}`,
            beforeContentClassName: `remote-cursor-label-${socketId}`,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
      ]);
    };
    socket.on("cursor-update", handleCursorUpdate);
    return () => socket.off("cursor-update", handleCursorUpdate);
  }, []);

  useEffect(() => {
    const handleUserLeft = ({ users }) => {
      const editor = editorRef.current;
      if (!editor) return;
      const activeIds = new Set(users.map((u) => u.socketId));
      Object.keys(cursorDecorationsRef.current).forEach((sid) => {
        if (!activeIds.has(sid)) {
          editor.deltaDecorations(cursorDecorationsRef.current[sid], []);
          delete cursorDecorationsRef.current[sid];
          document.getElementById(`cursor-style-${sid}`)?.remove();
        }
      });
    };
    socket.on("user-left", handleUserLeft);
    return () => socket.off("user-left", handleUserLeft);
  }, []);

  // ── Replay support ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleReplayEvent = (e) => {
      const { type, data } = e.detail;
      const model = editorRef.current?.getModel();
      if (type === "clear-editor") {
        isReplayingLocal.current = true;
        model?.setValue("");
      } else if (type === "code-change-animated") {
        isReplayingLocal.current = true;
        if (model && model.getValue() !== (data.code || ""))
          model.pushEditOperations(
            [],
            [{ range: model.getFullModelRange(), text: data.code || "" }],
            () => null,
          );
      } else if (type === "replay-stopped") {
        isReplayingLocal.current = false;
        if (editorRef.current && activeFileData)
          model?.setValue(activeFileData.content || "");
      }
    };
    window.addEventListener("replay-event", handleReplayEvent);
    return () => window.removeEventListener("replay-event", handleReplayEvent);
  }, [activeFileData]);

  useEffect(() => {
    const handler = (e) => {
      if (e.message?.includes("ResizeObserver")) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  return (
    <div className="code-editor-wrapper">
      <FileTabs />
      <div className="monaco-container">
        {activeFileData ? (
          <Editor
            height="100%"
            defaultValue=""
            defaultLanguage="javascript"
            theme={getMonacoTheme()}
            beforeMount={handleBeforeMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              cursorSmoothCaretAnimation: "off",
              renderLineHighlight: "line",
              cursorWidth: 3,
            }}
            onMount={handleEditorDidMount}
          />
        ) : (
          <div className="no-file-open">
            <p>No file open. Create or select a file from the explorer.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeEditor;
