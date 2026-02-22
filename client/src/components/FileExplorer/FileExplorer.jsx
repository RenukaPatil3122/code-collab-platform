// src/components/FileExplorer/FileExplorer.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  FilePlus,
  FolderPlus,
  Trash2,
  Edit3,
  FileCode,
  ChevronRight,
  Folder,
  Files,
} from "lucide-react";
import { useFiles } from "../../contexts/FileContext";
import "./FileExplorer.css";

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
    c: "#888",
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
  return (
    <FileCode
      size={14}
      style={{ color: colorMap[ext] || "#9ca3af", flexShrink: 0 }}
    />
  );
}

function FolderItem({ folderName, children, isCollapsed }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const { createFile } = useFiles();

  // Show folder icon when collapsed — just like file icons
  if (isCollapsed) {
    return (
      <div
        className="file-item-icon"
        title={folderName}
        style={{ cursor: "default" }}
      >
        <Folder size={15} style={{ color: "#dcb67a", flexShrink: 0 }} />
      </div>
    );
  }

  const handleAddFileInFolder = (name) => {
    if (name.trim()) createFile(`${folderName}/${name.trim()}`);
    setIsCreatingFile(false);
  };

  return (
    <div className="folder-wrapper">
      <div className="folder-item" onClick={() => setIsExpanded(!isExpanded)}>
        <ChevronRight
          size={13}
          className={`folder-chevron ${isExpanded ? "open" : ""}`}
        />
        <Folder size={13} style={{ color: "#dcb67a", flexShrink: 0 }} />
        <span className="folder-name">{folderName}</span>
        <button
          className="folder-add-btn"
          title="New file in folder"
          onClick={(e) => {
            e.stopPropagation();
            setIsCreatingFile(true);
            setIsExpanded(true);
          }}
        >
          <FilePlus size={11} />
        </button>
      </div>

      {isExpanded && (
        <div className="folder-contents">
          {children}
          {isCreatingFile && (
            <NewFileInput
              onSubmit={handleAddFileInFolder}
              onCancel={() => setIsCreatingFile(false)}
              indent
            />
          )}
        </div>
      )}
    </div>
  );
}

function FileItem({
  fileName,
  isActive,
  onSelect,
  onDelete,
  onRename,
  isCollapsed,
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(fileName);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      const dotIdx = renameValue.lastIndexOf(".");
      inputRef.current.setSelectionRange(
        0,
        dotIdx > 0 ? dotIdx : renameValue.length,
      );
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== fileName)
      onRename(fileName, renameValue.trim());
    setIsRenaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setRenameValue(fileName);
      setIsRenaming(false);
    }
  };

  // Display only the filename (not folder path) — like VSCode
  const displayName = fileName.includes("/")
    ? fileName.split("/").pop()
    : fileName;

  if (isCollapsed) {
    return (
      <div
        className={`file-item-icon ${isActive ? "active" : ""}`}
        onClick={() => onSelect(fileName)}
        title={displayName}
      >
        <FileIcon name={fileName} />
      </div>
    );
  }

  return (
    <div
      className={`file-item ${isActive ? "active" : ""}`}
      onClick={() => !isRenaming && onSelect(fileName)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <FileIcon name={fileName} />
      {isRenaming ? (
        <div
          className="rename-input-wrapper"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            className="rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRenameSubmit}
          />
        </div>
      ) : (
        <span className="file-name" title={fileName}>
          {displayName}
        </span>
      )}
      {showActions && !isRenaming && (
        <div className="file-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="file-action-btn"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setRenameValue(fileName);
              setIsRenaming(true);
            }}
          >
            <Edit3 size={11} />
          </button>
          <button
            className="file-action-btn danger"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(fileName);
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function NewFileInput({
  onSubmit,
  onCancel,
  isFolder = false,
  indent = false,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (value.trim()) onSubmit(value.trim());
    else onCancel();
  };

  return (
    <div className={`new-file-input-row ${indent ? "indent" : ""}`}>
      {isFolder ? (
        <Folder size={13} style={{ color: "#dcb67a", flexShrink: 0 }} />
      ) : (
        <FileCode size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
      )}
      <input
        ref={inputRef}
        className="rename-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={handleSubmit}
        placeholder={isFolder ? "folder-name" : "filename.js"}
      />
    </div>
  );
}

function FileExplorer() {
  const { files, activeFile, createFile, deleteFile, renameFile, selectFile } =
    useFiles();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  // ✅ FIX: Track folders in local state so empty folders render correctly
  const [localFolders, setLocalFolders] = useState([]);

  const handleCreate = (name) => {
    createFile(name);
    setIsCreating(false);
  };

  // ✅ FIX: No .gitkeep hack — just track folder names locally
  const handleCreateFolder = (name) => {
    if (name.trim()) {
      setLocalFolders((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }
    setIsCreatingFolder(false);
  };

  const handleDelete = (fileName) => {
    deleteFile(fileName);
  };
  const handleRename = (oldName, newName) => {
    renameFile(oldName, newName);
  };
  const handleSelect = (fileName) => {
    selectFile(fileName);
  };

  // ✅ FIX: Seed with localFolders so empty folders always appear
  const organizeFiles = () => {
    const structure = {};
    localFolders.forEach((f) => {
      if (!structure[f]) structure[f] = [];
    });

    Object.keys(files).forEach((filePath) => {
      if (filePath.includes("/")) {
        const parts = filePath.split("/");
        const folderName = parts[0];
        const fileName = parts.slice(1).join("/");
        if (fileName === ".gitkeep") return; // skip legacy gitkeep
        if (!structure[folderName]) structure[folderName] = [];
        structure[folderName].push({ path: filePath, name: fileName });
      } else {
        if (!structure["__root__"]) structure["__root__"] = [];
        structure["__root__"].push({ path: filePath, name: filePath });
      }
    });
    return structure;
  };

  const fileStructure = organizeFiles();

  return (
    <div className={`file-explorer ${isExpanded ? "" : "collapsed"}`}>
      <div className="explorer-header">
        <div
          className="explorer-title"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <>
              <ChevronRight
                size={13}
                className={`chevron ${isExpanded ? "open" : ""}`}
              />
              <span>FILES</span>
            </>
          ) : (
            <Files size={16} style={{ margin: "0 auto" }} />
          )}
        </div>

        {isExpanded && (
          <div className="explorer-actions">
            <button
              className="explorer-action-btn"
              title="New File"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreating(true);
              }}
            >
              <FilePlus size={14} />
            </button>
            <button
              className="explorer-action-btn"
              title="New Folder"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreatingFolder(true);
              }}
            >
              <FolderPlus size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="file-list">
        {/* Root files */}
        {fileStructure["__root__"]?.map(({ path }) => (
          <FileItem
            key={path}
            fileName={path}
            isActive={activeFile === path}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onRename={handleRename}
            isCollapsed={!isExpanded}
          />
        ))}

        {/* Folders */}
        {Object.keys(fileStructure)
          .filter((key) => key !== "__root__")
          .map((folderName) => (
            <FolderItem
              key={folderName}
              folderName={folderName}
              isCollapsed={!isExpanded}
            >
              {fileStructure[folderName].map(({ path }) => (
                <FileItem
                  key={path}
                  fileName={path}
                  isActive={activeFile === path}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  isCollapsed={false}
                />
              ))}
            </FolderItem>
          ))}

        {isExpanded && isCreating && (
          <NewFileInput
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        )}
        {isExpanded && isCreatingFolder && (
          <NewFileInput
            isFolder
            onSubmit={handleCreateFolder}
            onCancel={() => setIsCreatingFolder(false)}
          />
        )}
      </div>
    </div>
  );
}

export default FileExplorer;
