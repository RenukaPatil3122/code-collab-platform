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

function getYjsWsUrl() {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  return apiUrl.replace(/^https/, "wss").replace(/^http/, "ws");
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert a character offset in a string to a Monaco { lineNumber, column }
// ─────────────────────────────────────────────────────────────────────────────
function offsetToMonacoPosition(text, offset) {
  const lines = text.slice(0, offset).split("\n");
  return {
    lineNumber: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MonacoBinding — connects Y.Text ↔ Monaco model using precise delta operations.
//
// Key design:
//   - Yjs→Monaco: uses Y.Text delta events to compute exact insert/delete ranges
//     and applies them as Monaco edit operations WITHOUT touching the rest of the doc
//   - Monaco→Yjs: uses Monaco's change events (offset + rangeLength + text) to
//     apply precise insert/delete on Y.Text
//   - muteMonaco flag blocks the Monaco observer while we apply Yjs changes,
//     preventing the feedback loop
// ─────────────────────────────────────────────────────────────────────────────
class MonacoBinding {
  constructor(yText, monacoModel, editor, monacoInstance) {
    this.yText = yText;
    this.model = monacoModel;
    this.editor = editor;
    this.monaco = monacoInstance;
    this.muteMonaco = false; // true while applying Yjs→Monaco to block echo
    this._disposed = false;

    // ── Yjs → Monaco ────────────────────────────────────────────────────────
    // Y.Text fires an event with a delta array: [{retain: N}, {insert: "..."}, {delete: N}]
    // We walk the delta and apply precise Monaco edits.
    this._yObserver = (event) => {
      if (this._disposed || this.muteMonaco) return;
      this.muteMonaco = true;
      try {
        const delta = event.delta;
        let offset = 0;
        const edits = [];

        for (const op of delta) {
          if (op.retain !== undefined) {
            offset += op.retain;
          } else if (op.insert !== undefined) {
            const text = this.model.getValue();
            const pos = offsetToMonacoPosition(text, offset);
            edits.push({
              range: new this.monaco.Range(
                pos.lineNumber,
                pos.column,
                pos.lineNumber,
                pos.column,
              ),
              text: op.insert,
            });
            offset += op.insert.length;
          } else if (op.delete !== undefined) {
            const text = this.model.getValue();
            const startPos = offsetToMonacoPosition(text, offset);
            const endPos = offsetToMonacoPosition(text, offset + op.delete);
            edits.push({
              range: new this.monaco.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column,
              ),
              text: "",
            });
            // Don't advance offset — the chars are being deleted
          }
        }

        if (edits.length > 0) {
          this.model.pushEditOperations([], edits, () => null);
        }
      } catch (e) {
        // Fallback: full replace (only if delta parsing fails)
        console.warn(
          "MonacoBinding delta error, falling back to full replace:",
          e.message,
        );
        const newContent = this.yText.toString();
        if (this.model.getValue() !== newContent) {
          this.model.pushEditOperations(
            [],
            [{ range: this.model.getFullModelRange(), text: newContent }],
            () => null,
          );
        }
      } finally {
        this.muteMonaco = false;
      }
    };

    // ── Monaco → Yjs ────────────────────────────────────────────────────────
    // Monaco gives us: rangeOffset (char offset), rangeLength (chars deleted), text (chars inserted)
    // We apply these directly to Y.Text.
    this._monacoDisposable = this.model.onDidChangeContent((e) => {
      if (this._disposed || this.muteMonaco) return;

      this.muteMonaco = true;
      try {
        const doc = this.yText.doc;
        // Sort changes in reverse order so earlier offsets aren't shifted by later ones
        const changes = [...e.changes].sort(
          (a, b) => b.rangeOffset - a.rangeOffset,
        );
        doc.transact(() => {
          for (const change of changes) {
            const { rangeOffset, rangeLength, text } = change;
            if (rangeLength > 0) this.yText.delete(rangeOffset, rangeLength);
            if (text.length > 0) this.yText.insert(rangeOffset, text);
          }
        }, this); // 'this' as origin so Yjs doesn't echo back to us
      } finally {
        this.muteMonaco = false;
      }
    });

    this.yText.observe(this._yObserver);
  }

  destroy() {
    this._disposed = true;
    try {
      this.yText.unobserve(this._yObserver);
    } catch (_) {}
    try {
      this._monacoDisposable?.dispose();
    } catch (_) {}
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

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) monacoRef.current.editor.setModelLanguage(model, language);
    configureMonacoValidation(monacoRef.current, language);
  }, [language]);

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

  const setupYjs = (editor, monaco, fileName, initialContent) => {
    destroyYjs();

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

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

    // Seed once after first sync if doc is empty
    provider.once("sync", (isSynced) => {
      if (isSynced && yText.length === 0 && initialContent) {
        ydoc.transact(() => yText.insert(0, initialContent));
      }
    });

    const model = editor.getModel();
    if (!model) return;

    const binding = new MonacoBinding(yText, model, editor, monaco);
    bindingRef.current = binding;

    // Keep FileContext + server room.code in sync
    yText.observe(() => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const content = yText.toString();
      updateFileContentRef.current(fileName, content, true);
      onChangeRef.current(content);
      socket.emit("file-content-change", { roomId, fileName, content });
    });
  };

  const handleBeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("codetogether-dark", DARK_THEME);
    monaco.editor.defineTheme("codetogether-light-v2", LIGHT_THEME);
    configureMonacoValidation(monaco, language);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme(getMonacoTheme());

    const roomEl = document.querySelector(".room-container");
    if (roomEl) {
      const observer = new MutationObserver(() =>
        monaco.editor.setTheme(getMonacoTheme()),
      );
      observer.observe(roomEl, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      editor._themeObserver = observer;
    }

    if (activeFile) {
      setupYjs(editor, monaco, activeFile, activeFileData?.content ?? "");
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

  // File switch
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeFile) return;
    setupYjs(editor, monaco, activeFile, activeFileData?.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  useEffect(() => {
    return () => {
      editorRef.current?._themeObserver?.disconnect();
      destroyYjs();
    };
  }, []);

  // Remote cursor decorations
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

  // Replay support
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
