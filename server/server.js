// server/server.js - COMPLETE WITH GIST SUPPORT

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const { setupAIRoutes, setupAISocket } = require("./aiHandler");
const { setupGistRoutes } = require("./gistHandler");
const { executeMultiFile } = require("./executors/multiFileExecutor");
require("dotenv").config();

console.log(
  "API KEY:",
  process.env.GEMINI_API_KEY ? "✅ Loaded" : "❌ Missing",
);

const app = express();
const server = http.createServer(app);

// ✅ FIXED CORS - Must allow credentials!
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // ✅ This is critical for cookies/sessions!
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// ✅ Session BEFORE routes
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "codetogether-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// ✅ Setup routes
setupGistRoutes(app);
setupAIRoutes(app);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Atlas connected!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const Version = require("./models/Version");

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const rooms = new Map();

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

// Auto-save versions every minute
setInterval(async () => {
  for (const [roomId, room] of rooms) {
    if (room.code && room.code.trim() && room.users.size > 0) {
      try {
        const lastVersion = await Version.findOne({ roomId, auto: true }).sort({
          timestamp: -1,
        });
        if (!lastVersion || lastVersion.code !== room.code) {
          await Version.create({
            roomId,
            code: room.code,
            message: "Auto-save",
            auto: true,
            timestamp: new Date(),
          });
          console.log(`💾 Auto-saved room ${roomId} to MongoDB`);
        }
      } catch (err) {
        console.error(`❌ Auto-save error:`, err);
      }
    }
  }
}, 60000);

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
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
      });
    }

    const room = rooms.get(roomId);
    const userColor = getRandomColor();

    room.users.set(socket.id, {
      username: username || `Guest${socket.id.slice(0, 4)}`,
      socketId: socket.id,
      color: userColor,
    });

    socket.emit("room-state", {
      code: room.code,
      language: room.language,
      users: Array.from(room.users.values()),
      testCases: room.testCases || [],
      files: room.files,
      activeFile: room.activeFile,
    });

    socket.emit("files-state", {
      files: room.files,
      activeFile: room.activeFile,
    });

    socket.to(roomId).emit("user-joined", {
      username: room.users.get(socket.id).username,
      users: Array.from(room.users.values()),
    });

    console.log(`👤 ${username} joined room: ${roomId}`);
  });

  socket.on("code-change", ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.code = code;
      socket.to(roomId).emit("code-update", { code });
    }
  });

  socket.on("language-change", ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.language = language;
      io.to(roomId).emit("language-update", { language });
    }
  });

  socket.on("file-create", ({ roomId, file }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.files[file.name] = file;
      socket.to(roomId).emit("file-created", { file });
      console.log(`📄 File created in ${roomId}: ${file.name}`);
    }
  });

  socket.on("file-delete", ({ roomId, fileName }) => {
    const room = rooms.get(roomId);
    if (room && room.files[fileName]) {
      delete room.files[fileName];
      if (room.activeFile === fileName) {
        room.activeFile = Object.keys(room.files)[0] || null;
      }
      socket.to(roomId).emit("file-deleted", { fileName });
      console.log(`🗑️ File deleted in ${roomId}: ${fileName}`);
    }
  });

  socket.on("file-rename", ({ roomId, oldName, newName }) => {
    const room = rooms.get(roomId);
    if (room && room.files[oldName]) {
      room.files[newName] = { ...room.files[oldName], name: newName };
      delete room.files[oldName];
      if (room.activeFile === oldName) room.activeFile = newName;
      socket.to(roomId).emit("file-renamed", { oldName, newName });
      console.log(`✏️ File renamed in ${roomId}: ${oldName} → ${newName}`);
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
      if (fileName === room.activeFile) {
        room.code = content;
      }
      socket.to(roomId).emit("file-content-update", { fileName, content });
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
      console.log(`🧪 Running ${testCases.length} test cases...`);
      const results = [];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const startTime = Date.now();

        try {
          const { output, error } = await executeMultiFile(
            room.files,
            language,
            testCase.input || "",
            room.activeFile,
          );

          const executionTime = Date.now() - startTime;
          const passed =
            !error && output.trim() === testCase.expectedOutput.trim();

          results.push({
            testCase: i + 1,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: output || error,
            passed,
            executionTime,
            error: !!error,
          });
        } catch (testError) {
          results.push({
            testCase: i + 1,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: testError.message,
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

  socket.on("run-code", async ({ roomId, code, language, stdin }) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("code-output", {
          output: "",
          error: "Room not found",
          success: false,
        });
        return;
      }

      const fileCount = Object.keys(room.files).length;
      console.log(`▶️  Executing ${fileCount} file(s) in room ${roomId}`);
      console.log(`📂 Files: ${Object.keys(room.files).join(", ")}`);
      console.log(`🎯 Active: ${room.activeFile}`);
      console.log(`📥 Stdin: ${stdin ? "YES" : "NO"}`);

      const { output, error } = await executeMultiFile(
        room.files,
        language,
        stdin || "",
        room.activeFile,
      );

      socket.emit("code-output", {
        output: output || "Code executed successfully (no output)",
        error,
        success: !error,
      });

      console.log(`✅ Execution complete for room ${roomId}`);
    } catch (err) {
      console.error("❌ run-code error:", err.message);
      socket.emit("code-output", {
        output: "",
        error: `Execution failed: ${err.message}`,
        success: false,
      });
    }
  });

  socket.on("start-interview", ({ roomId, problem, difficulty, duration }) => {
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
      console.log(`🎯 Interview started in room ${roomId}: ${difficulty}`);
    }
  });

  socket.on("end-interview", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.previousCode !== null) {
        room.code = room.previousCode;
        io.to(roomId).emit("code-update", { code: room.previousCode });
        room.previousCode = null;
      }
      room.interviewMode = null;
      io.to(roomId).emit("interview-ended");
      console.log(`🏁 Interview ended in room ${roomId}`);
    }
  });

  socket.on(
    "submit-interview",
    ({ roomId, code, testResults, timeTaken, difficulty, problem }) => {
      const room = rooms.get(roomId);
      const results = {
        code,
        testResults,
        timeTaken,
        difficulty,
        problem,
        submittedAt: new Date().toISOString(),
      };
      socket.emit("interview-results", { results });
      if (room && room.previousCode !== null) {
        room.code = room.previousCode;
        io.to(roomId).emit("code-update", { code: room.previousCode });
        room.previousCode = null;
      }
      console.log(`📝 Interview submitted in room ${roomId}`);
    },
  );

  socket.on("save-version", async ({ roomId, code, message }) => {
    try {
      const version = await Version.create({
        roomId,
        code,
        message: message || `Saved at ${new Date().toLocaleTimeString()}`,
        auto: false,
        timestamp: new Date(),
      });
      socket.emit("version-saved", {
        version: {
          id: version._id.toString(),
          code: version.code,
          message: version.message,
          auto: version.auto,
          timestamp: version.timestamp,
        },
      });
      console.log(`💾 Version saved to MongoDB: ${version._id}`);
    } catch (err) {
      console.error("❌ Save error:", err);
      socket.emit("version-saved", { error: err.message });
    }
  });

  socket.on("get-versions", async ({ roomId }) => {
    try {
      const dbVersions = await Version.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(50);
      const versions = dbVersions.map((v) => ({
        id: v._id.toString(),
        code: v.code,
        message: v.message,
        auto: v.auto,
        timestamp: v.timestamp,
      }));
      socket.emit("versions-list", { versions });
      console.log(`📚 Sent ${versions.length} versions for room ${roomId}`);
    } catch (err) {
      console.error("❌ Get versions error:", err);
      socket.emit("versions-list", { versions: [] });
    }
  });

  socket.on("restore-version", async ({ roomId, versionId }) => {
    try {
      const version = await Version.findById(versionId);
      if (version) {
        const room = rooms.get(roomId);
        if (room) {
          room.code = version.code;
          io.to(roomId).emit("version-restored", {
            version: {
              id: version._id.toString(),
              code: version.code,
              message: version.message,
              auto: version.auto,
              timestamp: version.timestamp,
            },
          });
          io.to(roomId).emit("code-update", { code: version.code });
          console.log(`🔄 Version restored: ${version._id}`);
        }
      }
    } catch (err) {
      console.error("❌ Restore error:", err);
    }
  });

  socket.on("chat-message", ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      io.to(roomId).emit("chat-message", {
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
        color: user.color,
      });
    }
  });

  socket.on("cursor-move", ({ roomId, position }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      socket.to(roomId).emit("cursor-update", {
        socketId: socket.id,
        username: user.username,
        color: user.color,
        position,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        socket.to(roomId).emit("user-left", {
          username: user.username,
          users: Array.from(room.users.values()),
        });
        if (room.users.size === 0) {
          setTimeout(() => {
            if (rooms.get(roomId)?.users.size === 0) {
              rooms.delete(roomId);
              console.log(`🗑️ Deleted empty room: ${roomId}`);
            }
          }, 60000);
        }
      }
    });
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "🚀 Code Collab Server Running",
    activeRooms: rooms.size,
    features: [
      "Real-time collaboration",
      "Interview Mode",
      "AI Assistant (Gemini)",
      "Version History",
      "Test Cases",
      "Multi-file Support ✅",
      "Module Resolution ✅",
      "GitHub Gist Integration ✅",
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", uptime: process.uptime() });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `✨ Features: Multi-file, GitHub Gist, Interview Mode, AI Assistant`,
  );
});
