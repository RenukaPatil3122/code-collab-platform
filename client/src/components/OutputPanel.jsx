// src/components/OutputPanel.jsx
import React, { useMemo } from "react";
import { useRoom } from "../contexts/RoomContext";
import { useFiles } from "../contexts/FileContext";
import {
  X,
  Terminal,
  Keyboard,
  Minimize2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Ban,
} from "lucide-react";
import "./OutputPanel.css";

function cleanErrorText(raw) {
  const lines = raw.split("\n");
  const cleaned = lines.filter((line) => {
    if (/node:internal|node:modules|at node:/.test(line)) return false;
    if (
      /at wrapSafe|at Module\._compile|at Module\.load|at Module\._load|at Function\.executeUserEntryPoint|at Object\.<anonymous>/.test(
        line,
      )
    )
      return false;
    return true;
  });
  while (cleaned.length && !cleaned[cleaned.length - 1].trim()) cleaned.pop();
  return cleaned.join("\n").trim();
}

function parseOutput(output) {
  if (!output) return { type: "idle", text: "" };
  if (output === "Running...") return { type: "running", text: "Running..." };
  if (output === "Cancelled")
    return { type: "cancelled", text: "Execution cancelled." };
  if (output === "Code executed successfully (no output)")
    return { type: "success-empty", text: output };

  // Framework project message — show as warning, not hard error
  if (output.startsWith("Error:\n")) {
    const errorText = output.replace("Error:\n", "");
    if (errorText.includes("⚠️  Framework project detected"))
      return { type: "warning", text: errorText };
    if (/timeout|time limit/i.test(errorText))
      return { type: "timeout", text: cleanErrorText(errorText) };
    if (
      /compile|syntax|unexpected token|cannot find symbol|unterminated/i.test(
        errorText,
      )
    )
      return { type: "compile-error", text: cleanErrorText(errorText) };
    return { type: "runtime-error", text: cleanErrorText(errorText) };
  }
  return { type: "success", text: output };
}

function OutputPanel({
  output,
  onClose,
  executionTime,
  memoryUsed,
  isMinimized,
  onMinimize,
}) {
  const { stdin, setStdin, language, runCode, cancelExecution, isRunning } =
    useRoom();
  const { files } = useFiles();

  const needsInput = useMemo(() => {
    const allCode = Object.values(files)
      .map((f) => f.content)
      .join("\n");
    switch (language) {
      case "javascript":
      case "typescript":
        return /readline|prompt|process\.stdin/.test(allCode);
      case "python":
        return /input\(/.test(allCode);
      case "java":
        return /Scanner|BufferedReader|System\.in/.test(allCode);
      case "cpp":
      case "c":
        return /cin\s*>>|scanf|getchar|getline/.test(allCode);
      case "go":
        return /fmt\.Scan|bufio\.NewReader/.test(allCode);
      case "rust":
        return /stdin\(\)|read_line/.test(allCode);
      default:
        return /input|scan|read|stdin/i.test(allCode);
    }
  }, [files, language]);

  const parsed = parseOutput(output);

  if (isMinimized) return null;

  const showRunAgain =
    parsed.type !== "running" &&
    parsed.type !== "idle" &&
    output &&
    output !== "Running...";

  return (
    <div className="output-panel-container">
      <div className="output-header">
        <div className="output-title">
          <Terminal size={16} />
          <span>Output</span>
        </div>
        <div className="output-controls">
          {/* Running state */}
          {parsed.type === "running" && (
            <>
              <span className="execution-spinner">
                <span className="spinner-dot" />
                Running...
              </span>
              <button
                className="cancel-btn"
                onClick={cancelExecution}
                title="Cancel"
              >
                <X size={12} /> Cancel
              </button>
            </>
          )}

          {/* Time badge — only after successful execution */}
          {executionTime != null &&
            parsed.type !== "running" &&
            parsed.type !== "cancelled" && (
              <span className="execution-time" key={executionTime}>
                <Clock size={12} />
                {executionTime}ms
                {memoryUsed && (
                  <span className="memory-used">
                    · {(memoryUsed / 1024).toFixed(1)}MB
                  </span>
                )}
              </span>
            )}

          {/* Run Again — only after execution completes (not cancelled) */}
          {showRunAgain && (
            <button
              className="run-again-btn"
              onClick={runCode}
              title="Run Again"
            >
              <RotateCcw size={12} />
              Run Again
            </button>
          )}

          <button className="control-btn" onClick={onMinimize} title="Minimize">
            <Minimize2 size={16} />
          </button>
          <button className="control-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {needsInput && (
        <div className="stdin-section">
          <div className="stdin-label">
            <Keyboard size={14} />
            <span>Input (stdin)</span>
          </div>
          <textarea
            className="stdin-input"
            placeholder="Enter input for your program (one value per line)..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
          />
          <div className="stdin-hint">
            💡 Each line will be read by your program's input function
          </div>
        </div>
      )}

      {/* Scrollable wrapper */}
      <div className="output-content-wrapper">
        {/* Status banners */}
        {parsed.type === "success" && (
          <div className="output-status-banner success">
            <CheckCircle size={14} /> Executed successfully
          </div>
        )}
        {parsed.type === "success-empty" && (
          <div className="output-status-banner success">
            <CheckCircle size={14} /> Executed — no output
          </div>
        )}
        {parsed.type === "compile-error" && (
          <div className="output-status-banner compile-error">
            <AlertCircle size={14} /> Compile Error
          </div>
        )}
        {parsed.type === "runtime-error" && (
          <div className="output-status-banner runtime-error">
            <AlertCircle size={14} /> Runtime Error
          </div>
        )}
        {parsed.type === "timeout" && (
          <div className="output-status-banner timeout">
            <AlertTriangle size={14} /> Execution Timeout
          </div>
        )}
        {parsed.type === "warning" && (
          <div className="output-status-banner warning">
            <AlertTriangle size={14} /> Cannot run in sandbox
          </div>
        )}
        {parsed.type === "cancelled" && (
          <div className="output-status-banner cancelled">
            <Ban size={14} /> Execution cancelled
          </div>
        )}

        {parsed.type !== "idle" && (
          <>
            <div className="output-label">Program Output:</div>
            <pre className={`output-content ${parsed.type}`}>
              {parsed.type === "running"
                ? "Running..."
                : parsed.type === "success-empty"
                  ? "// No output produced"
                  : parsed.type === "cancelled"
                    ? "// Execution was cancelled"
                    : parsed.text ||
                      "No output yet. Run your code to see results."}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;
