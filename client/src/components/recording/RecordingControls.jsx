// src/components/recording/RecordingControls.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Circle,
  Square,
  Download,
  Play,
  Pause,
  X,
  RotateCcw,
  Video,
  Maximize,
} from "lucide-react";
import { useRecording } from "../../contexts/RecordingContext";
import toast from "react-hot-toast";
import "./RecordingControls.css";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function RecordingControls() {
  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
  } = useRecording();

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Video player modal
  const [showModal, setShowModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);
  const videoUrlRef = useRef(null);

  // Start timer when recording begins
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // When blob is ready, open modal
  useEffect(() => {
    if (recordedBlob) {
      // Revoke old URL if any
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = URL.createObjectURL(recordedBlob);
      setShowModal(true);
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
  }, [recordedBlob]);

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  };

  const handleStartRecording = async () => {
    await startRecording();
    toast.success("🎬 Recording started!");
  };

  const handleStopRecording = () => {
    stopRecording();
    toast.success("💾 Recording saved!");
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const handleDiscard = () => {
    setShowModal(false);
    setIsPlaying(false);
    setProgress(0);
    setElapsed(0);
    if (videoRef.current) videoRef.current.pause();
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    clearRecording();
    toast("Recording discarded", { icon: "🗑️" });
  };

  const handleDownload = () => {
    downloadRecording();
    toast.success("Downloading recording...");
  };

  return (
    <>
      <div className="recording-controls">
        {/* Record button — only when idle */}
        {!isRecording && !recordedBlob && (
          <button
            className="rec-btn rec-btn-record"
            onClick={handleStartRecording}
            title="Start Screen Recording"
          >
            <Circle size={16} className="rec-icon" />
          </button>
        )}

        {/* Stop button + live timer */}
        {isRecording && (
          <>
            <button
              className="rec-btn rec-btn-stop"
              onClick={handleStopRecording}
              title="Stop Recording"
            >
              <Square size={16} />
            </button>
            <div className="recording-indicator">
              <span className="rec-pulse"></span>
              <span className="rec-text">{formatTime(elapsed)}</span>
            </div>
          </>
        )}

        {/* If blob exists but modal is closed, show reopen button */}
        {!isRecording && recordedBlob && !showModal && (
          <button
            className="rec-btn rec-btn-replay"
            onClick={() => setShowModal(true)}
            title="View Recording"
          >
            <Video size={16} />
          </button>
        )}
      </div>

      {/* ── VIDEO PLAYER MODAL ── */}
      {showModal && videoUrlRef.current && (
        <div
          className="rec-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="rec-modal">
            {/* Header */}
            <div className="rec-modal-header">
              <div className="rec-modal-title">
                <Video size={18} />
                <span>Session Recording</span>
                <span className="rec-modal-duration">
                  {formatTime(duration)}
                </span>
              </div>
              <button
                className="rec-modal-close"
                onClick={() => setShowModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video */}
            <div className="rec-video-wrapper">
              <video
                ref={videoRef}
                src={videoUrlRef.current}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onClick={handlePlayPause}
                className="rec-video"
              />
              {!isPlaying && (
                <div className="rec-play-overlay" onClick={handlePlayPause}>
                  <div className="rec-play-circle">
                    <Play size={28} fill="white" />
                  </div>
                </div>
              )}
            </div>

            {/* Seek bar */}
            <div
              className="rec-seek-bar"
              onClick={handleSeek}
              title="Click to seek"
            >
              <div
                className="rec-seek-progress"
                style={{ width: `${progress}%` }}
              >
                <div className="rec-seek-handle" />
              </div>
            </div>

            {/* Time + controls */}
            <div className="rec-modal-footer">
              <span className="rec-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="rec-footer-controls">
                <button
                  className="rec-ctrl-btn"
                  onClick={handlePlayPause}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>
                <button
                  className="rec-ctrl-btn rec-ctrl-restart"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play();
                      setIsPlaying(true);
                    }
                  }}
                  title="Restart"
                >
                  <RotateCcw size={16} />
                  <span>Restart</span>
                </button>
                <button
                  className="rec-ctrl-btn rec-ctrl-fullscreen"
                  onClick={handleFullscreen}
                  title="Fullscreen"
                >
                  <Maximize size={16} />
                  <span>Fullscreen</span>
                </button>
                <button
                  className="rec-ctrl-btn rec-ctrl-download"
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
                <button
                  className="rec-ctrl-btn rec-ctrl-discard"
                  onClick={handleDiscard}
                  title="Discard"
                >
                  <X size={16} />
                  <span>Discard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RecordingControls;
