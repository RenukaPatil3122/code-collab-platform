require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { setupAIRoutes, setupAISocket } = require("./aiHandler");
const { setupGistRoutes } = require("./gistHandler");
const { executeMultiFile } = require("./executors/multiFileExecutor");
const { verifySocketToken, optionalToken } = require("./middleware/auth");
const { checkInterviewLimit, checkVersionLimit } = require("./middleware/rbac");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./routes/admin");

// ── Yjs ─────────────────────────────────────────────────────────────────────
const { WebSocketServer } = require("ws");
const Y = require("yjs");

// y-websocket uses lib0 variable-length integer encoding.
// We implement the minimal subset needed here directly.
// lib0 writeVarUint encodes a uint as 1-byte if < 128, which covers our message types (0,1,2).
// So for values 0-127, the varint IS just the raw byte — but lib0 also writes
// the payload length as a varint prefix before each sub-message.
// The actual y-websocket message structure (from y-websocket source):
//
//   messageSync (type=0):
//     [0x00] [syncType: varint] [payload: rest of bytes]
//   messageSyncStep1:
//     [0x00, 0x00] + writeVarUint8Array(stateVector)
//   messageSyncStep2:
//     [0x00, 0x01] + writeVarUint8Array(update)
//   messageUpdate (also sent as sync):
//     [0x00, 0x02] + writeVarUint8Array(update)  ← some versions use this
//     OR just broadcasts as-is
//   messageAwareness (type=1):
//     [0x01] + writeVarUint8Array(awarenessUpdate)
//
// writeVarUint8Array = writeVarUint(length) + bytes

function writeVarUint(val) {
  const bytes = [];
  while (val > 127) {
    bytes.push((val & 0x7f) | 0x80);
    val >>>= 7;
  }
  bytes.push(val);
  return Buffer.from(bytes);
}

function writeVarUint8Array(arr) {
  const lenBytes = writeVarUint(arr.length);
  return Buffer.concat([lenBytes, Buffer.from(arr)]);
}

// Read a varint from a Buffer at offset, returns { value, bytesRead }
function readVarUint(buf, offset) {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  while (true) {
    if (offset + bytesRead >= buf.length)
      throw new Error("Unexpected end of buffer reading varint");
    const byte = buf[offset + bytesRead];
    bytesRead++;
    value |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
  }
  return { value, bytesRead };
}

// Read a varUint8Array (length-prefixed byte array)
function readVarUint8Array(buf, offset) {
  const { value: length, bytesRead } = readVarUint(buf, offset);
  const start = offset + bytesRead;
  const end = start + length;
  if (end > buf.length)
    throw new Error("Unexpected end of buffer reading array");
  return { data: buf.slice(start, end), nextOffset: end };
}

// Build a SyncStep1 message: [0x00, 0x00, varUint8Array(stateVector)]
function buildSyncStep1(stateVector) {
  return Buffer.concat([
    Buffer.from([0x00, 0x00]),
    writeVarUint8Array(stateVector),
  ]);
}

// Build a SyncStep2 message: [0x00, 0x01, varUint8Array(update)]
function buildSyncStep2(update) {
  return Buffer.concat([Buffer.from([0x00, 0x01]), writeVarUint8Array(update)]);
}

// Build an update broadcast message: [0x00, 0x02, varUint8Array(update)]
function buildUpdate(update) {
  return Buffer.concat([Buffer.from([0x00, 0x02]), writeVarUint8Array(update)]);
}

console.log(
  "API KEY:",
  process.env.GEMINI_API_KEY ? "✅ Loaded" : "❌ Missing",
);

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gist", optionalToken);
setupGistRoutes(app);
setupAIRoutes(app);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Atlas connected!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const Version = require("./models/Version");

// ── Yjs rooms ────────────────────────────────────────────────────────────────
// Map<roomName, { doc: Y.Doc, conns: Set<WebSocket> }>
const yjsRooms = new Map();

function getYjsRoom(roomName) {
  if (!yjsRooms.has(roomName)) {
    const doc = new Y.Doc();
    const conns = new Set();
    yjsRooms.set(roomName, { doc, conns });

    doc.on("update", (update, origin) => {
      const room = yjsRooms.get(roomName);
      if (!room) return;
      const msg = buildUpdate(update);
      room.conns.forEach((ws) => {
        if (ws !== origin && ws.readyState === 1) ws.send(msg);
      });
    });
  }
  return yjsRooms.get(roomName);
}

function yjsHandleConnection(ws, roomName) {
  const room = getYjsRoom(roomName);
  room.conns.add(ws);
  ws.binaryType = "arraybuffer";

  ws.on("message", (raw) => {
    try {
      const buf = Buffer.from(raw);
      if (buf.length < 1) return;

      const msgType = buf[0]; // 0=sync, 1=awareness

      if (msgType === 0x00) {
        // Sync message
        if (buf.length < 2) return;
        const syncType = buf[1];

        if (syncType === 0x00) {
          // SyncStep1: client sends us its state vector
          // Payload: varUint8Array(stateVector) starting at buf[2]
          const { data: stateVector } = readVarUint8Array(buf, 2);
          const { doc } = room;

          // Reply with SyncStep2: our diff from their state vector
          const diff = Y.encodeStateAsUpdate(doc, new Uint8Array(stateVector));
          ws.send(buildSyncStep2(diff));

          // Also send them our SyncStep1 so they send us their diff
          const ourSV = Y.encodeStateVector(doc);
          ws.send(buildSyncStep1(ourSV));
        } else if (syncType === 0x01 || syncType === 0x02) {
          // SyncStep2 or Update: client sends us an update
          const { data: update } = readVarUint8Array(buf, 2);
          Y.applyUpdate(room.doc, new Uint8Array(update), ws);
        }
      } else if (msgType === 0x01) {
        // Awareness: relay to all other peers as-is
        room.conns.forEach((conn) => {
          if (conn !== ws && conn.readyState === 1) conn.send(raw);
        });
      }
    } catch (e) {
      console.error("Yjs WS parse error:", e.message);
    }
  });

  const cleanup = () => {
    room.conns.delete(ws);
    if (room.conns.size === 0) {
      setTimeout(() => {
        const r = yjsRooms.get(roomName);
        if (r && r.conns.size === 0) {
          r.doc.destroy();
          yjsRooms.delete(roomName);
          console.log(`🗑️ Yjs doc cleaned: ${roomName}`);
        }
      }, 30000);
    }
  };
  ws.on("close", cleanup);
  ws.on("error", cleanup);

  // Initiate handshake: send our SyncStep1 so client can send us diff
  const sv = Y.encodeStateVector(room.doc);
  ws.send(buildSyncStep1(sv));
  console.log(`🔗 Yjs synced: ${roomName} (${room.conns.size} peers)`);
}

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const roomName = url.searchParams.get("room") || url.pathname.slice(1);
  if (!roomName) {
    ws.close();
    return;
  }
  yjsHandleConnection(ws, roomName);
});

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname.startsWith("/socket.io")) return;
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

// ─────────────────────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.use(verifySocketToken);

const rooms = new Map();
const whiteboardStates = new Map();
const runningExecutions = new Map();

const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_SAVE_MAX_COUNT = 15;
const AUTO_SAVE_MIN_LENGTH = 10;

function getRandomColor() {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getDefaultFiles() {
  return {
    "main.js": {
      name: "main.js",
      content:
        '// Welcome! Start coding together...\nconsole.log("Hello World!");',
      language: "javascript",
    },
  };
}

setInterval(async () => {
  for (const [roomId, room] of rooms) {
    try {
      if (room.users.size === 0) continue;
      if (!room.code || room.code.trim().length < AUTO_SAVE_MIN_LENGTH)
        continue;
      const lastAutoSave = await Version.findOne({ roomId, auto: true })
        .sort({ timestamp: -1 })
        .select("code");
      if (lastAutoSave && lastAutoSave.code === room.code) continue;
      const autoSaveCount = await Version.countDocuments({
        roomId,
        auto: true,
      });
      if (autoSaveCount >= AUTO_SAVE_MAX_COUNT) {
        const oldest = await Version.findOne({ roomId, auto: true }).sort({
          timestamp: 1,
        });
        if (oldest) await Version.deleteOne({ _id: oldest._id });
      }
      await Version.create({
        roomId,
        code: room.code,
        message: "Auto-save",
        auto: true,
        timestamp: new Date(),
      });
      console.log(`💾 Auto-saved room ${roomId}`);
    } catch (err) {
      console.error(`❌ Auto-save error for room ${roomId}:`, err);
    }
  }
}, AUTO_SAVE_INTERVAL_MS);

io.on("connection", (socket) => {
  console.log(
    `✅ User connected: ${socket.id} | userId: ${socket.userId || "guest"}`,
  );
  setupAISocket(socket);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        code: '// Welcome! Start coding together...\nconsole.log("Hello World!");',
        language: "javascript",
        users: new Map(),
        testCases: [],
        interviewMode: null,
        previousCode: null,
        files: getDefaultFiles(),
        activeFile: "main.js",
        stdin: "",
        chatMessages: [],
      });
    }
    const room = rooms.get(roomId);
    room.users.set(socket.id, {
      username: username || `Guest${socket.id.slice(0, 4)}`,
      socketId: socket.id,
      color: getRandomColor(),
      userId: socket.userId || null,
    });
    socket.emit("room-state", {
      code: room.code,
      language: room.language,
      users: Array.from(room.users.values()),
      testCases: room.testCases || [],
      files: room.files,
      activeFile: room.activeFile,
      stdin: room.stdin || "",
      chatMessages: room.chatMessages || [],
    });
    socket.emit("files-state", {
      files: room.files,
      activeFile: room.activeFile,
    });
    socket
      .to(roomId)
      .emit("user-joined", {
        username: room.users.get(socket.id).username,
        users: Array.from(room.users.values()),
      });
    console.log(`👤 ${username} joined room: ${roomId}`);
  });

  socket.on("code-change", ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) room.code = code;
  });

  socket.on("language-change", ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.language = language;
      io.to(roomId).emit("language-update", { language });
    }
  });

  socket.on("stdin-change", ({ roomId, stdin }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.stdin = stdin;
      socket.to(roomId).emit("stdin-update", { stdin });
    }
  });

  socket.on("file-create", ({ roomId, file }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.files[file.name] = file;
      socket.to(roomId).emit("file-created", { file });
    }
  });

  socket.on("file-delete", ({ roomId, fileName }) => {
    const room = rooms.get(roomId);
    if (room && room.files[fileName]) {
      delete room.files[fileName];
      if (room.activeFile === fileName)
        room.activeFile = Object.keys(room.files)[0] || null;
      socket.to(roomId).emit("file-deleted", { fileName });
    }
  });

  socket.on("file-rename", ({ roomId, oldName, newName }) => {
    const room = rooms.get(roomId);
    if (room && room.files[oldName]) {
      room.files[newName] = { ...room.files[oldName], name: newName };
      delete room.files[oldName];
      if (room.activeFile === oldName) room.activeFile = newName;
      socket.to(roomId).emit("file-renamed", { oldName, newName });
    }
  });

  socket.on("file-select", ({ roomId, fileName }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.activeFile = fileName;
      socket.to(roomId).emit("file-selected", { fileName });
    }
  });

  socket.on("file-content-change", ({ roomId, fileName, content }) => {
    const room = rooms.get(roomId);
    if (room && room.files[fileName]) {
      room.files[fileName].content = content;
      if (fileName === room.activeFile) room.code = content;
      // NO broadcast — Yjs handles editor sync
    }
  });

  socket.on("update-test-cases", ({ roomId, testCases }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.testCases = testCases;
      socket.to(roomId).emit("test-cases-updated", { testCases });
    }
  });

  socket.on("run-test-cases", async ({ roomId, code, language, testCases }) => {
    try {
      const room = rooms.get(roomId);
      const results = [];
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const startTime = Date.now();
        try {
          const { output, error } = await executeMultiFile(
            room.files,
            language,
            tc.input || "",
            room.activeFile,
          );
          const et = Date.now() - startTime;
          const passed = !error && output.trim() === tc.expectedOutput.trim();
          results.push({
            testCase: i + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: output || error,
            passed,
            executionTime: et,
            error: !!error,
          });
        } catch (e) {
          results.push({
            testCase: i + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: e.message,
            passed: false,
            executionTime: Date.now() - startTime,
            error: true,
          });
        }
      }
      const totalPassed = results.filter((r) => r.passed).length;
      socket.emit("test-results", {
        results,
        summary: {
          total: results.length,
          passed: totalPassed,
          failed: results.length - totalPassed,
        },
      });
    } catch (err) {
      socket.emit("test-results", { results: [], error: err.message });
    }
  });

  socket.on(
    "run-code",
    async ({ roomId, code, language, stdin, activeFile: clientActiveFile }) => {
      try {
        let room = rooms.get(roomId);
        if (!room) {
          const n = clientActiveFile || "main.js";
          rooms.set(roomId, {
            code: code || "",
            language: language || "javascript",
            users: new Map(),
            testCases: [],
            interviewMode: null,
            previousCode: null,
            stdin: stdin || "",
            chatMessages: [],
            files: {
              [n]: {
                name: n,
                content: code || "",
                language: language || "javascript",
              },
            },
            activeFile: n,
          });
          room = rooms.get(roomId);
        }
        const token = { cancelled: false };
        runningExecutions.set(socket.id, token);
        const entryFile = clientActiveFile || room.activeFile;
        if (entryFile) {
          room.files[entryFile] = {
            ...(room.files[entryFile] || {}),
            name: entryFile,
            content: code || "",
            language: language || "javascript",
          };
          room.code = code;
          room.activeFile = entryFile;
        }
        if (language) room.language = language;
        const { output, error, executionTime, memoryUsed } =
          await executeMultiFile(
            room.files,
            language,
            stdin || room.stdin || "",
            entryFile,
          );
        if (token.cancelled) {
          runningExecutions.delete(socket.id);
          return;
        }
        runningExecutions.delete(socket.id);
        socket.emit("code-output", {
          output: output || "Code executed successfully (no output)",
          error,
          success: !error,
          executionTime,
          memoryUsed,
        });
      } catch (err) {
        runningExecutions.delete(socket.id);
        socket.emit("code-output", {
          output: "",
          error: `Execution failed: ${err.message}`,
          success: false,
        });
      }
    },
  );

  socket.on("cancel-execution", () => {
    const t = runningExecutions.get(socket.id);
    if (t) t.cancelled = true;
    socket.emit("execution-cancelled");
  });

  socket.on(
    "start-interview",
    async ({ roomId, problem, difficulty, duration }) => {
      const check = await checkInterviewLimit(socket.userId, difficulty);
      if (!check.allowed)
        return socket.emit("interview-error", {
          error: check.error,
          message: check.message,
        });
      const room = rooms.get(roomId);
      if (room) {
        room.previousCode = room.code;
        room.interviewMode = {
          problem,
          difficulty,
          duration,
          startTime: Date.now(),
        };
        io.to(roomId).emit("interview-started", {
          problem,
          difficulty,
          duration,
        });
      }
    },
  );

  socket.on("end-interview", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.previousCode !== null) {
        room.code = room.previousCode;
        room.previousCode = null;
      }
      room.interviewMode = null;
      io.to(roomId).emit("interview-ended");
    }
  });

  socket.on(
    "submit-interview",
    ({ roomId, code, testResults, timeTaken, difficulty, problem }) => {
      const room = rooms.get(roomId);
      socket.emit("interview-results", {
        results: {
          code,
          testResults,
          timeTaken,
          difficulty,
          problem,
          submittedAt: new Date().toISOString(),
        },
      });
      if (room && room.previousCode !== null) {
        room.code = room.previousCode;
        room.previousCode = null;
      }
    },
  );

  socket.on("save-version", async ({ roomId, code, message }) => {
    const check = await checkVersionLimit(socket.userId, roomId);
    if (!check.allowed)
      return socket.emit("version-saved", {
        error: check.error,
        message: check.message,
      });
    try {
      const v = await Version.create({
        roomId,
        userId: socket.userId || null,
        code,
        message: message || `Saved at ${new Date().toLocaleTimeString()}`,
        auto: false,
        timestamp: new Date(),
      });
      socket.emit("version-saved", {
        version: {
          id: v._id.toString(),
          code: v.code,
          message: v.message,
          auto: v.auto,
          timestamp: v.timestamp,
        },
      });
    } catch (err) {
      socket.emit("version-saved", { error: err.message });
    }
  });

  socket.on("get-versions", async ({ roomId }) => {
    try {
      const dbVersions = await Version.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(50);
      let totalUserSaves = 0;
      if (socket.userId)
        totalUserSaves = await Version.countDocuments({
          userId: socket.userId,
          auto: false,
        });
      socket.emit("versions-list", {
        totalUserSaves,
        versions: dbVersions.map((v) => ({
          id: v._id.toString(),
          code: v.code,
          message: v.message,
          auto: v.auto,
          timestamp: v.timestamp,
        })),
      });
    } catch (err) {
      socket.emit("versions-list", { versions: [], totalUserSaves: 0 });
    }
  });

  socket.on("restore-version", async ({ roomId, versionId }) => {
    try {
      const version = await Version.findById(versionId);
      if (version) {
        const room = rooms.get(roomId);
        if (room) {
          room.code = version.code;
          socket
            .to(roomId)
            .emit("version-restored", {
              version: {
                id: version._id.toString(),
                code: version.code,
                message: version.message,
                auto: version.auto,
                timestamp: version.timestamp,
              },
            });
          socket.to(roomId).emit("code-update", { code: version.code });
        }
      }
    } catch (err) {
      console.error("❌ Restore error:", err);
    }
  });

  socket.on("whiteboard-join", ({ roomId }) => {
    const s = whiteboardStates.get(roomId);
    if (s) socket.emit("whiteboard-state", { imageData: s });
  });
  socket.on("whiteboard-draw", ({ roomId, drawData }) => {
    if (!drawData) return;
    socket.to(roomId).emit("whiteboard-draw", { drawData });
  });
  socket.on("whiteboard-sync", ({ roomId, imageData }) => {
    if (!imageData || imageData.length > 5_000_000) return;
    whiteboardStates.set(roomId, imageData);
  });
  socket.on("whiteboard-clear", ({ roomId }) => {
    whiteboardStates.delete(roomId);
    socket.to(roomId).emit("whiteboard-clear");
  });

  socket.on("chat-message", ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      const chatMsg = {
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
        color: user.color,
      };
      if (!room.chatMessages) room.chatMessages = [];
      room.chatMessages.push(chatMsg);
      if (room.chatMessages.length > 200) room.chatMessages.shift();
      io.to(roomId).emit("chat-message", chatMsg);
    }
  });

  socket.on("cursor-move", ({ roomId, position }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      socket
        .to(roomId)
        .emit("cursor-update", {
          socketId: socket.id,
          username: user.username,
          color: user.color,
          position,
        });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    runningExecutions.delete(socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        socket
          .to(roomId)
          .emit("user-left", {
            username: user.username,
            users: Array.from(room.users.values()),
          });
        if (room.users.size === 0) {
          setTimeout(() => {
            if (rooms.get(roomId)?.users.size === 0) {
              rooms.delete(roomId);
              whiteboardStates.delete(roomId);
              console.log(`🗑️ Deleted empty room: ${roomId}`);
            }
          }, 60000);
        }
      }
    });
  });
});

app.get("/", (req, res) =>
  res.json({
    message: "🚀 CodeTogether Server Running",
    activeRooms: rooms.size,
    timestamp: new Date().toISOString(),
  }),
);
app.get("/api/health", (req, res) =>
  res.json({ status: "OK", uptime: process.uptime() }),
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);

const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(
    async () => {
      try {
        const { default: fetch } = await import("node-fetch").catch(() => ({
          default: global.fetch,
        }));
        const pingFn = fetch || global.fetch;
        if (!pingFn) return;
        const res = await pingFn(`${SELF_URL}/api/health`);
        console.log(`🏓 Keep-alive: ${res.status}`);
      } catch (e) {
        console.warn("⚠️ Keep-alive failed:", e.message);
      }
    },
    14 * 60 * 1000,
  );
  console.log(`🏓 Keep-alive enabled → ${SELF_URL}`);
}
