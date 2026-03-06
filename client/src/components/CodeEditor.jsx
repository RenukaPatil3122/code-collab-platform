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

// Get model text normalized to \n only (strip \r)
function getModelText(model) {
  return model.getValue().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function offsetToPos(text, offset) {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, clamped);
  const lines = before.split("\n");
  return {
    lineNumber: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

class MonacoBinding {
  constructor(yText, monacoModel, editor, monacoInstance) {
    this.yText = yText;
    this.model = monacoModel;
    this.editor = editor;
    this.monaco = monacoInstance;
    this.applying = false;
    this._disposed = false;

    // ── Yjs → Monaco ──────────────────────────────────────────────────────
    this._yObserver = (event) => {
      if (this._disposed) return;
      if (event.transaction.origin === this) return;
      if (this.applying) return;

      this.applying = true;
      try {
        let offset = 0;
        for (const op of event.delta) {
          if (op.retain !== undefined) {
            offset += op.retain;
          } else if (op.insert !== undefined) {
            // Use normalized text for position calculation
            const text = getModelText(this.model);
            const pos = offsetToPos(text, offset);
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
            offset += op.insert.length;
          } else if (op.delete !== undefined) {
            const text = getModelText(this.model);
            const startPos = offsetToPos(text, offset);
            const endPos = offsetToPos(text, offset + op.delete);
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
          }
        }
      } catch (e) {
        console.warn("yObserver err:", e.message);
      } finally {
        this.applying = false;
      }
    };

    // ── Monaco → Yjs ──────────────────────────────────────────────────────
    // KEY FIX: normalize \r\n → \n in text before writing to Yjs
    // and recalculate rangeOffset using normalized text so offsets are correct
    this._monacoDisposable = this.model.onDidChangeContent((e) => {
      if (this._disposed || this.applying) return;
      this.applying = true;
      try {
        // Get the full normalized text AFTER the change
        const normalizedFull = getModelText(this.model);

        // We need to compute correct offsets in the normalized text.
        // Monaco gives us rangeOffset in \r\n space. We convert to \n space.
        const rawText = this.model.getValue(); // has \r\n

        const changes = [...e.changes].sort(
          (a, b) => b.rangeOffset - a.rangeOffset,
        );
        this.yText.doc.transact(() => {
          for (const { range, rangeLength, text } of changes) {
            // Convert Monaco range → offset in normalized (\n only) text
            // by counting chars in normalized text up to the start line/col
            const startLine = range.startLineNumber;
            const startCol = range.startColumn;
            const normalizedLines = normalizedFull.split("\n");

            // Build offset from normalized lines
            let normOffset = 0;
            for (
              let i = 0;
              i < startLine - 1 && i < normalizedLines.length;
              i++
            ) {
              normOffset += normalizedLines[i].length + 1; // +1 for \n
            }
            normOffset += startCol - 1;
            normOffset = Math.min(normOffset, normalizedFull.length);

            // Compute delete length in normalized space
            // rangeLength from Monaco is in \r\n space — recount using range
            const endLine = range.endLineNumber;
            const endCol = range.endColumn;
            let normEndOffset = 0;
            for (
              let i = 0;
              i < endLine - 1 && i < normalizedLines.length;
              i++
            ) {
              normEndOffset += normalizedLines[i].length + 1;
            }
            normEndOffset += endCol - 1;
            normEndOffset = Math.min(normEndOffset, normalizedFull.length);

            const normDeleteLen = normEndOffset - normOffset;

            // Normalize the inserted text too
            const normText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            if (normDeleteLen > 0) this.yText.delete(normOffset, normDeleteLen);
            if (normText.length > 0) this.yText.insert(normOffset, normText);
          }
        }, this);
      } finally {
        this.applying = false;
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
        // Normalize initial content too
        ydoc.transact(() =>
          yText.insert(
            0,
            initialContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
          ),
        );
      }
    });

    const model = editor.getModel();
    if (!model) return;

    // Force Monaco to use LF line endings
    model.setEOL(0); // 0 = LF (\n), 1 = CRLF (\r\n)

    bindingRef.current = new MonacoBinding(yText, model, editor, monaco);

    yText.observe(() => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const content = yText.toString();
      updateFileContentRef.current(activeFileNameRef.current, content, true);
      onChangeRef.current(content);
      socket.emit("file-content-change", {
        roomId,
        fileName: activeFileNameRef.current,
        content,
      });
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
              renderLineHighlight: "none",
              cursorWidth: 3,
              quickSuggestions: false,
              acceptSuggestionOnCommitCharacter: false,
              acceptSuggestionOnEnter: "off",
              suggestOnTriggerCharacters: false,
              wordBasedSuggestions: "off",
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
