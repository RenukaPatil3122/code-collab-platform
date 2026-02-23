// src/components/FileExplorer/FileExplorer.jsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  FilePlus,
  FolderPlus,
  FolderOpen,
  Trash2,
  Edit3,
  FileCode,
  ChevronRight,
  Folder,
  Files,
  Copy,
  Scissors,
  Clipboard,
} from "lucide-react";
import { useFiles } from "../../contexts/FileContext";
import "./FileExplorer.css";

// ─── Context Menu ─────────────────────────────────────────────────────────────
function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const handleClick = (e) => {
      if (!menuRef.current?.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setPos({
      x:
        x + rect.width > window.innerWidth
          ? window.innerWidth - rect.width - 8
          : x,
      y:
        y + rect.height > window.innerHeight
          ? window.innerHeight - rect.height - 8
          : y,
    });
  }, [x, y]);

  return (
    <div ref={menuRef} className="ctx-menu" style={{ left: pos.x, top: pos.y }}>
      {items.map((item, i) =>
        item === "---" ? (
          <div key={i} className="ctx-divider" />
        ) : (
          <button
            key={i}
            className={`ctx-item ${item.danger ? "danger" : ""}`}
            onClick={() => {
              item.action();
              onClose();
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="ctx-icon">{item.icon}</span>}
            <span className="ctx-label">{item.label}</span>
            {item.shortcut && (
              <span className="ctx-shortcut">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}

// ─── File Icon ────────────────────────────────────────────────────────────────
function FileIcon({ name }) {
  const lower = name.toLowerCase();
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
    scss: "#c6538c",
    json: "#cbcb41",
    md: "#083fa1",
    yml: "#cb171e",
    yaml: "#cb171e",
    sh: "#89e051",
    vue: "#41b883",
    svelte: "#ff3e00",
  };
  const specialMap = {
    ".env": "#eacd61",
    ".gitignore": "#f14e32",
    dockerfile: "#2496ed",
    ".gitkeep": "#4e5769",
    makefile: "#427819",
  };
  const color = specialMap[lower] || colorMap[ext] || "#9ca3af";
  return <FileCode size={14} style={{ color, flexShrink: 0 }} />;
}

// ─── Build nested tree from flat paths ───────────────────────────────────────
function buildTree(filePaths) {
  const root = { type: "root", children: {} };
  for (const filePath of filePaths) {
    if (filePath.endsWith(".gitkeep")) {
      // Still register the folder but don't show the file
      const parts = filePath.split("/");
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node.children[parts[i]])
          node.children[parts[i]] = { type: "dir", children: {} };
        node = node.children[parts[i]];
      }
      continue;
    }
    const parts = filePath.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        node.children[part] = { type: "file", path: filePath };
      } else {
        if (!node.children[part])
          node.children[part] = { type: "dir", children: {} };
        node = node.children[part];
      }
    }
  }
  return root;
}

// Dirs first, then files, both alpha-sorted
function sortedEntries(children) {
  return Object.entries(children).sort(([an, av], [bn, bv]) => {
    if (av.type === "dir" && bv.type !== "dir") return -1;
    if (av.type !== "dir" && bv.type === "dir") return 1;
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
  });
}

function findFirstFile(node) {
  if (node.type === "file") return node.path;
  for (const child of Object.values(node.children)) {
    const f = findFirstFile(child);
    if (f) return f;
  }
  return null;
}

// ─── Inline Input ─────────────────────────────────────────────────────────────
function NewNameInput({
  icon,
  placeholder,
  indentPx = 16,
  onSubmit,
  onCancel,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const go = () => {
    if (value.trim()) onSubmit(value.trim());
    else onCancel();
  };
  return (
    <div className="new-file-input-row" style={{ paddingLeft: indentPx }}>
      {icon}
      <input
        ref={inputRef}
        className="rename-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={go}
      />
    </div>
  );
}

// ─── Recursive Tree Node ──────────────────────────────────────────────────────
function TreeNode({
  name,
  node,
  depth,
  activeFile,
  onSelect,
  onDelete,
  onRename,
  onCut,
  onCopy,
  clipboard,
  onPaste,
  onCreateFile,
  onDeleteFolder,
  onRenameFolder,
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(name);
  const [creatingFile, setCreatingFile] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [ctx, setCtx] = useState(null);
  const inputRef = useRef(null);
  const indentPx = depth * 12;

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      const dot = renameVal.lastIndexOf(".");
      inputRef.current.setSelectionRange(0, dot > 0 ? dot : renameVal.length);
    }
  }, [renaming]);

  const openCtx = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  // ── FILE node ──────────────────────────────────────────────────────────────
  if (node.type === "file") {
    const filePath = node.path;

    const submitRename = () => {
      if (renameVal.trim() && renameVal !== name) {
        const parts = filePath.split("/");
        parts[parts.length - 1] = renameVal.trim();
        onRename(filePath, parts.join("/"));
      }
      setRenaming(false);
    };

    const ctxItems = [
      {
        icon: <Edit3 size={13} />,
        label: "Rename",
        shortcut: "F2",
        action: () => {
          setRenameVal(name);
          setRenaming(true);
        },
      },
      "---",
      {
        icon: <Scissors size={13} />,
        label: "Cut",
        shortcut: "⌘X",
        action: () => onCut(filePath),
      },
      {
        icon: <Copy size={13} />,
        label: "Copy",
        shortcut: "⌘C",
        action: () => onCopy(filePath),
      },
      {
        icon: <Clipboard size={13} />,
        label: "Paste",
        shortcut: "⌘V",
        disabled: !clipboard,
        action: () => onPaste(filePath),
      },
      "---",
      {
        icon: <Trash2 size={13} />,
        label: "Delete",
        shortcut: "Del",
        danger: true,
        action: () => onDelete(filePath),
      },
    ];

    return (
      <div
        className={`file-item ${activeFile === filePath ? "active" : ""}`}
        style={{ paddingLeft: 16 + indentPx }}
        onClick={() => !renaming && onSelect(filePath)}
        onContextMenu={openCtx}
      >
        <FileIcon name={name} />
        {renaming ? (
          <div
            className="rename-input-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className="rename-input"
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") {
                  setRenameVal(name);
                  setRenaming(false);
                }
              }}
              onBlur={submitRename}
            />
          </div>
        ) : (
          <span className="file-name" title={filePath}>
            {name}
          </span>
        )}
        {ctx && (
          <ContextMenu
            x={ctx.x}
            y={ctx.y}
            items={ctxItems}
            onClose={() => setCtx(null)}
          />
        )}
      </div>
    );
  }

  // ── DIR node ───────────────────────────────────────────────────────────────
  // Reconstruct this dir's full path from the first file inside it
  const getDirPath = () => {
    const firstFile = findFirstFile(node);
    if (!firstFile) return name; // empty folder
    const fp = firstFile.split("/");
    const idx = fp.lastIndexOf(name);
    return idx >= 0 ? fp.slice(0, idx + 1).join("/") : name;
  };

  const submitDirRename = () => {
    if (renameVal.trim() && renameVal !== name)
      onRenameFolder(getDirPath(), renameVal.trim());
    setRenaming(false);
  };

  const ctxItems = [
    {
      icon: <FilePlus size={13} />,
      label: "New File",
      action: () => {
        setCreatingFile(true);
        setExpanded(true);
      },
    },
    {
      icon: <FolderPlus size={13} />,
      label: "New Folder",
      action: () => {
        setCreatingFolder(true);
        setExpanded(true);
      },
    },
    "---",
    {
      icon: <Edit3 size={13} />,
      label: "Rename",
      shortcut: "F2",
      action: () => {
        setRenameVal(name);
        setRenaming(true);
      },
    },
    {
      icon: <Trash2 size={13} />,
      label: "Delete Folder",
      danger: true,
      action: () => onDeleteFolder(getDirPath()),
    },
  ];

  return (
    <div className="folder-wrapper" onContextMenu={openCtx}>
      <div
        className="folder-item"
        style={{ paddingLeft: 12 + indentPx }}
        onClick={() => !renaming && setExpanded(!expanded)}
      >
        <ChevronRight
          size={13}
          className={`folder-chevron ${expanded ? "open" : ""}`}
        />
        <Folder size={13} style={{ color: "#dcb67a", flexShrink: 0 }} />
        {renaming ? (
          <div
            className="rename-input-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              className="rename-input"
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitDirRename();
                if (e.key === "Escape") {
                  setRenameVal(name);
                  setRenaming(false);
                }
              }}
              onBlur={submitDirRename}
            />
          </div>
        ) : (
          <span className="folder-name">{name}</span>
        )}
        {!renaming && (
          <button
            className="folder-add-btn"
            title="New file"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingFile(true);
              setExpanded(true);
            }}
          >
            <FilePlus size={11} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="folder-contents-tree">
          {sortedEntries(node.children).map(([cName, cNode]) => (
            <TreeNode
              key={cName}
              name={cName}
              node={cNode}
              depth={depth + 1}
              activeFile={activeFile}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onCut={onCut}
              onCopy={onCopy}
              clipboard={clipboard}
              onPaste={onPaste}
              onCreateFile={onCreateFile}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}

          {creatingFile && (
            <NewNameInput
              icon={<FileCode size={13} style={{ color: "#9ca3af" }} />}
              placeholder="filename.js"
              indentPx={12 + indentPx + 20}
              onSubmit={(n) => {
                onCreateFile(`${getDirPath()}/${n}`);
                setCreatingFile(false);
              }}
              onCancel={() => setCreatingFile(false)}
            />
          )}
          {creatingFolder && (
            <NewNameInput
              icon={<Folder size={13} style={{ color: "#dcb67a" }} />}
              placeholder="folder-name"
              indentPx={12 + indentPx + 20}
              onSubmit={(n) => {
                onCreateFile(`${getDirPath()}/${n}/.gitkeep`);
                setCreatingFolder(false);
              }}
              onCancel={() => setCreatingFolder(false)}
            />
          )}
        </div>
      )}

      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          items={ctxItems}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  );
}

// ─── Main FileExplorer ────────────────────────────────────────────────────────
function FileExplorer() {
  const {
    files,
    activeFile,
    createFile,
    loadFilesFromDisk,
    deleteFile,
    renameFile,
    selectFile,
    getLanguageFromName,
  } = useFiles();
  const [isExpanded, setIsExpanded] = useState(true);
  const [clipboard, setClipboard] = useState(null);
  const [explorerCtx, setExplorerCtx] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);

  const handleCut = (p) => setClipboard({ type: "cut", name: p });
  const handleCopy = (p) => setClipboard({ type: "copy", name: p });
  const handlePaste = (nearFile) => {
    if (!clipboard) return;
    const baseName = clipboard.name.split("/").pop();
    const folder = nearFile?.includes("/")
      ? nearFile.split("/").slice(0, -1).join("/")
      : null;
    const newPath = folder ? `${folder}/${baseName}` : baseName;
    if (files[clipboard.name]) {
      createFile(newPath, files[clipboard.name].content);
      if (clipboard.type === "cut") deleteFile(clipboard.name);
    }
    setClipboard(null);
  };

  const handleDeleteFolder = (folderPath) => {
    Object.keys(files).forEach((p) => {
      if (p === folderPath || p.startsWith(`${folderPath}/`)) deleteFile(p);
    });
  };

  const handleRenameFolder = (oldPath, newName) => {
    const parent = oldPath.includes("/")
      ? oldPath.split("/").slice(0, -1).join("/")
      : null;
    const newPath = parent ? `${parent}/${newName}` : newName;
    Object.keys(files).forEach((p) => {
      if (p === oldPath || p.startsWith(`${oldPath}/`)) {
        renameFile(p, newPath + p.slice(oldPath.length));
      }
    });
  };

  const handleOpenFolder = async () => {
    const SKIP = new Set([
      "node_modules",
      ".git",
      "__pycache__",
      "dist",
      "build",
      ".next",
      "coverage",
      "venv",
      ".venv",
      "target",
      ".turbo",
    ]);
    const buildMap = (entries) =>
      Object.fromEntries(
        entries.map(([path, content]) => [
          path,
          { name: path, content, language: getLanguageFromName(path) },
        ]),
      );

    try {
      if (window.showDirectoryPicker) {
        const dirHandle = await window.showDirectoryPicker();
        const collected = [];
        const readDir = async (handle, prefix = "") => {
          for await (const [name, entry] of handle.entries()) {
            if (SKIP.has(name)) continue;
            const path = prefix ? `${prefix}/${name}` : name;
            if (entry.kind === "file") {
              try {
                collected.push([path, await (await entry.getFile()).text()]);
              } catch {}
            } else {
              await readDir(entry, path);
            }
          }
        };
        await readDir(dirHandle);
        // ✅ Pass openTabs:false so no files auto-open in editor
        loadFilesFromDisk(buildMap(collected), { openTabs: false });
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.onchange = async () => {
          const collected = [];
          for (const file of Array.from(input.files)) {
            const parts = file.webkitRelativePath.split("/").slice(1);
            const path = parts.join("/");
            if (!path || SKIP.has(parts[0])) continue;
            try {
              collected.push([path, await file.text()]);
            } catch {}
          }
          loadFilesFromDisk(buildMap(collected), { openTabs: false });
        };
        input.click();
      }
    } catch {}
  };

  const explorerCtxItems = [
    {
      icon: <FilePlus size={13} />,
      label: "New File",
      action: () => setIsCreating(true),
    },
    {
      icon: <FolderPlus size={13} />,
      label: "New Folder",
      action: () => setIsCreatingFolder(true),
    },
    "---",
    {
      icon: <Clipboard size={13} />,
      label: "Paste",
      shortcut: "⌘V",
      disabled: !clipboard,
      action: () => handlePaste(null),
    },
  ];

  return (
    <div className={`file-explorer ${isExpanded ? "" : "collapsed"}`}>
      <div className="explorer-header">
        <div
          className="explorer-title"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
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
            <button
              className="explorer-action-btn"
              title="Open Folder"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFolder();
              }}
            >
              <FolderOpen size={14} />
            </button>
          </div>
        )}
      </div>

      <div
        className="file-list"
        onContextMenu={(e) => {
          if (e.target.classList.contains("file-list")) {
            e.preventDefault();
            setExplorerCtx({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        {isExpanded && (
          <>
            {/* ✅ Full recursive tree — dirs first, files after, infinitely nested */}
            {sortedEntries(tree.children).map(([name, node]) => (
              <TreeNode
                key={name}
                name={name}
                node={node}
                depth={0}
                activeFile={activeFile}
                onSelect={selectFile}
                onDelete={deleteFile}
                onRename={renameFile}
                onCut={handleCut}
                onCopy={handleCopy}
                clipboard={clipboard}
                onPaste={handlePaste}
                onCreateFile={createFile}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
              />
            ))}

            {isCreating && (
              <NewNameInput
                icon={<FileCode size={13} style={{ color: "#9ca3af" }} />}
                placeholder="filename.js"
                indentPx={16}
                onSubmit={(n) => {
                  createFile(n);
                  setIsCreating(false);
                }}
                onCancel={() => setIsCreating(false)}
              />
            )}
            {isCreatingFolder && (
              <NewNameInput
                icon={<Folder size={13} style={{ color: "#dcb67a" }} />}
                placeholder="folder-name"
                indentPx={16}
                onSubmit={(n) => {
                  createFile(`${n}/.gitkeep`);
                  setIsCreatingFolder(false);
                }}
                onCancel={() => setIsCreatingFolder(false)}
              />
            )}
          </>
        )}

        {!isExpanded &&
          Object.keys(files)
            .filter((p) => !p.endsWith(".gitkeep"))
            .map((path) => (
              <div
                key={path}
                className={`file-item-icon ${activeFile === path ? "active" : ""}`}
                onClick={() => selectFile(path)}
                title={path.split("/").pop()}
              >
                <FileIcon name={path.split("/").pop()} />
              </div>
            ))}
      </div>

      {explorerCtx && (
        <ContextMenu
          x={explorerCtx.x}
          y={explorerCtx.y}
          items={explorerCtxItems}
          onClose={() => setExplorerCtx(null)}
        />
      )}
    </div>
  );
}

export default FileExplorer;
