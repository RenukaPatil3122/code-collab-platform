// src/components/GistManager/GistManager.jsx - FIXED VERSION

import React, { useState } from "react";
import { Github, Upload, Download, X, ExternalLink } from "lucide-react";
import { useFiles } from "../../contexts/FileContext";
import { useRoom } from "../../contexts/RoomContext";
import toast from "react-hot-toast";
import "./GistManager.css";

const API_BASE = "http://localhost:5000";

function GistManager() {
  const { files } = useFiles();
  const { roomId, username } = useRoom();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [gistUrl, setGistUrl] = useState("");
  const [gistDescription, setGistDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [savedGistUrl, setSavedGistUrl] = useState("");

  // ═══════════════════════════════════════════════════════════
  // SAVE TO GIST
  // ═══════════════════════════════════════════════════════════
  const handleSaveToGist = async () => {
    try {
      setIsSaving(true);
      console.log("💾 Saving to Gist...", {
        fileCount: Object.keys(files).length,
      });

      // Check authentication
      const authResponse = await fetch(`${API_BASE}/api/gist/check-auth`, {
        credentials: "include",
      });

      if (!authResponse.ok) {
        throw new Error("Failed to check authentication");
      }

      const authData = await authResponse.json();
      console.log("🔐 Auth status:", authData);

      if (!authData.authenticated) {
        toast.error("GitHub token not configured. Check server .env file");
        return;
      }

      // Validate files
      if (!files || Object.keys(files).length === 0) {
        toast.error("No files to save");
        return;
      }

      // Save to Gist
      const response = await fetch(`${API_BASE}/api/gist/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          files,
          description:
            gistDescription || `CodeTogether Session - Room ${roomId}`,
          roomId,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save Gist");
      }

      const data = await response.json();

      if (data.success) {
        setSavedGistUrl(data.gistUrl);
        toast.success(`Saved ${data.filesCount} files to GitHub Gist! 🎉`);
        console.log("✅ Gist created:", data.gistUrl);
      } else {
        throw new Error(data.error || "Failed to save Gist");
      }
    } catch (error) {
      console.error("❌ Save to Gist error:", error);
      toast.error(error.message || "Failed to save to Gist");
    } finally {
      setIsSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // IMPORT FROM GIST
  // ═══════════════════════════════════════════════════════════
  const handleImportFromGist = async () => {
    if (!gistUrl.trim()) {
      toast.error("Please enter a Gist URL");
      return;
    }

    try {
      setIsImporting(true);
      console.log("📥 Importing from:", gistUrl);

      const response = await fetch(`${API_BASE}/api/gist/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gistUrl: gistUrl.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import Gist");
      }

      const data = await response.json();

      if (data.success) {
        console.log("✅ Import successful:", data);

        // Notify parent component to handle file creation
        // This should trigger the file import in Room.jsx
        const event = new CustomEvent("gist-import", {
          detail: { files: data.files },
        });
        window.dispatchEvent(event);

        toast.success(`Imported ${data.filesCount} files! 🎉`);
        setShowImportModal(false);
        setGistUrl("");
      } else {
        throw new Error(data.error || "Failed to import Gist");
      }
    } catch (error) {
      console.error("❌ Import from Gist error:", error);
      toast.error(error.message || "Failed to import from Gist");
    } finally {
      setIsImporting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // COPY GIST URL
  // ═══════════════════════════════════════════════════════════
  const copyGistUrl = () => {
    navigator.clipboard.writeText(savedGistUrl);
    toast.success("Gist URL copied!");
  };

  // Reset saved URL when closing modal
  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setSavedGistUrl("");
    setGistDescription("");
  };

  return (
    <div className="gist-manager">
      {/* Action Buttons */}
      <div className="gist-actions">
        <button
          className="gist-btn gist-btn-save"
          onClick={() => setShowSaveModal(true)}
          title="Save to GitHub Gist"
        >
          <Upload size={16} />
          <span>Save to Gist</span>
        </button>

        <button
          className="gist-btn gist-btn-import"
          onClick={() => setShowImportModal(true)}
          title="Import from GitHub Gist"
        >
          <Download size={16} />
          <span>Import from Gist</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SAVE MODAL
          ═══════════════════════════════════════════════════════ */}
      {showSaveModal && (
        <div className="gist-modal-overlay" onClick={handleCloseSaveModal}>
          <div className="gist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gist-modal-header">
              <div className="gist-modal-title">
                <Github size={20} />
                <h3>Save to GitHub Gist</h3>
              </div>
              <button
                className="gist-modal-close"
                onClick={handleCloseSaveModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="gist-modal-body">
              {!savedGistUrl ? (
                <>
                  <p className="gist-modal-description">
                    Save all your files to a GitHub Gist for easy sharing and
                    backup.
                  </p>

                  <div className="gist-form-group">
                    <label>Description (optional)</label>
                    <input
                      type="text"
                      className="gist-input"
                      placeholder="e.g., My awesome project"
                      value={gistDescription}
                      onChange={(e) => setGistDescription(e.target.value)}
                    />
                  </div>

                  <div className="gist-files-preview">
                    <label>Files to save ({Object.keys(files).length})</label>
                    <div className="gist-files-list">
                      {Object.keys(files).length === 0 ? (
                        <div
                          className="gist-file-item"
                          style={{ opacity: 0.5 }}
                        >
                          No files to save
                        </div>
                      ) : (
                        Object.keys(files).map((fileName) => (
                          <div key={fileName} className="gist-file-item">
                            📄 {fileName}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    className="gist-btn-primary"
                    onClick={handleSaveToGist}
                    disabled={isSaving || Object.keys(files).length === 0}
                  >
                    {isSaving ? (
                      <>
                        <div className="spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Github size={16} />
                        Save to Gist
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="gist-success">
                    <div className="gist-success-icon">✅</div>
                    <h4>Gist Created Successfully!</h4>
                    <p>Your files have been saved to GitHub Gist</p>
                  </div>

                  <div className="gist-url-container">
                    <input
                      type="text"
                      className="gist-url-input"
                      value={savedGistUrl}
                      readOnly
                    />
                    <button className="gist-copy-btn" onClick={copyGistUrl}>
                      Copy
                    </button>
                  </div>

                  <a
                    href={savedGistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gist-view-btn"
                  >
                    <ExternalLink size={16} />
                    View on GitHub
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          IMPORT MODAL
          ═══════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div
          className="gist-modal-overlay"
          onClick={() => setShowImportModal(false)}
        >
          <div className="gist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gist-modal-header">
              <div className="gist-modal-title">
                <Github size={20} />
                <h3>Import from GitHub Gist</h3>
              </div>
              <button
                className="gist-modal-close"
                onClick={() => setShowImportModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="gist-modal-body">
              <p className="gist-modal-description">
                Paste a GitHub Gist URL to import all files into this room.
              </p>

              <div className="gist-form-group">
                <label>Gist URL</label>
                <input
                  type="text"
                  className="gist-input"
                  placeholder="https://gist.github.com/username/gist-id"
                  value={gistUrl}
                  onChange={(e) => setGistUrl(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && gistUrl.trim()) {
                      handleImportFromGist();
                    }
                  }}
                />
              </div>

              <button
                className="gist-btn-primary"
                onClick={handleImportFromGist}
                disabled={isImporting || !gistUrl.trim()}
              >
                {isImporting ? (
                  <>
                    <div className="spinner" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Import Files
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GistManager;
