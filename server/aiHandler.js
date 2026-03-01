// aiHandler.js - Gemini AI Integration for CodeTogether
// ✅ FIXED: Socket AI requests now enforce RBAC limits (free = 5/day, premium = unlimited)

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function askGemini(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function explainCode(code, language = "JavaScript") {
  const prompt = `
You are an expert ${language} developer and teacher.
Explain the following ${language} code clearly and concisely.
Break it down step by step. Use simple language suitable for developers of all levels.

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. A one-line summary of what this code does
2. A step-by-step breakdown
3. Any important concepts used
`;
  return await askGemini(prompt);
}

async function debugCode(code, language = "JavaScript", errorMessage = "") {
  const prompt = `
You are an expert ${language} debugger.
Analyze the following code for bugs, errors, and issues.

${errorMessage ? `Error reported: ${errorMessage}` : ""}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. List of all bugs/issues found
2. Explanation of why each is a problem
3. The corrected version of the code
4. Tips to avoid these bugs in the future
`;
  return await askGemini(prompt);
}

async function optimizeCode(code, language = "JavaScript") {
  const prompt = `
You are an expert ${language} performance engineer.
Analyze and optimize the following code for:
- Performance
- Readability
- Best practices
- Efficiency

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. Summary of optimizations made
2. The optimized version of the code
3. Explanation of each change and why it's better
`;
  return await askGemini(prompt);
}

async function generateTests(code, language = "JavaScript") {
  const prompt = `
You are an expert ${language} test engineer.
Generate comprehensive unit tests for the following code.

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. Unit tests covering normal cases
2. Edge case tests
3. Error/failure case tests
Use the most appropriate testing framework for ${language} (e.g., Jest for JavaScript, JUnit for Java).
Include comments explaining each test.
`;
  return await askGemini(prompt);
}

async function reviewCode(code, language = "JavaScript") {
  const prompt = `
You are a senior ${language} developer doing a thorough code review.

Code:
\`\`\`${language}
${code}
\`\`\`

Provide a structured review covering:
1. ✅ What's done well
2. ⚠️ Areas for improvement
3. 🐛 Potential bugs or risks
4. 🔒 Security concerns (if any)
5. 📊 Overall rating (1-10) with justification
`;
  return await askGemini(prompt);
}

// ─────────────────────────────────────────────
// Socket Handler — ✅ WITH RBAC LIMIT CHECK
// ─────────────────────────────────────────────
function setupAISocket(socket) {
  socket.on(
    "ai-request",
    async ({ roomId, feature, code, language, error, context }) => {
      try {
        console.log(`🤖 AI request: ${feature} for ${language}`);

        // ── RBAC: require login ──
        if (!socket.userId) {
          return socket.emit("ai-response", {
            error: "LOGIN_REQUIRED",
            message: "Please sign in to use the AI Assistant.",
            feature,
          });
        }

        // ── RBAC: check daily limit ──
        const User = require("./models/User");
        const user = await User.findById(socket.userId);

        if (!user) {
          return socket.emit("ai-response", {
            error: "LOGIN_REQUIRED",
            message: "User not found. Please sign in again.",
            feature,
          });
        }

        user.resetDailyUsageIfNeeded();
        const limits = user.getLimits();

        if (
          limits.aiUsagePerDay !== Infinity &&
          user.aiUsage.count >= limits.aiUsagePerDay
        ) {
          return socket.emit("ai-response", {
            error: "LIMIT_REACHED",
            message: `You've used all ${limits.aiUsagePerDay} free AI requests today. Upgrade to Pro for unlimited access.`,
            feature,
          });
        }

        // Increment usage for non-premium users
        if (limits.aiUsagePerDay !== Infinity) {
          user.aiUsage.count += 1;
          await user.save();
        }
        // ── end RBAC ──

        if (!code || !code.trim()) {
          socket.emit("ai-response", { error: "No code provided", feature });
          return;
        }

        let response = "";

        switch (feature) {
          case "explain":
            response = await explainCode(code, language);
            break;
          case "debug":
            response = await debugCode(code, language, error);
            break;
          case "optimize":
            response = await optimizeCode(code, language);
            break;
          case "generate_tests":
            response = await generateTests(code, language);
            break;
          default:
            response = await reviewCode(code, language);
        }

        socket.emit("ai-response", { response, feature });
        console.log(`✅ AI response sent for feature: ${feature}`);
      } catch (err) {
        console.error("❌ AI request error:", err.message);
        socket.emit("ai-response", { error: err.message, feature });
      }
    },
  );
}

// ─────────────────────────────────────────────
// Express REST Routes
// ─────────────────────────────────────────────
function setupAIRoutes(app) {
  app.post("/api/ai/explain", async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) return res.status(400).json({ error: "No code provided" });
      const result = await explainCode(code, language);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  app.post("/api/ai/debug", async (req, res) => {
    try {
      const { code, language, errorMessage } = req.body;
      if (!code) return res.status(400).json({ error: "No code provided" });
      const result = await debugCode(code, language, errorMessage);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  app.post("/api/ai/optimize", async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) return res.status(400).json({ error: "No code provided" });
      const result = await optimizeCode(code, language);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  app.post("/api/ai/tests", async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) return res.status(400).json({ error: "No code provided" });
      const result = await generateTests(code, language);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  console.log("✅ AI REST routes registered");
}

module.exports = { setupAIRoutes, setupAISocket };
