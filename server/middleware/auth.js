// server/middleware/auth.js

const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "codetogether-jwt-secret-change-me";

// ─── Verify JWT — blocks request if invalid ───────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Optional auth — attaches user if token exists ────────
// Use this on routes that work for both guests AND logged-in users
function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.userId = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
  } catch {
    req.userId = null;
  }

  next();
}

// ─── Verify Socket.io token ───────────────────────────────
// Call this in io.use() in server.js
function verifySocketToken(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    // Guest — allow but mark as guest
    socket.userId = null;
    socket.userRole = "guest";
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = "authenticated";
    next();
  } catch {
    socket.userId = null;
    socket.userRole = "guest";
    next(); // still allow — just as guest
  }
}

module.exports = { verifyToken, optionalToken, verifySocketToken };
