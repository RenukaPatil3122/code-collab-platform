// src/contexts/RecordingContext.jsx
import React, { createContext, useContext, useState, useRef } from "react";

const RecordingContext = createContext();

export const useRecording = () => useContext(RecordingContext);

export const RecordingProvider = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
        audio: false,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Screen recording failed. Please grant screen sharing permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codetogether-session-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clears the recorded blob so user can record again
  const clearRecording = () => {
    setRecordedBlob(null);
  };

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        recordedBlob,
        startRecording,
        stopRecording,
        downloadRecording,
        clearRecording,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};
