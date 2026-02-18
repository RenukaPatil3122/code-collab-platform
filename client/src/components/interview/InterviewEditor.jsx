// src/components/interview/InterviewEditor.jsx
// ✅ FIXED: Proper sizing (no zoom), uses interviewCode directly
// ✅ Records code changes during interview
// ✅ Read-only during replay

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

  // Handle replay events for interview code
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

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    // Force layout after mount to fix sizing
    setTimeout(() => editor.layout(), 100);
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

  return (
    <Editor
      height="100%"
      width="100%"
      language={interviewLanguage}
      value={editorValue}
      onChange={handleChange}
      theme={theme || "vs-dark"}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        cursorSmoothCaretAnimation: "off",
        readOnly: isReplaying,
        padding: { top: 12 },
      }}
      onMount={handleEditorDidMount}
    />
  );
}

export default InterviewEditor;
