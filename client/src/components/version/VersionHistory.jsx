// src/components/version/VersionHistory.jsx - COMPLETELY FIXED

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

  // ✅ Fetch versions when component mounts
  useEffect(() => {
    console.log("🔍 VersionHistory mounted for room:", roomId);

    if (!socket || !roomId) {
      console.error("❌ Socket or roomId missing!");
      return;
    }

    // Request versions from server
    console.log("📤 Requesting versions for room:", roomId);
    socket.emit("get-versions", { roomId });

    // Listen for versions list
    const handleVersionsList = ({ versions: receivedVersions }) => {
      console.log("📥 Received versions:", receivedVersions);

      // Filter out invalid versions
      const validVersions = (receivedVersions || []).filter(
        (v) => v && v.id && v.code !== undefined && v.timestamp,
      );

      console.log("✅ Valid versions:", validVersions.length);
      setVersions(validVersions);
      setLoading(false);
    };

    // Listen for version saved confirmation
    const handleVersionSaved = ({ version, error }) => {
      setSaving(false);

      if (error) {
        console.error("❌ Save error:", error);
        toast.error(`Failed to save: ${error}`);
      } else if (version) {
        console.log("✅ Version saved:", version);
        // Add new version to the list
        setVersions((prev) => [version, ...prev]);
        setSaveMessage("");
        toast.success("Version saved successfully!");
      }
    };

    // Listen for version restored
    const handleVersionRestored = ({ version }) => {
      console.log("✅ Version restored:", version);
      toast.success("Version restored successfully!");
    };

    // Attach listeners
    socket.on("versions-list", handleVersionsList);
    socket.on("version-saved", handleVersionSaved);
    socket.on("version-restored", handleVersionRestored);

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up VersionHistory listeners");
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

    console.log("💾 Saving version for room:", roomId);
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
        `Are you sure you want to restore this version?\n\n"${version.message}"\n\nThis will replace your current code.`,
      )
    ) {
      console.log("🔄 Restoring version:", version.id);
      socket.emit("restore-version", { roomId, versionId: version.id });

      // Call parent's restore handler
      if (onRestore) {
        onRestore(version.code);
      }

      onClose();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";

      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Unknown time";
    }
  };

  const viewVersionCode = (version) => {
    setSelectedVersion(version);
  };

  return (
    <div className="version-history-overlay">
      <div className="version-history-panel">
        <div className="version-history-header">
          <div className="version-header-title">
            <Clock size={20} />
            <h2>Version History</h2>
          </div>
          <button className="btn-close-version" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="version-history-content">
          {/* Save New Version Section */}
          <div className="save-version-section">
            <h3>Save Current Version</h3>
            <div className="save-version-form">
              <input
                type="text"
                placeholder="Version message (optional)"
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
                className="version-message-input"
              />
              <button
                className="btn-save-version"
                onClick={handleSaveVersion}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader size={16} className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Version
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
                <Loader size={48} className="spin" />
                <p>Loading versions...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="no-versions">
                <FileText size={48} />
                <p>No versions saved yet</p>
                <small>Save your first version above to get started</small>
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
                        {index === 0 && (
                          <span className="version-badge-latest">Latest</span>
                        )}
                        {version.auto && (
                          <span className="version-badge-auto">Auto-save</span>
                        )}
                      </div>
                      <span className="version-timestamp">
                        {formatTimestamp(version.timestamp)}
                      </span>
                    </div>
                    <div className="version-item-actions">
                      <button
                        className="btn-view-version"
                        onClick={() => viewVersionCode(version)}
                      >
                        <FileText size={14} />
                        View Code
                      </button>
                      <button
                        className="btn-restore-version"
                        onClick={() => handleRestoreVersion(version)}
                      >
                        <RotateCcw size={14} />
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
                  <X size={20} />
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
                  <RotateCcw size={16} />
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
