// src/components/version/DiffViewer.jsx

import React from "react";
import { X, RotateCcw, GitCompare } from "lucide-react";
import "./DiffViewer.css";

function DiffViewer({
  oldCode,
  newCode,
  oldLabel,
  newLabel,
  onClose,
  onRestore,
}) {
  // Simple diff algorithm (line-by-line comparison)
  const computeDiff = () => {
    const oldLines = oldCode.split("\n");
    const newLines = newCode.split("\n");
    const maxLines = Math.max(oldLines.length, newLines.length);
    const diff = [];

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || "";
      const newLine = newLines[i] || "";

      if (oldLine === newLine) {
        diff.push({ type: "same", oldLine, newLine, lineNum: i + 1 });
      } else if (!oldLine) {
        diff.push({ type: "added", oldLine, newLine, lineNum: i + 1 });
      } else if (!newLine) {
        diff.push({ type: "removed", oldLine, newLine, lineNum: i + 1 });
      } else {
        diff.push({ type: "modified", oldLine, newLine, lineNum: i + 1 });
      }
    }

    return diff;
  };

  const diff = computeDiff();
  const stats = {
    added: diff.filter((d) => d.type === "added").length,
    removed: diff.filter((d) => d.type === "removed").length,
    modified: diff.filter((d) => d.type === "modified").length,
  };

  return (
    <div className="diff-viewer-overlay">
      <div className="diff-viewer-modal">
        <div className="diff-header">
          <div className="diff-title">
            <GitCompare size={20} />
            <h3>Code Comparison</h3>
          </div>
          <div className="diff-actions">
            {onRestore && (
              <button className="btn-restore-diff" onClick={onRestore}>
                <RotateCcw size={16} />
                Restore This Version
              </button>
            )}
            <button className="btn-close-diff" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="diff-stats">
          <div className="stat-item added">
            <span className="stat-number">{stats.added}</span>
            <span className="stat-label">lines added</span>
          </div>
          <div className="stat-item removed">
            <span className="stat-number">{stats.removed}</span>
            <span className="stat-label">lines removed</span>
          </div>
          <div className="stat-item modified">
            <span className="stat-number">{stats.modified}</span>
            <span className="stat-label">lines modified</span>
          </div>
        </div>

        <div className="diff-content">
          <div className="diff-pane">
            <div className="diff-pane-header old">{oldLabel}</div>
            <div className="diff-pane-content">
              {diff.map((item, idx) => (
                <div
                  key={`old-${idx}`}
                  className={`diff-line ${item.type}`}
                  data-line-num={item.lineNum}
                >
                  <span className="line-number">
                    {item.oldLine ? item.lineNum : ""}
                  </span>
                  <span className="line-content">
                    {item.type === "added" ? "" : item.oldLine || " "}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="diff-divider" />

          <div className="diff-pane">
            <div className="diff-pane-header new">{newLabel}</div>
            <div className="diff-pane-content">
              {diff.map((item, idx) => (
                <div
                  key={`new-${idx}`}
                  className={`diff-line ${item.type}`}
                  data-line-num={item.lineNum}
                >
                  <span className="line-number">
                    {item.newLine ? item.lineNum : ""}
                  </span>
                  <span className="line-content">
                    {item.type === "removed" ? "" : item.newLine || " "}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="diff-legend">
          <div className="legend-item">
            <span className="legend-color added" />
            <span>Added</span>
          </div>
          <div className="legend-item">
            <span className="legend-color removed" />
            <span>Removed</span>
          </div>
          <div className="legend-item">
            <span className="legend-color modified" />
            <span>Modified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;
