// src/components/CodeEditor.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import FileTabs from "./FileTabs/FileTabs";
import { useFiles } from "../contexts/FileContext";

export let IS_REPLAYING = false;
export const setIsReplayingFlag = (val) => {
  IS_REPLAYING = val;
};

const CODETOGETHER_DARK = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#090b12",
    "editor.lineHighlightBackground": "#0f1120",
    "editorLineNumber.foreground": "#2e3450",
    "editorLineNumber.activeForeground": "#4e5769",
    "editorGutter.background": "#090b12",
    "editorIndentGuide.background1": "#1a1d2e",
    "editorIndentGuide.activeBackground1": "#2e3450",
    "editor.selectionBackground": "#6366f130",
    "editor.wordHighlightBackground": "#6366f118",
    "editorCursor.foreground": "#818cf8",
    "scrollbarSlider.background": "#ffffff10",
    "scrollbarSlider.hoverBackground": "#ffffff18",
    "scrollbarSlider.activeBackground": "#ffffff22",
  },
};

// Register theme before Monaco mounts — avoids the timing error
const handleBeforeMount = (monaco) => {
  monaco.editor.defineTheme("codetogether-dark", CODETOGETHER_DARK);
};

function CodeEditor({ language, onChange }) {
  const editorRef = useRef(null);
  const { activeFileData, updateFileContent, activeFile } = useFiles();
  const [replayValue, setReplayValue] = useState(null);
  const isReplayingLocal = useRef(false);

  useEffect(() => {
    const handleReplayEvent = (e) => {
      const { type, data } = e.detail;
      if (type === "clear-editor") {
        isReplayingLocal.current = true;
        if (editorRef.current) {
          editorRef.current.getModel()?.setValue("");
        } else {
          setReplayValue("");
        }
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
        } else {
          setReplayValue(newCode);
        }
      } else if (type === "replay-stopped") {
        isReplayingLocal.current = false;
        if (editorRef.current && activeFileData) {
          editorRef.current.getModel()?.setValue(activeFileData.content || "");
        }
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

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeModelContent(() => {
      if (!isReplayingLocal.current && !IS_REPLAYING) {
        requestAnimationFrame(() => editor.layout());
      }
    });
  };

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
            theme="codetogether-dark"
            beforeMount={handleBeforeMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              cursorSmoothCaretAnimation: "off",
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
