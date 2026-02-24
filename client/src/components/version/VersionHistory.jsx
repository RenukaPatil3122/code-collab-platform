// src/components/version/VersionHistory.jsx

import React, { useState, useEffect } from "react";
import { socket } from "../../utils/socket";
import { Clock, Save, RotateCcw, X, FileText, Loader } from "lucide-react";
import toast from "react-hot-toast";
import "./VersionHistory.css";

function VersionHistory({ roomId, currentCode, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("get-versions", { roomId });

    const handleVersionsList = ({ versions: receivedVersions }) => {
      const validVersions = (receivedVersions || []).filter(
        (v) => v && v.id && v.code !== undefined && v.timestamp,
      );
      setVersions(validVersions);
      setLoading(false);
    };

    const handleVersionSaved = ({ version, error }) => {
      setSaving(false);
      if (error) {
        toast.error(`Failed to save: ${error}`);
      } else if (version) {
        setVersions((prev) => [version, ...prev]);
        setSaveMessage("");
        toast.success("Version saved!");
      }
    };

    const handleVersionRestored = ({ version }) => {
      toast.success("Version restored!");
    };

    socket.on("versions-list", handleVersionsList);
    socket.on("version-saved", handleVersionSaved);
    socket.on("version-restored", handleVersionRestored);

    return () => {
      socket.off("versions-list", handleVersionsList);
      socket.off("version-saved", handleVersionSaved);
      socket.off("version-restored", handleVersionRestored);
    };
  }, [roomId]);

  const handleSaveVersion = () => {
    if (!currentCode || currentCode.trim() === "") {
      toast.error("Cannot save empty code!");
      return;
    }
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString("en-US", {
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
        {/* Header */}
        <div className="version-history-header">
          <div className="version-header-title">
            <Clock size={14} />
            <h2>Version History</h2>
          </div>
          <button className="btn-close-version" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="version-history-content">
          {/* Save Section */}
          <div className="save-version-section">
            <h3>Save Current Version</h3>
            <div className="save-version-form">
              <input
                type="text"
                placeholder="Version message (optional)"
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
                className="version-message-input"
                onKeyDown={(e) => e.key === "Enter" && handleSaveVersion()}
              />
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
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Versions List */}
          <div className="versions-list-section">
            <h3>Saved Versions ({versions.length})</h3>

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
                        {/* ✅ Badges in a flex row — compact pills */}
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
                        <FileText size={12} />
                        View Code
                      </button>
                      <button
                        className="btn-restore-version"
                        onClick={() => handleRestoreVersion(version)}
                      >
                        <RotateCcw size={12} />
                        Restore
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
                  <RotateCcw size={13} />
                  Restore This Version
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
