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

// Convert char offset → Monaco position, reading LIVE from model
function offsetToPos(model, offset) {
  const text = model.getValue();
  const clamped = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, clamped);
  const lines = before.split("\n");
  return {
    lineNumber: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

class MonacoBinding {
  constructor(yText, monacoModel, editor, monacoInstance, onContentChange) {
    this.yText = yText;
    this.model = monacoModel;
    this.editor = editor;
    this.monaco = monacoInstance;
    this.onContentChange = onContentChange; // callback for server sync
    this.muteDepth = 0;
    this._disposed = false;

    // ── Yjs → Monaco ──────────────────────────────────────────────────────
    // Each op is applied one at a time. charOffset tracks position in the
    // CURRENT model (which grows/shrinks as we apply ops).
    //
    // KEY FIX: For inserts, charOffset advances by insert length AFTER applying.
    // For deletes, charOffset does NOT advance (chars removed from current pos).
    // For retain, charOffset advances by retain amount.
    this._yObserver = (event) => {
      if (this._disposed || this.muteDepth > 0) return;
      this.muteDepth++;
      try {
        // Skip events originating from Monaco→Yjs (our own edits)
        if (event.transaction.origin === this) {
          return;
        }

        const delta = event.delta;
        // charOffset = current position in the LIVE model text
        // We re-read model.getValue() via offsetToPos after each op
        let charOffset = 0;

        for (const op of delta) {
          if (op.retain !== undefined) {
            // Move forward in the current model text
            charOffset += op.retain;
          } else if (op.insert !== undefined) {
            // Insert at current charOffset in live model
            const pos = offsetToPos(this.model, charOffset);
            this.model.pushEditOperations(
              [],
              [
                {
                  range: new this.monaco.Range(
                    pos.lineNumber,
                    pos.column,
                    pos.lineNumber,
                    pos.column,
                  ),
                  text: op.insert,
                },
              ],
              () => null,
            );
            // After insert, charOffset advances past the inserted text
            charOffset += op.insert.length;
          } else if (op.delete !== undefined) {
            // Delete op.delete chars starting at charOffset in live model
            const startPos = offsetToPos(this.model, charOffset);
            const endPos = offsetToPos(this.model, charOffset + op.delete);
            this.model.pushEditOperations(
              [],
              [
                {
                  range: new this.monaco.Range(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column,
                  ),
                  text: "",
                },
              ],
              () => null,
            );
            // charOffset stays — deleted chars are gone, next op starts at same offset
          }
        }

        // Notify server of updated content
        if (this.onContentChange) {
          this.onContentChange(this.yText.toString());
        }
      } catch (e) {
        console.warn("yObserver error:", e.message);
        try {
          const newContent = this.yText.toString();
          if (this.model.getValue() !== newContent) {
            this.model.setValue(newContent);
          }
          if (this.onContentChange) this.onContentChange(newContent);
        } catch (_) {}
      } finally {
        this.muteDepth--;
      }
    };

    // ── Monaco → Yjs ──────────────────────────────────────────────────────
    this._monacoDisposable = this.model.onDidChangeContent((e) => {
      if (this._disposed || this.muteDepth > 0) return;
      this.muteDepth++;
      try {
        const changes = [...e.changes].sort(
          (a, b) => b.rangeOffset - a.rangeOffset,
        );
        // Use 'this' as transaction origin so _yObserver can skip our own changes
        this.yText.doc.transact(() => {
          for (const { rangeOffset, rangeLength, text } of changes) {
            if (rangeLength > 0) this.yText.delete(rangeOffset, rangeLength);
            if (text.length > 0) this.yText.insert(rangeOffset, text);
          }
        }, this); // <-- 'this' as origin
      } finally {
        this.muteDepth--;
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
  const activeFileNameRef = useRef(activeFile);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    updateFileContentRef.current = updateFileContent;
  }, [updateFileContent]);
  useEffect(() => {
    activeFileRef.current = activeFile;
    activeFileNameRef.current = activeFile;
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

    const provider = new WebsocketProvider(getYjsWsUrl(), yjsRoom, ydoc, {
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

    provider.once("sync", (isSynced) => {
      if (isSynced && yText.length === 0 && initialContent) {
        ydoc.transact(() => yText.insert(0, initialContent));
      }
    });

    const model = editor.getModel();
    if (!model) return;

    // Content change callback — called by binding when remote changes arrive
    const onContentChange = (content) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const fn = activeFileNameRef.current;
      updateFileContentRef.current(fn, content, true);
      onChangeRef.current(content);
      socket.emit("file-content-change", { roomId, fileName: fn, content });
    };

    // Also handle local Monaco→Yjs changes for server sync
    // We hook into onDidChangeContent AFTER binding is created
    bindingRef.current = new MonacoBinding(
      yText,
      model,
      editor,
      monaco,
      onContentChange,
    );

    // For LOCAL edits (Monaco→Yjs), also notify server
    // The binding's Monaco→Yjs path doesn't call onContentChange, so we add a
    // separate yText observer that fires for ALL changes and syncs to server.
    // We use a flag to avoid double-calling for remote changes (binding already calls it).
    yText.observeDeep((events) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      // Only fire for local transactions (origin === binding instance = local Monaco edit)
      for (const event of events) {
        if (event.transaction.origin === bindingRef.current) {
          const content = yText.toString();
          updateFileContentRef.current(
            activeFileNameRef.current,
            content,
            true,
          );
          onChangeRef.current(content);
          socket.emit("file-content-change", {
            roomId,
            fileName: activeFileNameRef.current,
            content,
          });
          break;
        }
      }
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
