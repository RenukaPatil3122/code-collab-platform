// src/components/CodeEditor.jsx
// SHAKE FIX: Use Monaco's model API directly (pushEditOperations) instead of
// React state updates — eliminates layout recalculation and scroll jitter.

import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import FileTabs from "./FileTabs/FileTabs";
import { useFiles } from "../contexts/FileContext";

export let IS_REPLAYING = false;
export const setIsReplayingFlag = (val) => {
  IS_REPLAYING = val;
};

function CodeEditor({ language, onChange, theme }) {
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
          // Direct model update = no React render = no layout recalc = no shake
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
            // pushEditOperations is the lowest-level way to update Monaco
            // It doesn't trigger layout recalculation or scroll position reset
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
        // Sync Monaco back to FileContext value
        if (editorRef.current && activeFileData) {
          editorRef.current.getModel()?.setValue(activeFileData.content || "");
        }
        setReplayValue(null);
      }
    };

    window.addEventListener("replay-event", handleReplayEvent);
    return () => window.removeEventListener("replay-event", handleReplayEvent);
  }, [activeFileData]);

  // Suppress ResizeObserver errors
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
    // Only call layout on real user edits — NOT during replay
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
            theme={theme}
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
