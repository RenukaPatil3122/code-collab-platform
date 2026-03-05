// src/components/CodeEditor.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
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

// FIX #6: Disable Monaco's built-in validators for non-JS languages to remove red squiggles
function configureMonacoValidation(monaco, language) {
  try {
    if (language === "javascript" || language === "typescript") {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
    } else {
      // For Python, Java, C++, etc. — disable JS validators completely
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });
    }
  } catch (_) {}
}

function CodeEditor({ language, onChange, roomId, username }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { activeFileData, updateFileContent, activeFile } = useFiles();
  const [replayValue, setReplayValue] = useState(null);
  const isReplayingLocal = useRef(false);

  // FIX #2: Track remote cursors per socketId
  const remoteCursors = useRef({}); // { socketId: { color, username, decorationIds[] } }
  const cursorDecorationsRef = useRef({}); // { socketId: string[] } decoration ids

  const handleBeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("codetogether-dark", DARK_THEME);
    monaco.editor.defineTheme("codetogether-light-v2", LIGHT_THEME);
    // Apply validation config on first load
    configureMonacoValidation(monaco, language);
  };

  // FIX #6: Re-run validation config whenever language changes
  useEffect(() => {
    if (monacoRef.current) {
      configureMonacoValidation(monacoRef.current, language);
    }
  }, [language]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(getMonacoTheme());
    }

    const roomEl = document.querySelector(".room-container");
    if (roomEl && monacoRef.current) {
      const observer = new MutationObserver(() => {
        monacoRef.current?.editor.setTheme(getMonacoTheme());
      });
      observer.observe(roomEl, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      editor._themeObserver = observer;
    }

    // FIX #2: Emit cursor position whenever selection changes
    editor.onDidChangeCursorPosition((e) => {
      if (roomId) {
        socket.emit("cursor-move", {
          roomId,
          position: {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
            file: activeFile,
          },
        });
      }
    });
  };

  useEffect(() => {
    return () => {
      editorRef.current?._themeObserver?.disconnect();
    };
  }, []);

  // FIX #2: Listen for remote cursor updates and render colored decorations
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
      // Only show cursor if it's on the same file
      if (position.file && position.file !== activeFile) {
        // Clear decoration if they switched files
        if (cursorDecorationsRef.current[socketId]) {
          editor.deltaDecorations(cursorDecorationsRef.current[socketId], []);
          delete cursorDecorationsRef.current[socketId];
        }
        return;
      }

      const { lineNumber, column } = position;

      // Inject a CSS class for this cursor color dynamically
      const styleId = `cursor-style-${socketId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          .remote-cursor-${socketId} {
            border-left: 2px solid ${color};
            margin-left: -1px;
          }
          .remote-cursor-label-${socketId}::after {
            content: "${remoteUser}";
            background: ${color};
            color: #fff;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 3px;
            position: absolute;
            top: -18px;
            left: 0;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
          }
        `;
        document.head.appendChild(style);
      }

      const newDecorations = [
        {
          range: new monaco.Range(lineNumber, column, lineNumber, column),
          options: {
            className: `remote-cursor-${socketId}`,
            beforeContentClassName: `remote-cursor-label-${socketId}`,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
      ];

      const prev = cursorDecorationsRef.current[socketId] || [];
      cursorDecorationsRef.current[socketId] = editor.deltaDecorations(
        prev,
        newDecorations,
      );
    };

    socket.on("cursor-update", handleCursorUpdate);
    return () => socket.off("cursor-update", handleCursorUpdate);
  }, [activeFile]);

  // Clean up decorations when a user leaves
  useEffect(() => {
    const handleUserLeft = ({ users }) => {
      const editor = editorRef.current;
      if (!editor) return;
      // Remove decorations for users no longer in the room
      const activeSocketIds = new Set(users.map((u) => u.socketId));
      Object.keys(cursorDecorationsRef.current).forEach((sid) => {
        if (!activeSocketIds.has(sid)) {
          editor.deltaDecorations(cursorDecorationsRef.current[sid], []);
          delete cursorDecorationsRef.current[sid];
          const styleEl = document.getElementById(`cursor-style-${sid}`);
          if (styleEl) styleEl.remove();
        }
      });
    };
    socket.on("user-left", handleUserLeft);
    return () => socket.off("user-left", handleUserLeft);
  }, []);

  useEffect(() => {
    const handleReplayEvent = (e) => {
      const { type, data } = e.detail;
      if (type === "clear-editor") {
        isReplayingLocal.current = true;
        if (editorRef.current) editorRef.current.getModel()?.setValue("");
        else setReplayValue("");
      } else if (type === "code-change-animated") {
        isReplayingLocal.current = true;
        const newCode = data.code || "";
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model && model.getValue() !== newCode) {
            model.pushEditOperations(
              [],
              [{ range: model.getFullModelRange(), text: newCode }],
              () => null,
            );
          }
        } else setReplayValue(newCode);
      } else if (type === "replay-stopped") {
        isReplayingLocal.current = false;
        if (editorRef.current && activeFileData)
          editorRef.current.getModel()?.setValue(activeFileData.content || "");
        setReplayValue(null);
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

  // FIX #1: Apply remote code changes via model operations (not value= prop)
  // This prevents cursor jumping for the local user when a remote change arrives
  useEffect(() => {
    const handleRemoteCodeUpdate = ({ code, fileName }) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      // Only apply if this update is for the currently active file
      if (fileName && fileName !== activeFile) return;

      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      const model = editor.getModel();
      if (!model) return;

      const currentValue = model.getValue();
      if (currentValue === code) return; // No change needed

      // Save cursor position before applying remote edit
      const position = editor.getPosition();
      const selection = editor.getSelection();

      // Apply as a single undoable edit so local cursor isn't disturbed
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: code }],
        () => null,
      );

      // Restore cursor position
      if (position) editor.setPosition(position);
      if (selection) editor.setSelection(selection);
    };

    socket.on("code-update", handleRemoteCodeUpdate);
    socket.on("file-content-update", ({ fileName, content }) => {
      handleRemoteCodeUpdate({ code: content, fileName });
    });

    return () => {
      socket.off("code-update", handleRemoteCodeUpdate);
      socket.off("file-content-update");
    };
  }, [activeFile]);

  const handleChange = useCallback(
    (value) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const newContent = value || "";
      if (activeFile) updateFileContent(activeFile, newContent);
      onChange(newContent);
    },
    [activeFile, updateFileContent, onChange],
  );

  const editorValue =
    replayValue !== null ? replayValue : (activeFileData?.content ?? "");

  return (
    <div className="code-editor-wrapper">
      <FileTabs />
      <div className="monaco-container">
        {activeFileData || replayValue !== null ? (
          <Editor
            height="100%"
            language={activeFileData?.language || language}
            value={editorValue}
            onChange={handleChange}
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
