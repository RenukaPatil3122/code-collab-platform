// src/index.js - ULTIMATE BULLETPROOF VERSION

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// ========================================
// ULTIMATE RESIZEOBSERVER ERROR KILLER
// ========================================

// Store original functions
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// 1. Kill error events IMMEDIATELY
const errorHandler = (event) => {
  const message = event.message || event.reason?.message || "";
  if (
    message.includes("ResizeObserver") ||
    message.includes("resize observer")
  ) {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
};

// 2. Kill unhandled promise rejections
const rejectionHandler = (event) => {
  const message = event.reason?.message || String(event.reason) || "";
  if (
    message.includes("ResizeObserver") ||
    message.includes("resize observer")
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
};

// Apply event listeners
window.addEventListener("error", errorHandler, true);
window.addEventListener("unhandledrejection", rejectionHandler, true);

// 3. Override console methods
console.error = function (...args) {
  const message = String(args[0] || "");
  if (
    message.includes("ResizeObserver") ||
    message.includes("resize observer") ||
    message.includes("ResizeObserver loop")
  ) {
    return; // Silently ignore
  }
  originalConsoleError.apply(console, args);
};

console.warn = function (...args) {
  const message = String(args[0] || "");
  if (
    message.includes("ResizeObserver") ||
    message.includes("resize observer")
  ) {
    return; // Silently ignore
  }
  originalConsoleWarn.apply(console, args);
};

// 4. Monkey-patch window.onerror
const originalOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
  if (
    String(message).includes("ResizeObserver") ||
    String(message).includes("resize observer")
  ) {
    return true; // Suppress
  }
  if (originalOnError) {
    return originalOnError(message, source, lineno, colno, error);
  }
  return false;
};

// 5. Create a ResizeObserver wrapper to prevent errors
if (typeof window.ResizeObserver !== "undefined") {
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (e) {
            if (!String(e).includes("ResizeObserver")) {
              throw e;
            }
          }
        });
      });
    }
  };
}

// ========================================
// RENDER APP
// ========================================

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
