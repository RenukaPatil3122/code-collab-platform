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

  // THE KEY FIX:
  // This ref stores only YOUR OWN typed content, per file.
  // It is ONLY written when you type (skipEmit=false).
  // It is NEVER written when a remote update arrives (skipEmit=true).
  // So the debounce always emits YOUR content, not Rose's.
  const myTypedContentRef = useRef({});

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
      delete myTypedContentRef.current[fileName];
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
      if (myTypedContentRef.current[oldName] !== undefined) {
        myTypedContentRef.current[newName] = myTypedContentRef.current[oldName];
        delete myTypedContentRef.current[oldName];
      }
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
    (fileName, content, skipEmit = false) => {
      // Always update React state so UI stays current
      setFiles((prev) => ({
        ...prev,
        [fileName]: { ...prev[fileName], content },
      }));

      if (skipEmit) {
        // This is a REMOTE update from Rose.
        // Do NOT touch myTypedContentRef — that stays as YOUR last typed content.
        // Do NOT emit to server.
        return;
      }

      // This is YOUR own typing.
      // Store in myTypedContentRef — this is the source of truth for the debounce.
      myTypedContentRef.current[fileName] = content;

      // Debounce the emit
      clearTimeout(debounceTimerRef.current[fileName]);
      debounceTimerRef.current[fileName] = setTimeout(() => {
        // Read from myTypedContentRef — YOUR content, never overwritten by remote updates
        const myContent = myTypedContentRef.current[fileName];
        if (myContent === undefined) return;
        socket.emit(SOCKET_EVENTS.FILE_CONTENT_CHANGE, {
          roomId,
          fileName,
          content: myContent,
        });
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
