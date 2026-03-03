// aiHandler.js - Gemini AI Integration for CodeTogether
// ✅ Singleton Gemini client (instantiated once at module load)
// ✅ REST routes now enforce RBAC limits via shared helper

const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

// ── Singleton — created once, reused for every request ──
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function askGemini(prompt) {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || !text.trim()) {
      throw new Error("Empty AI response");
    }

    return text;
  } catch (err) {
    console.error("Gemini API error:", err.message);

    // Never expose provider error details to client
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
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

// ─────────────────────────────────────────────────────────────
// ✅ Shared RBAC helper — used by both socket and REST handlers
// ─────────────────────────────────────────────────────────────
async function checkAndConsumeAILimit(userId) {
  const User = require("./models/User");
  const user = await User.findById(userId);
  if (!user) return { allowed: false, reason: "LOGIN_REQUIRED" };

  user.resetDailyUsageIfNeeded();
  const limits = user.getLimits();

  if (
    limits.aiUsagePerDay !== Infinity &&
    user.aiUsage.count >= limits.aiUsagePerDay
  ) {
    return {
      allowed: false,
      reason: "LIMIT_REACHED",
      limit: limits.aiUsagePerDay,
    };
  }

  if (limits.aiUsagePerDay !== Infinity) {
    user.aiUsage.count += 1;
    await user.save();
  }

  return { allowed: true };
}

// ─────────────────────────────────────────────
// Socket Handler
// ─────────────────────────────────────────────
function setupAISocket(socket) {
  socket.on(
    "ai-request",
    async ({ roomId, feature, code, language, errorMessage, context }) => {
      try {
        console.log(`🤖 AI request: ${feature} for ${language}`);

        if (!socket.userId) {
          return socket.emit("ai-response", {
            error: "LOGIN_REQUIRED",
            message: "Please sign in to use the AI Assistant.",
            feature,
          });
        }

        const rbac = await checkAndConsumeAILimit(socket.userId);
        if (!rbac.allowed) {
          return socket.emit("ai-response", {
            error: rbac.reason,
            message:
              rbac.reason === "LIMIT_REACHED"
                ? `You've used all ${rbac.limit} free AI requests today. Upgrade to Pro for unlimited access.`
                : "User not found. Please sign in again.",
            feature,
          });
        }

        if (!code || !code.trim()) {
          socket.emit("ai-response", { error: "No code provided", feature });
          return;
        }

        if (code.length > 15000) {
          return socket.emit("ai-response", {
            error: "Code too large. Please reduce size.",
            feature,
          });
        }

        let response = "";

        switch (feature) {
          case "explain":
            response = await explainCode(code, language);
            break;
          case "debug":
            response = await debugCode(code, language, errorMessage);
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
// Express REST Routes — ✅ NOW WITH RBAC
// ─────────────────────────────────────────────
function setupAIRoutes(app) {
  // Expects your existing auth middleware to set req.userId or req.user._id
  async function rbacMiddleware(req, res, next) {
    const userId = req.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        error: "LOGIN_REQUIRED",
        message: "Please sign in to use the AI Assistant.",
      });
    }

    try {
      const rbac = await checkAndConsumeAILimit(userId);
      if (!rbac.allowed) {
        return res.status(429).json({
          error: rbac.reason,
          message:
            rbac.reason === "LIMIT_REACHED"
              ? `You've used all ${rbac.limit} free AI requests today. Upgrade to Pro for unlimited access.`
              : "User not found. Please sign in again.",
        });
      }
      next();
    } catch (err) {
      res
        .status(500)
        .json({ error: "RBAC check failed", details: err.message });
    }
  }

  app.post("/api/ai/explain", rbacMiddleware, async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code || !code.trim()) {
        return res.status(400).json({ error: "No code provided" });
      }

      if (code.length > 15000) {
        return res.status(400).json({
          error: "Code too large. Please reduce size.",
        });
      }

      const result = await explainCode(code, language);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  app.post("/api/ai/debug", rbacMiddleware, async (req, res) => {
    try {
      const { code, language, errorMessage } = req.body;
      if (!code || !code.trim()) {
        return res.status(400).json({ error: "No code provided" });
      }

      if (code.length > 15000) {
        return res.status(400).json({
          error: "Code too large. Please reduce size.",
        });
      }

      const result = await debugCode(code, language, errorMessage);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  app.post("/api/ai/optimize", rbacMiddleware, async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code || !code.trim()) {
        return res.status(400).json({ error: "No code provided" });
      }

      if (code.length > 15000) {
        return res.status(400).json({
          error: "Code too large. Please reduce size.",
        });
      }

      const result = await optimizeCode(code, language);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  app.post("/api/ai/tests", rbacMiddleware, async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code || !code.trim()) {
        return res.status(400).json({ error: "No code provided" });
      }

      if (code.length > 15000) {
        return res.status(400).json({
          error: "Code too large. Please reduce size.",
        });
      }

      const result = await generateTests(code, language);
      res.json({ success: true, result });
    } catch (err) {
      res
        .status(500)
        .json({ error: "AI request failed", details: err.message });
    }
  });

  console.log("✅ AI REST routes registered (with RBAC)");
}

module.exports = { setupAIRoutes, setupAISocket };
