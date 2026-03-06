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

// Apply remote content to Monaco WITHOUT moving the user's cursor.
// Instead of replacing everything (which resets cursor to line 1),
// we find only the lines that changed and apply targeted edits.
// This means if YOU are on line 1 and Rose edits line 5, your cursor
// stays exactly on line 1 column where you left it.
function applyRemoteContent(editor, monaco, newContent) {
  const model = editor.getModel();
  if (!model) return;

  const currentContent = model.getValue();
  if (currentContent === newContent) return;

  // Save cursor and selection BEFORE any edit
  const savedPos = editor.getPosition();
  const savedSel = editor.getSelection();

  const currentLines = currentContent.split("\n");
  const newLines = newContent.split("\n");
  const edits = [];

  const maxLen = Math.max(currentLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const currentLine = currentLines[i];
    const newLine = newLines[i];

    if (currentLine === newLine) continue; // line unchanged — skip

    if (i < currentLines.length && i < newLines.length) {
      // Line exists in both — content changed
      edits.push({
        range: new monaco.Range(i + 1, 1, i + 1, currentLine.length + 1),
        text: newLine,
      });
    } else if (i >= currentLines.length) {
      // New lines added at end
      const prevLine = i; // 1-indexed line before this
      edits.push({
        range: new monaco.Range(
          prevLine,
          currentLines[i - 1]?.length + 1 || 1,
          prevLine,
          currentLines[i - 1]?.length + 1 || 1,
        ),
        text: "\n" + newLine,
      });
    } else {
      // Lines removed — handled by full replace below
    }
  }

  // If line count changed significantly, just do a full replace but restore cursor after
  if (
    Math.abs(currentLines.length - newLines.length) > 0 &&
    edits.length > 10
  ) {
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: newContent }],
      () => null,
    );
  } else if (edits.length > 0) {
    model.pushEditOperations([], edits, () => null);
    // If that didn't result in the right content (edge cases), fix it
    if (model.getValue() !== newContent) {
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: newContent }],
        () => null,
      );
    }
  } else {
    // Line count changed but few edits — full replace
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: newContent }],
      () => null,
    );
  }

  // Restore cursor — clamp to new content bounds
  if (savedPos) {
    const lc = model.getLineCount();
    const line = Math.min(savedPos.lineNumber, lc);
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
}

function CodeEditor({ language, onChange, roomId }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { activeFileData, updateFileContent, activeFile } = useFiles();
  const activeFileRef = useRef(activeFile);
  const isReplayingLocal = useRef(false);
  const cursorDecorationsRef = useRef({});
  const loadedFileRef = useRef(null);
  const isApplyingRemote = useRef(false);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) monacoRef.current.editor.setModelLanguage(model, language);
    configureMonacoValidation(monacoRef.current, language);
  }, [language]);

  const handleBeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("codetogether-dark", DARK_THEME);
    monaco.editor.defineTheme("codetogether-light-v2", LIGHT_THEME);
    configureMonacoValidation(monaco, language);
  };

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

    if (activeFile && activeFileData) {
      loadedFileRef.current = activeFile;
      isApplyingRemote.current = true;
      editor.getModel()?.setValue(activeFileData.content ?? "");
      isApplyingRemote.current = false;
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

  useEffect(() => () => editorRef.current?._themeObserver?.disconnect(), []);

  // Only fires on file TAB switch, never on content change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFileData) return;
    if (loadedFileRef.current === activeFile) return;
    loadedFileRef.current = activeFile;
    isApplyingRemote.current = true;
    editor.getModel()?.setValue(activeFileData.content ?? "");
    isApplyingRemote.current = false;
  }, [activeFile]);

  // Receive remote edits — apply with cursor preservation
  useEffect(() => {
    const handleFileContentUpdate = ({ fileName, content }) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      if (fileName !== activeFileRef.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      isApplyingRemote.current = true;
      applyRemoteContent(editor, monaco, content);
      isApplyingRemote.current = false;
    };

    const handleCodeUpdate = ({ code: remoteCode }) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      isApplyingRemote.current = true;
      applyRemoteContent(editor, monaco, remoteCode);
      isApplyingRemote.current = false;
    };

    socket.on("file-content-update", handleFileContentUpdate);
    socket.on("code-update", handleCodeUpdate);
    return () => {
      socket.off("file-content-update", handleFileContentUpdate);
      socket.off("code-update", handleCodeUpdate);
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
      if (type === "clear-editor") {
        isReplayingLocal.current = true;
        editorRef.current?.getModel()?.setValue("");
      } else if (type === "code-change-animated") {
        isReplayingLocal.current = true;
        const model = editorRef.current?.getModel();
        if (model && model.getValue() !== (data.code || ""))
          model.pushEditOperations(
            [],
            [{ range: model.getFullModelRange(), text: data.code || "" }],
            () => null,
          );
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

  const handleChange = useCallback(
    (value) => {
      if (IS_REPLAYING || isReplayingLocal.current) return;
      if (isApplyingRemote.current) return;
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
            defaultValue=""
            defaultLanguage="javascript"
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
