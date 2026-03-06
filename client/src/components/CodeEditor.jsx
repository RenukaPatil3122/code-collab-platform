// src/components/CodeEditor.jsx
import React, { useEffect, useRef, useCallback } from "react";
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

function CodeEditor({ language, onChange, roomId }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { activeFileData, updateFileContent, activeFile } = useFiles();
  const activeFileRef = useRef(activeFile);
  const isReplayingLocal = useRef(false);
  const cursorDecorationsRef = useRef({});
  const loadedFileRef = useRef(null);

  // THIS IS THE CRITICAL FLAG.
  // When we receive a remote edit and apply it via pushEditOperations,
  // Monaco fires onChange. Without this flag, handleChange would call
  // updateFileContent → emit to server → server sends to other user →
  // their cursor jumps. This flag breaks that loop.
  const isApplyingRemote = useRef(false);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  const handleBeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("codetogether-dark", DARK_THEME);
    monaco.editor.defineTheme("codetogether-light-v2", LIGHT_THEME);
    configureMonacoValidation(monaco, language);
  };

  useEffect(() => {
    if (monacoRef.current)
      configureMonacoValidation(monacoRef.current, language);
  }, [language]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    if (monacoRef.current) monacoRef.current.editor.setTheme(getMonacoTheme());

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

    editor.onDidChangeCursorPosition((e) => {
      if (roomId) {
        socket.emit("cursor-move", {
          roomId,
          position: {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
            file: activeFileRef.current,
          },
        });
      }
    });
  };

  useEffect(() => {
    return () => editorRef.current?._themeObserver?.disconnect();
  }, []);

  // Only load file content when switching to a DIFFERENT file tab.
  // Does NOT run when activeFileData.content changes (i.e. during typing).
  // This is what prevents the "file reloads on every keystroke" bug.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFileData) return;
    if (loadedFileRef.current === activeFile) return;
    loadedFileRef.current = activeFile;

    isApplyingRemote.current = true;
    editor.getModel()?.setValue(activeFileData.content ?? "");
    isApplyingRemote.current = false;
  }, [activeFile]); // <-- ONLY activeFile, never activeFileData

  // Handle incoming remote edits (file-content-update from server).
  // Uses pushEditOperations to preserve cursor position.
  // isApplyingRemote.current = true prevents handleChange from re-emitting.
  useEffect(() => {
    const handleFileContentUpdate = ({ fileName, content }) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      if (fileName !== activeFileRef.current) return;

      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      const model = editor.getModel();
      if (!model || model.getValue() === content) return;

      const savedPos = editor.getPosition();
      const savedSel = editor.getSelection();

      isApplyingRemote.current = true;
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: content }],
        () => null,
      );
      isApplyingRemote.current = false;

      // Clamp cursor to new content bounds in case remote user deleted lines above
      if (savedPos) {
        const lineCount = model.getLineCount();
        const line = Math.min(savedPos.lineNumber, lineCount);
        const col = Math.min(savedPos.column, model.getLineMaxColumn(line));
        try {
          editor.setPosition({ lineNumber: line, column: col });
        } catch (_) {}
      }
      if (savedSel) {
        try {
          editor.setSelection(savedSel);
        } catch (_) {}
      }
    };

    const handleCodeUpdate = ({ code: remoteCode }) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      const model = editor.getModel();
      if (!model || model.getValue() === remoteCode) return;

      const savedPos = editor.getPosition();
      isApplyingRemote.current = true;
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: remoteCode }],
        () => null,
      );
      isApplyingRemote.current = false;
      if (savedPos) {
        try {
          const lineCount = model.getLineCount();
          const line = Math.min(savedPos.lineNumber, lineCount);
          const col = Math.min(savedPos.column, model.getLineMaxColumn(line));
          editor.setPosition({ lineNumber: line, column: col });
        } catch (_) {}
      }
    };

    socket.on("file-content-update", handleFileContentUpdate);
    socket.on("code-update", handleCodeUpdate);
    return () => {
      socket.off("file-content-update", handleFileContentUpdate);
      socket.off("code-update", handleCodeUpdate);
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

      const { lineNumber, column } = position;
      const prev = cursorDecorationsRef.current[socketId] || [];
      cursorDecorationsRef.current[socketId] = editor.deltaDecorations(prev, [
        {
          range: new monaco.Range(lineNumber, column, lineNumber, column),
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
      if (type === "clear-editor") {
        isReplayingLocal.current = true;
        editorRef.current?.getModel()?.setValue("");
      } else if (type === "code-change-animated") {
        isReplayingLocal.current = true;
        const newCode = data.code || "";
        const model = editorRef.current?.getModel();
        if (model && model.getValue() !== newCode) {
          model.pushEditOperations(
            [],
            [{ range: model.getFullModelRange(), text: newCode }],
            () => null,
          );
        }
      } else if (type === "replay-stopped") {
        isReplayingLocal.current = false;
        if (editorRef.current && activeFileData)
          editorRef.current.getModel()?.setValue(activeFileData.content || "");
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

  // Every local keystroke comes here.
  // isApplyingRemote check: if we're applying a remote edit, Monaco fires
  // onChange too — we must ignore it or we'll re-emit the remote content
  // back to the server causing the other user's cursor to jump.
  const handleChange = useCallback(
    (value) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      if (isApplyingRemote.current) return; // ← CRITICAL: don't re-emit remote edits
      const newContent = value || "";
      if (activeFile) updateFileContent(activeFile, newContent);
      onChange(newContent);
    },
    [activeFile, updateFileContent, onChange],
  );

  return (
    <div className="code-editor-wrapper">
      <FileTabs />
      <div className="monaco-container">
        {activeFileData ? (
          <Editor
            height="100%"
            defaultValue={activeFileData.content ?? ""}
            language={activeFileData?.language || language}
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
