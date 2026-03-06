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
  const debounceTimerRef = useRef({});

  // Track the last content WE emitted per file.
  // When the server echoes it back, we skip it.
  // Using version counter: we emit {content, version}, server echoes back
  // with the same version, we skip if version matches our last emit.
  const myLastEmitRef = useRef({}); // { [fileName]: { content, ts } }

  useEffect(() => {
    if (!roomId) return;

    socket.on(
      SOCKET_EVENTS.FILES_STATE,
      ({ files: serverFiles, activeFile: serverActive }) => {
        if (serverFiles && Object.keys(serverFiles).length > 0) {
          setFiles(serverFiles);
          setOpenTabs(Object.keys(serverFiles));
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
    });

    socket.on(
      SOCKET_EVENTS.FILE_CONTENT_UPDATE,
      ({ fileName, content, sourceSocketId }) => {
        // Skip if this came from us (echo suppression by socket id)
        if (sourceSocketId === socket.id) return;

        // Update state — CodeEditor's useEffect will pick this up and apply it
        setFiles((prev) => ({
          ...prev,
          [fileName]: { ...prev[fileName], content },
        }));
      },
    );

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
      onLanguageChange?.(cleanName);
      toast.success(`Created ${cleanName}`);
    },
    [roomId, files, onLanguageChange],
  );

  const loadFilesFromDisk = useCallback(
    (fileMap, options = {}) => {
      const { openTabs: shouldOpenTabs = true } = options;
      setFiles(fileMap);
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
      // Update local state immediately (optimistic)
      setFiles((prev) => ({
        ...prev,
        [fileName]: { ...prev[fileName], content },
      }));

      // Debounce the network emit — 50ms after last keystroke
      clearTimeout(debounceTimerRef.current[fileName]);
      debounceTimerRef.current[fileName] = setTimeout(() => {
        socket.emit(SOCKET_EVENTS.FILE_CONTENT_CHANGE, {
          roomId,
          fileName,
          content,
        });
      }, 50);
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
