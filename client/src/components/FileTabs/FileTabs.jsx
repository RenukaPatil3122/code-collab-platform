// src/components/FileTabs/FileTabs.jsx

import React from "react";
import { X } from "lucide-react";
import { useFiles } from "../../contexts/FileContext";
import "./FileTabs.css";

function FileIcon({ name }) {
  const ext = name.split(".").pop().toLowerCase();
  const colorMap = {
    js: "#f7df1e",
    jsx: "#61dafb",
    ts: "#3178c6",
    tsx: "#61dafb",
    py: "#3572A5",
    java: "#b07219",
    cpp: "#f34b7d",
    c: "#555555",
    cs: "#178600",
    go: "#00ADD8",
    rs: "#dea584",
    rb: "#CC342D",
    php: "#4F5D95",
    html: "#e34c26",
    css: "#563d7c",
    json: "#cbcb41",
    md: "#083fa1",
  };
  const color = colorMap[ext] || "#9ca3af";
  return <span className="tab-file-dot" style={{ background: color }} />;
}

function FileTabs() {
  const { openTabs, activeFile, selectFile, closeTab, files } = useFiles();

  if (openTabs.length === 0) return null;

  return (
    <div className="file-tabs-bar">
      {openTabs.map((fileName) => (
        <div
          key={fileName}
          className={`file-tab ${activeFile === fileName ? "active" : ""}`}
          onClick={() => selectFile(fileName)}
          title={fileName}
        >
          <FileIcon name={fileName} />
          <span className="tab-name">{fileName}</span>
          <button
            className="tab-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(fileName);
            }}
            title="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default FileTabs;
