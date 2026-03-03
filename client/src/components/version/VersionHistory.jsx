// src/components/version/VersionHistory.jsx

import React, { useState, useEffect, useRef } from "react";
import { socket } from "../../utils/socket";
import { Save, RotateCcw, FileText, Loader, X, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import "./VersionHistory.css";

const FREE_VERSION_LIMIT = 3;

// Per-room key so each room gets its own 3 free saves
function getSessionKey(roomId) {
  return `ct_version_saves_${roomId}`;
}

function getCount(key) {
  try {
    return parseInt(sessionStorage.getItem(key) || "0", 10);
  } catch {
    return 0;
  }
}

function saveCount_(key, n) {
  try {
    sessionStorage.setItem(key, String(n));
  } catch {}
}

function VersionHistory({
  roomId,
  currentCode,
  onRestore,
  onClose,
  onUpgrade,
}) {
  const { isPremium } = useAuth();

  const SESSION_KEY = getSessionKey(roomId);

  const [versions, setVersions] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // saveCount = manual saves done this session (NOT counting auto-saves)
  const [saveCount, setSaveCount] = useState(() =>
    isPremium ? 0 : getCount(SESSION_KEY),
  );
  const remaining = Math.max(FREE_VERSION_LIMIT - saveCount, 0);
  const limitReached = !isPremium && saveCount >= FREE_VERSION_LIMIT;

  // Track whether the current pending save was manual (user-triggered)
  const pendingManualSave = useRef(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("get-versions", { roomId });
    const pollInterval = setInterval(() => {
      socket.emit("get-versions", { roomId });
    }, 30000);

    const handleVersionsList = ({ versions: recv }) => {
      const valid = (recv || []).filter(
        (v) => v && v.id && v.code !== undefined && v.timestamp,
      );
      setVersions(valid);
      setLoading(false);
    };

    const handleVersionSaved = ({ version, error, message }) => {
      setSaving(false);

      // Only show upgrade prompt for MANUAL saves, never for auto-saves
      if (error === "LIMIT_REACHED" || error === "LOGIN_REQUIRED") {
        if (pendingManualSave.current) {
          onUpgrade?.();
        }
        pendingManualSave.current = false;
        return;
      }

      if (error) {
        toast.error(`Failed to save: ${message || error}`);
        pendingManualSave.current = false;
        return;
      }

      if (version) {
        setVersions((prev) => [version, ...prev]);
        setSaveMessage("");

        // Only count manual saves toward limit, not auto-saves
        if (!isPremium && pendingManualSave.current) {
          const next = saveCount + 1;
          setSaveCount(next);
          saveCount_(SESSION_KEY, next);
        }
        pendingManualSave.current = false;
        toast.success("Version saved!");
      }
    };

    const handleVersionRestored = () => {
      toast.success("Version restored!");
    };

    socket.on("versions-list", handleVersionsList);
    socket.on("version-saved", handleVersionSaved);
    socket.on("version-restored", handleVersionRestored);

    return () => {
      clearInterval(pollInterval);
      socket.off("versions-list", handleVersionsList);
      socket.off("version-saved", handleVersionSaved);
      socket.off("version-restored", handleVersionRestored);
    };
  }, [roomId, saveCount, isPremium]);

  const handleSaveVersion = () => {
    // Block at frontend BEFORE emitting — never reaches backend if limit hit
    if (limitReached) {
      onUpgrade?.();
      return;
    }
    if (!currentCode || currentCode.trim() === "") {
      toast.error("Cannot save empty code!");
      return;
    }
    pendingManualSave.current = true;
    setSaving(true);
    socket.emit("save-version", {
      roomId,
      code: currentCode,
      message: saveMessage || `Saved at ${new Date().toLocaleTimeString()}`,
    });
  };

  const handleRestoreVersion = (version) => {
    if (
      window.confirm(
        `Restore version "${version.message}"?\n\nThis will replace your current code.`,
      )
    ) {
      socket.emit("restore-version", { roomId, versionId: version.id });
      if (onRestore) onRestore(version.code);
      onClose();
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "Unknown";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "Invalid";
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="version-history-overlay">
      <div className="version-history-panel">
        <div className="version-history-content">
          {/* ── Save Section ── */}
          <div className="save-version-section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>SAVE CURRENT VERSION</h3>
              {!isPremium && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color:
                      remaining <= 1 ? "#f59e0b" : "rgba(255,255,255,0.35)",
                    fontFamily: "Geist Mono, monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {remaining}/{FREE_VERSION_LIMIT} free saves
                </span>
              )}
              {isPremium && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    color: "#fbbf24",
                    fontWeight: 700,
                  }}
                >
                  <Crown size={11} /> Unlimited
                </span>
              )}
            </div>

            <div className="save-version-form">
              <input
                type="text"
                placeholder="Version message (optional)"
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
                className="version-message-input"
                onKeyDown={(e) => e.key === "Enter" && handleSaveVersion()}
                disabled={limitReached}
                style={
                  limitReached ? { opacity: 0.4, cursor: "not-allowed" } : {}
                }
              />
              {limitReached ? (
                <button
                  className="btn-save-version btn-save-locked"
                  onClick={() => onUpgrade?.()}
                >
                  <Crown size={13} /> Upgrade for unlimited saves
                </button>
              ) : (
                <button
                  className="btn-save-version"
                  onClick={handleSaveVersion}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader size={13} className="spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Save Version
                      {!isPremium && remaining === 1 && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            opacity: 0.7,
                            marginLeft: 4,
                          }}
                        >
                          (last free)
                        </span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ── Versions List ── */}
          <div className="versions-list-section">
            <h3>SAVED VERSIONS ({versions.length})</h3>

            {loading ? (
              <div className="version-loading">
                <Loader size={28} className="spin" />
                <p>Loading versions...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="no-versions">
                <FileText size={36} />
                <p>No versions saved yet</p>
                <small>Save your first version above</small>
              </div>
            ) : (
              <div className="versions-list">
                {versions.map((version, index) => (
                  <div key={version.id} className="version-item">
                    <div className="version-item-header">
                      <div className="version-info">
                        <span className="version-message">
                          {version.message || "Untitled version"}
                        </span>
                        <div className="version-badges">
                          {index === 0 && (
                            <span className="version-badge-latest">Latest</span>
                          )}
                          {version.auto && (
                            <span className="version-badge-auto">
                              Auto-save
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="version-timestamp">
                        {formatTimestamp(version.timestamp)}
                      </span>
                    </div>
                    <div className="version-item-actions">
                      <button
                        className="btn-view-version"
                        onClick={() => setSelectedVersion(version)}
                      >
                        <FileText size={12} /> View Code
                      </button>
                      <button
                        className="btn-restore-version"
                        onClick={() => handleRestoreVersion(version)}
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Code Preview Modal */}
        {selectedVersion && (
          <div
            className="code-preview-modal"
            onClick={() => setSelectedVersion(null)}
          >
            <div
              className="code-preview-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="code-preview-header">
                <h3>{selectedVersion.message || "Code Preview"}</h3>
                <button onClick={() => setSelectedVersion(null)}>
                  <X size={16} />
                </button>
              </div>
              <pre className="code-preview-body">
                <code>{selectedVersion.code}</code>
              </pre>
              <div className="code-preview-footer">
                <button
                  className="btn-restore-version-modal"
                  onClick={() => {
                    handleRestoreVersion(selectedVersion);
                    setSelectedVersion(null);
                  }}
                >
                  <RotateCcw size={13} /> Restore This Version
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VersionHistory;
