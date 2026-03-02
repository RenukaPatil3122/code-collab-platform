// src/components/interview/InterviewEditor.jsx
// ✅ Custom Monaco "interview-dark" theme — indigo accents, deep navy bg
// ✅ Matches app font/color system (Geist Mono body, #818cf8 accents)
// ✅ No padding.top jank — editor starts cleanly at line 1

import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useInterview } from "../../contexts/InterviewContext";
import { useRecording } from "../../contexts/RecordingContext";

function InterviewEditor({ theme }) {
  const editorRef = useRef(null);
  const { interviewCode, interviewLanguage, updateInterviewCode } =
    useInterview();
  const { captureEvent, isRecording, isReplaying } = useRecording();
  const [replayValue, setReplayValue] = useState(null);
  const isReplayingLocal = useRef(false);

  useEffect(() => {
    const handleReplayEvent = (e) => {
      const { type, data } = e.detail;
      if (type === "interview-code-change") {
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
        setReplayValue(null);
      }
    };
    window.addEventListener("replay-event", handleReplayEvent);
    return () => window.removeEventListener("replay-event", handleReplayEvent);
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // ✅ Custom dark theme — matches #0a0c18 editor bg, indigo accents
    monaco.editor.defineTheme("interview-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "3d4270", fontStyle: "italic" },
        { token: "keyword", foreground: "818cf8" },
        { token: "keyword.control", foreground: "a78bfa" },
        { token: "string", foreground: "34d399" },
        { token: "string.escape", foreground: "6ee7b7" },
        { token: "number", foreground: "fb923c" },
        { token: "type", foreground: "60a5fa" },
        { token: "type.identifier", foreground: "7dd3fc" },
        { token: "function", foreground: "c084fc" },
        { token: "variable", foreground: "e2e8f0" },
        { token: "variable.readonly", foreground: "a5b4fc" },
        { token: "operator", foreground: "94a3b8" },
        { token: "delimiter", foreground: "64748b" },
      ],
      colors: {
        "editor.background": "#0a0c18",
        "editor.foreground": "#e2e8f0",
        "editor.lineHighlightBackground": "#161830",
        "editor.lineHighlightBorder": "#1e2252",
        "editor.selectionBackground": "#3730a350",
        "editor.inactiveSelectionBackground": "#3730a328",
        "editorLineNumber.foreground": "#2e3560",
        "editorLineNumber.activeForeground": "#818cf8",
        "editorIndentGuide.background": "#1e2242",
        "editorIndentGuide.activeBackground": "#3730a3",
        "editorCursor.foreground": "#818cf8",
        "editor.selectionHighlightBackground": "#3730a322",
        "editorBracketMatch.background": "#818cf822",
        "editorBracketMatch.border": "#818cf8",
        "scrollbarSlider.background": "#818cf815",
        "scrollbarSlider.hoverBackground": "#818cf830",
        "scrollbarSlider.activeBackground": "#818cf850",
        "editorGutter.background": "#0a0c18",
        "minimap.background": "#0a0c18",
      },
    });

    monaco.editor.defineTheme("interview-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#f5f5fb",
        "editor.foreground": "#1a1a2e",
        "editor.lineHighlightBackground": "#eaeaf4",
        "editorLineNumber.foreground": "#b0b0cc",
        "editorLineNumber.activeForeground": "#6366f1",
        "editorCursor.foreground": "#6366f1",
      },
    });

    const isDark = !theme || theme === "vs-dark";
    monaco.editor.setTheme(isDark ? "interview-dark" : "interview-light");

    setTimeout(() => editor.layout(), 50);
    setTimeout(() => editor.layout(), 200);
  };

  const handleChange = useCallback(
    (value) => {
      if (isReplayingLocal.current || isReplaying) return;
      const newContent = value || "";
      updateInterviewCode(newContent);
      if (isRecording) {
        captureEvent("interview-code-change", { code: newContent });
      }
    },
    [updateInterviewCode, isRecording, captureEvent, isReplaying],
  );

  const editorValue = replayValue !== null ? replayValue : interviewCode;
  const editorTheme =
    !theme || theme === "vs-dark" ? "interview-dark" : "interview-light";

  return (
    <Editor
      height="100%"
      width="100%"
      language={interviewLanguage}
      value={editorValue}
      onChange={handleChange}
      theme={editorTheme}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 22,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        readOnly: isReplaying,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        fontFamily: "'Geist Mono', 'Fira Code', monospace",
        fontLigatures: true,
        tabSize: 2,
        insertSpaces: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
      }}
      onMount={handleEditorDidMount}
    />
  );
}

export default InterviewEditor;
