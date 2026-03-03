// server/gistHandler.js - FIXED VERSION WITH PERSONAL ACCESS TOKEN

const axios = require("axios");
const User = require("./models/User"); // ✅ add this
const FREE_GIST_LIMIT = 3; // ✅ add this

function setupGistRoutes(app) {
  // ─────────────────────────────────────────────────────────────────
  // 1. CHECK AUTH STATUS
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/gist/check-auth", (req, res) => {
    const hasToken = !!process.env.GITHUB_ACCESS_TOKEN;

    console.log("🔐 Auth check:", hasToken ? "✅ Token found" : "❌ No token");

    res.json({
      authenticated: hasToken,
      method: "personal_token",
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 1.5 GET GIST USAGE (daily count)
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/gist/usage", async (req, res) => {
    try {
      const userId = req.userId || req.user?._id;
      if (!userId) return res.json({ count: 0 });

      const user = await User.findById(userId);
      if (!user) return res.json({ count: 0 });

      user.resetDailyUsageIfNeeded?.();

      res.json({ count: user.gistUsage?.count ?? 0 });
    } catch (err) {
      console.error("Usage fetch error:", err.message);
      res.json({ count: 0 }); // fail safe
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. SAVE FILES TO GIST
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/gist/save", async (req, res) => {
    try {
      const { files, description, roomId, username } = req.body;

      console.log("📤 Save request:", {
        fileCount: Object.keys(files || {}).length,
        roomId,
        username,
      });

      // Validate token
      if (!process.env.GITHUB_ACCESS_TOKEN) {
        console.error("❌ No GitHub token found in environment");
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured. Add GITHUB_ACCESS_TOKEN to .env",
        });
      }

      // Validate input
      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files to save",
        });
      }

      // Format files for Gist API
      const gistFiles = {};

      Object.entries(files).forEach(([fileName, fileData]) => {
        // Handle both formats: fileData.content or direct content
        const content =
          typeof fileData === "object" ? fileData.content : fileData;

        gistFiles[fileName] = {
          content: content || "// Empty file",
        };
      });

      // Add metadata file
      gistFiles["_codetogether_metadata.json"] = {
        content: JSON.stringify(
          {
            roomId,
            username,
            savedAt: new Date().toISOString(),
            fileCount: Object.keys(files).length,
            tool: "CodeTogether",
          },
          null,
          2,
        ),
      };

      console.log(
        "📝 Creating Gist with",
        Object.keys(gistFiles).length,
        "files",
      );

      // ✅ Fetch user
      const userId = req.userId || req.user?._id;
      const user = userId ? await User.findById(userId) : null;

      // ✅ Enforce free limit
      if (user && user.role === "free") {
        user.resetDailyUsageIfNeeded?.();
        const count = user.gistUsage?.count ?? 0;

        if (count >= FREE_GIST_LIMIT) {
          return res.status(429).json({
            success: false,
            error: "LIMIT_REACHED",
            message:
              "You've used all 3 free Gist saves today. Upgrade to Pro for unlimited.",
          });
        }
      }

      // Create Gist via GitHub API
      const gistResponse = await axios.post(
        "https://api.github.com/gists",
        {
          description: description || `CodeTogether Session - Room ${roomId}`,
          public: false, // Secret gist
          files: gistFiles,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "CodeTogether-App",
          },
        },
      );

      console.log("✅ Gist created:", gistResponse.data.html_url);

      // ✅ Increment usage for free users
      if (user && user.role === "free") {
        if (!user.gistUsage)
          user.gistUsage = { count: 0, lastReset: new Date() };

        user.gistUsage.count += 1;
        await user.save();
      }

      res.json({
        success: true,
        gistUrl: gistResponse.data.html_url,
        gistId: gistResponse.data.id,
        filesCount: Object.keys(files).length,
        saveCount: user?.gistUsage?.count ?? 0, // ✅ important
      });
    } catch (error) {
      console.error("❌ Save to Gist error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to save Gist",
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. IMPORT FILES FROM GIST
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/gist/import", async (req, res) => {
    try {
      const { gistUrl } = req.body;

      console.log("📥 Import request:", gistUrl);

      if (!gistUrl || !gistUrl.trim()) {
        return res.status(400).json({
          success: false,
          error: "Gist URL is required",
        });
      }

      // Extract Gist ID from various URL formats
      let gistId = null;

      // Format: https://gist.github.com/username/abc123
      const match1 = gistUrl.match(/gist\.github\.com\/[^/]+\/([a-f0-9]+)/i);
      // Format: https://gist.github.com/abc123
      const match2 = gistUrl.match(/gist\.github\.com\/([a-f0-9]+)/i);
      // Direct ID
      const match3 = gistUrl.match(/^([a-f0-9]+)$/i);

      gistId = match1?.[1] || match2?.[1] || match3?.[1];

      if (!gistId) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid Gist URL. Expected format: https://gist.github.com/username/gist-id",
        });
      }

      console.log("🔍 Fetching Gist ID:", gistId);

      // Fetch Gist data from GitHub API
      const gistResponse = await axios.get(
        `https://api.github.com/gists/${gistId}`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "CodeTogether-App",
            // Token is optional for public gists, but helps with rate limits
            ...(process.env.GITHUB_ACCESS_TOKEN && {
              Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            }),
          },
        },
      );

      const gistData = gistResponse.data;
      const files = {};

      // Extract file contents (skip metadata files)
      Object.entries(gistData.files).forEach(([fileName, fileData]) => {
        if (!fileName.startsWith("_codetogether_")) {
          files[fileName] = fileData.content;
        }
      });

      console.log("✅ Imported", Object.keys(files).length, "files from Gist");

      res.json({
        success: true,
        files,
        description: gistData.description,
        filesCount: Object.keys(files).length,
      });
    } catch (error) {
      console.error("❌ Import from Gist error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to import Gist",
      });
    }
  });

  console.log("✅ GitHub Gist routes registered (Personal Token mode)");
  console.log(
    "🔑 Token status:",
    process.env.GITHUB_ACCESS_TOKEN ? "✅ Configured" : "❌ Missing",
  );
}

module.exports = { setupGistRoutes };
