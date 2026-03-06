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

function applyRemoteContent(editor, monaco, newContent) {
  const model = editor.getModel();
  if (!model) return;
  if (model.getValue() === newContent) return;

  const savedPos = editor.getPosition();
  const savedSel = editor.getSelection();

  model.pushEditOperations(
    [],
    [{ range: model.getFullModelRange(), text: newContent }],
    () => null,
  );

  const lc = model.getLineCount();
  if (savedPos) {
    const line = Math.min(savedPos.lineNumber, lc);
    const col = Math.min(savedPos.column, model.getLineMaxColumn(line));
    try {
      editor.setPosition({ lineNumber: line, column: col });
    } catch (_) {}
  }
  if (savedSel) {
    try {
      const sl = Math.min(savedSel.startLineNumber, lc);
      const el = Math.min(savedSel.endLineNumber, lc);
      editor.setSelection({
        startLineNumber: sl,
        startColumn: Math.min(savedSel.startColumn, model.getLineMaxColumn(sl)),
        endLineNumber: el,
        endColumn: Math.min(savedSel.endColumn, model.getLineMaxColumn(el)),
      });
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

  // THE REAL FIX:
  // isApplyingRemote as a ref wasn't working because pushEditOperations fires
  // onDidChangeContent synchronously in Monaco's internal stack, but the
  // @monaco-editor/react onChange prop wraps it — by the time React's
  // synthetic onChange fires, our ref was already reset to false.
  //
  // Solution: DON'T use the onChange prop at all for local change detection.
  // Instead register onDidChangeModelContent directly on the model inside
  // handleEditorDidMount. That listener runs in the same synchronous call
  // stack as pushEditOperations, so we can reliably gate on isApplyingRemote.
  const isApplyingRemote = useRef(false);
  const onChangeRef = useRef(onChange);
  const updateFileContentRef = useRef(updateFileContent);
  const activeFileStateRef = useRef(activeFile);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    updateFileContentRef.current = updateFileContent;
  }, [updateFileContent]);
  useEffect(() => {
    activeFileRef.current = activeFile;
    activeFileStateRef.current = activeFile;
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

    // ── THE KEY CHANGE ────────────────────────────────────────────────────
    // Register content change listener DIRECTLY on the model.
    // This fires synchronously inside Monaco's edit pipeline — same call
    // stack as pushEditOperations — so isApplyingRemote.current is still
    // true when we check it. The onChange React prop fires AFTER React
    // reconciliation, too late.
    editor.getModel()?.onDidChangeContent(() => {
      if (isApplyingRemote.current) return; // remote edit — skip
      if (IS_REPLAYING || isReplayingLocal.current) return;

      const newContent = editor.getModel()?.getValue() || "";
      const fileName = activeFileStateRef.current;
      if (fileName) updateFileContentRef.current(fileName, newContent);
      onChangeRef.current(newContent);
    });
    // ─────────────────────────────────────────────────────────────────────

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

  // File tab switch
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFileData) return;
    if (loadedFileRef.current === activeFile) return;
    loadedFileRef.current = activeFile;
    isApplyingRemote.current = true;
    editor.getModel()?.setValue(activeFileData.content ?? "");
    isApplyingRemote.current = false;
  }, [activeFile]);

  // Receive remote edits
  useEffect(() => {
    const handleFileContentUpdate = ({ fileName, content, sourceSocketId }) => {
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

  // Remote cursors
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

  return (
    <div className="code-editor-wrapper">
      <FileTabs />
      <div className="monaco-container">
        {activeFileData ? (
          <Editor
            height="100%"
            defaultValue=""
            defaultLanguage="javascript"
            // NOTE: No onChange prop — we use onDidChangeModelContent directly
            // inside handleEditorDidMount for reliable sync guard
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
