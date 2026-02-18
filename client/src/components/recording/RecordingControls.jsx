// src/components/recording/RecordingControls.jsx
import React from "react";
import { Circle, Square, Download, Play } from "lucide-react";
import { useRecording } from "../../contexts/RecordingContext";
import toast from "react-hot-toast";
import "./RecordingControls.css";

function RecordingControls() {
  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    downloadRecording,
  } = useRecording();

  const handleStartRecording = async () => {
    await startRecording();
    toast.success("🎬 Screen recording started!");
  };

  const handleStopRecording = () => {
    stopRecording();
    toast.success("💾 Recording stopped!");
  };

  return (
    <div className="recording-controls">
      {!isRecording && !recordedBlob && (
        <button
          className="rec-btn rec-btn-record"
          onClick={handleStartRecording}
          title="Start Screen Recording"
        >
          <Circle size={16} className="rec-icon" />
        </button>
      )}

      {isRecording && (
        <button
          className="rec-btn rec-btn-stop"
          onClick={handleStopRecording}
          title="Stop Recording"
        >
          <Square size={16} />
        </button>
      )}

      {!isRecording && recordedBlob && (
        <button
          className="rec-btn rec-btn-download"
          onClick={downloadRecording}
          title="Download Recording"
        >
          <Download size={16} />
        </button>
      )}

      {isRecording && (
        <div className="recording-indicator">
          <span className="rec-pulse"></span>
          <span className="rec-text">Recording Screen...</span>
        </div>
      )}
    </div>
  );
}

export default RecordingControls;
