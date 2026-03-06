// src/contexts/FileContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { socket } from "../utils/socket";
import { SOCKET_EVENTS, EXT_TO_LANGUAGE } from "../utils/constants";
import toast from "react-hot-toast";
import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();
const FileContext = createContext();

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error("useFiles must be used within FileProvider");
  return context;
};

function makeDefaultFiles() {
  return {
    "main.js": { name: "main.js", content: "", language: "javascript" },
  };
}

const getLanguageFromName = (fileName) => {
  const ext = fileName.split(".").pop().toLowerCase();
  return EXT_TO_LANGUAGE[ext] || "plaintext";
};

export const FileProvider = ({ children, roomId, onLanguageChange }) => {
  const [files, setFiles] = useState(makeDefaultFiles);
  const [activeFile, setActiveFileState] = useState("main.js");
  const [openTabs, setOpenTabs] = useState(["main.js"]);

  // ── OT: track what the SERVER last confirmed for each file ────────────────
  // When we compute a patch, we compute it from serverContentRef (what the
  // server last acknowledged), not from our local state.
  // This means even if we have local unsynced chars, the patch is always
  // relative to what the server knows — so the server can apply it cleanly
  // on top of any other user's changes that arrived first.
  const serverContentRef = useRef({}); // { [fileName]: string }

  // Debounce timer per file
  const debounceTimerRef = useRef({});

  // Whether we're waiting for a patch-ack from server (to avoid double-send)
  const pendingPatchRef = useRef({}); // { [fileName]: boolean }

  useEffect(() => {
    if (!roomId) return;

    socket.on(
      SOCKET_EVENTS.FILES_STATE,
      ({ files: serverFiles, activeFile: serverActive }) => {
        if (serverFiles && Object.keys(serverFiles).length > 0) {
          setFiles(serverFiles);
          setOpenTabs(Object.keys(serverFiles));
          // Initialise serverContentRef for all files
          Object.entries(serverFiles).forEach(([name, f]) => {
            serverContentRef.current[name] = f.content || "";
          });
          if (serverActive) {
            setActiveFileState(serverActive);
            onLanguageChange?.(serverActive);
          }
        }
      },
    );

    socket.on(SOCKET_EVENTS.FILE_CREATED, ({ file }) => {
      setFiles((prev) => {
        if (prev[file.name]) return prev;
        return { ...prev, [file.name]: file };
      });
      setOpenTabs((prev) =>
        prev.includes(file.name) ? prev : [...prev, file.name],
      );
      serverContentRef.current[file.name] = file.content || "";
      toast(`📄 New file: ${file.name}`, { duration: 2000 });
    });

    socket.on(SOCKET_EVENTS.FILE_DELETED, ({ fileName }) => {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[fileName];
        const remaining = Object.keys(next);
        setOpenTabs((t) => t.filter((tab) => tab !== fileName));
        setActiveFileState((cur) =>
          cur === fileName ? remaining[0] || null : cur,
        );
        return next;
      });
      delete serverContentRef.current[fileName];
    });

    socket.on(SOCKET_EVENTS.FILE_RENAMED, ({ oldName, newName }) => {
      setFiles((prev) => {
        const next = { ...prev };
        next[newName] = { ...next[oldName], name: newName };
        delete next[oldName];
        return next;
      });
      setOpenTabs((prev) => prev.map((t) => (t === oldName ? newName : t)));
      setActiveFileState((prev) => (prev === oldName ? newName : prev));
      serverContentRef.current[newName] =
        serverContentRef.current[oldName] || "";
      delete serverContentRef.current[oldName];
    });

    // Remote user typed — apply their content to our state and update serverRef
    socket.on(SOCKET_EVENTS.FILE_CONTENT_UPDATE, ({ fileName, content }) => {
      serverContentRef.current[fileName] = content;
      setFiles((prev) => ({
        ...prev,
        [fileName]: { ...prev[fileName], content },
      }));
      // CodeEditor's socket listener handles applying to Monaco with cursor preservation
    });

    // Server confirmed our patch and gives us the authoritative merged content
    // If it differs from what we have locally (conflict was resolved), apply it
    socket.on("file-patch-ack", ({ fileName, content }) => {
      serverContentRef.current[fileName] = content;
      pendingPatchRef.current[fileName] = false;
      // Update files state to match server truth
      setFiles((prev) => {
        if (prev[fileName]?.content === content) return prev;
        return { ...prev, [fileName]: { ...prev[fileName], content } };
      });
    });

    socket.on(SOCKET_EVENTS.FILE_SELECTED, ({ fileName }) => {
      setOpenTabs((prev) =>
        prev.includes(fileName) ? prev : [...prev, fileName],
      );
    });

    return () => {
      socket.off(SOCKET_EVENTS.FILES_STATE);
      socket.off(SOCKET_EVENTS.FILE_CREATED);
      socket.off(SOCKET_EVENTS.FILE_DELETED);
      socket.off(SOCKET_EVENTS.FILE_RENAMED);
      socket.off(SOCKET_EVENTS.FILE_CONTENT_UPDATE);
      socket.off("file-patch-ack");
      socket.off(SOCKET_EVENTS.FILE_SELECTED);
    };
  }, [roomId]);

  const createFile = useCallback(
    (fileName, content = "") => {
      if (!fileName.trim()) return;
      const cleanName = fileName.trim();
      if (files[cleanName]) {
        toast.error("File already exists!");
        return;
      }
      const newFile = {
        name: cleanName,
        content,
        language: getLanguageFromName(cleanName),
      };
      socket.emit(SOCKET_EVENTS.FILE_CREATE, { roomId, file: newFile });
      setFiles((prev) => ({ ...prev, [cleanName]: newFile }));
      setOpenTabs((t) => (t.includes(cleanName) ? t : [...t, cleanName]));
      setActiveFileState(cleanName);
      serverContentRef.current[cleanName] = content;
      onLanguageChange?.(cleanName);
      toast.success(`Created ${cleanName}`);
    },
    [roomId, files, onLanguageChange],
  );

  const loadFilesFromDisk = useCallback(
    (fileMap, options = {}) => {
      const { openTabs: shouldOpenTabs = true } = options;
      setFiles(fileMap);
      Object.entries(fileMap).forEach(([name, f]) => {
        serverContentRef.current[name] = f.content || "";
      });
      const paths = Object.keys(fileMap).filter((p) => !p.endsWith(".gitkeep"));
      if (shouldOpenTabs) {
        setOpenTabs(paths);
        const first = paths[0] || null;
        setActiveFileState(first);
        if (first) onLanguageChange?.(first);
      } else {
        setOpenTabs([]);
        setActiveFileState(null);
      }
      socket.emit(SOCKET_EVENTS.FILES_STATE, {
        roomId,
        files: fileMap,
        activeFile: shouldOpenTabs ? paths[0] : null,
      });
    },
    [roomId, onLanguageChange],
  );

  const deleteFile = useCallback(
    (fileName) => {
      if (Object.keys(files).length === 1) {
        toast.error("Can't delete the last file!");
        return;
      }
      const remaining = Object.keys(files).filter((f) => f !== fileName);
      setFiles((prev) => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });
      setOpenTabs((t) => t.filter((tab) => tab !== fileName));
      setActiveFileState((cur) => (cur === fileName ? remaining[0] : cur));
      socket.emit(SOCKET_EVENTS.FILE_DELETE, { roomId, fileName });
      toast(`🗑️ Deleted ${fileName}`, { duration: 2000 });
    },
    [roomId, files],
  );

  const renameFile = useCallback(
    (oldName, newName) => {
      if (!newName.trim() || oldName === newName) return;
      const cleanNew = newName.trim();
      if (files[cleanNew]) {
        toast.error("File already exists!");
        return;
      }
      setFiles((prev) => {
        const next = { ...prev };
        next[cleanNew] = {
          ...next[oldName],
          name: cleanNew,
          language: getLanguageFromName(cleanNew),
        };
        delete next[oldName];
        return next;
      });
      setOpenTabs((t) => t.map((tab) => (tab === oldName ? cleanNew : tab)));
      setActiveFileState((cur) => (cur === oldName ? cleanNew : cur));
      socket.emit(SOCKET_EVENTS.FILE_RENAME, {
        roomId,
        oldName,
        newName: cleanNew,
      });
    },
    [roomId, files],
  );

  const selectFile = useCallback(
    (fileName) => {
      if (!files[fileName]) return;
      setActiveFileState(fileName);
      setOpenTabs((t) => (t.includes(fileName) ? t : [...t, fileName]));
      socket.emit(SOCKET_EVENTS.FILE_SELECT, { roomId, fileName });
      onLanguageChange?.(fileName);
    },
    [roomId, files, onLanguageChange],
  );

  const closeTab = useCallback(
    (fileName) => {
      setOpenTabs((prev) => prev.filter((t) => t !== fileName));
      setActiveFileState((cur) => {
        if (cur !== fileName) return cur;
        const idx = openTabs.indexOf(fileName);
        const next = openTabs.filter((t) => t !== fileName);
        return next[Math.min(idx, next.length - 1)] || null;
      });
    },
    [openTabs],
  );

  const updateFileContent = useCallback(
    (fileName, content) => {
      // 1. Update local state immediately — user sees own typing instantly
      setFiles((prev) => ({
        ...prev,
        [fileName]: { ...prev[fileName], content },
      }));

      // 2. Debounce the patch emit — 30ms after last keystroke
      clearTimeout(debounceTimerRef.current[fileName]);
      debounceTimerRef.current[fileName] = setTimeout(() => {
        const base = serverContentRef.current[fileName] ?? "";

        // Compute patch from last server-confirmed content to new content
        // This is the OT magic: instead of sending full content, we send
        // only what changed. Server applies this patch on top of whatever
        // other users have typed, merging both correctly.
        const patch = dmp.patch_toText(dmp.patch_make(base, content));

        pendingPatchRef.current[fileName] = true;
        socket.emit("file-patch", {
          roomId,
          fileName,
          patch,
          baseContent: base,
        });

        // Optimistically update serverContentRef — if ack comes back with
        // different content (conflict merged), we'll update again then
        serverContentRef.current[fileName] = content;
      }, 30);
    },
    [roomId],
  );

  const value = {
    files,
    activeFile,
    openTabs,
    activeFileData: files[activeFile] || null,
    createFile,
    loadFilesFromDisk,
    deleteFile,
    renameFile,
    selectFile,
    closeTab,
    updateFileContent,
    getLanguageFromName,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};
