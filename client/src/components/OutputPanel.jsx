// src/components/OutputPanel.jsx

import React, { useState, useMemo } from "react";
import { useRoom } from "../contexts/RoomContext";
import { useFiles } from "../contexts/FileContext";
import { X, Terminal, Keyboard, Minimize2, Maximize2 } from "lucide-react";
import "./OutputPanel.css";

function OutputPanel({ output, onClose }) {
  const { stdin, setStdin, language } = useRoom();
  const { files } = useFiles();
  const [isMinimized, setIsMinimized] = useState(false);

  // ✅ Smart detection: Does the code need input?
  const needsInput = useMemo(() => {
    // Get all file contents
    const allCode = Object.values(files)
      .map((file) => file.content)
      .join("\n");

    // Language-specific input detection
    switch (language) {
      case "javascript":
      case "typescript":
        // Check for readline, prompt, or stdin usage
        return /readline|prompt|process\.stdin|Scanner|BufferedReader/.test(
          allCode,
        );

      case "python":
        // Check for input() function
        return /input\(/.test(allCode);

      case "java":
        // Check for Scanner or BufferedReader
        return /Scanner|BufferedReader|System\.in/.test(allCode);

      case "cpp":
      case "c":
        // Check for cin or scanf
        return /cin\s*>>|scanf|getchar|getline/.test(allCode);

      case "go":
        // Check for fmt.Scan
        return /fmt\.Scan|bufio\.NewReader/.test(allCode);

      case "rust":
        // Check for stdin
        return /stdin\(\)|read_line/.test(allCode);

      case "ruby":
        // Check for gets
        return /gets|STDIN/.test(allCode);

      case "php":
        // Check for fgets or readline
        return /fgets|readline|STDIN/.test(allCode);

      default:
        // For unknown languages, check for common input patterns
        return /input|scan|read|stdin/i.test(allCode);
    }
  }, [files, language]);

  if (isMinimized) {
    return (
      <div className="output-panel-minimized">
        <div className="output-minimized-header">
          <div className="output-title">
            <Terminal size={16} />
            <span>Output</span>
          </div>
          <div className="output-controls">
            <button
              className="control-btn"
              onClick={() => setIsMinimized(false)}
              title="Maximize"
            >
              <Maximize2 size={16} />
            </button>
            <button className="control-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="output-panel-container">
      {/* Header */}
      <div className="output-header">
        <div className="output-title">
          <Terminal size={16} />
          <span>Output</span>
        </div>
        <div className="output-controls">
          <button
            className="control-btn"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button className="control-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ✅ Stdin Section - Only show if code needs input */}
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
            💡 Tip: Each line will be read by your program's input function
          </div>
        </div>
      )}

      {/* Output Content */}
      <div className="output-content-wrapper">
        <div className="output-label">Program Output:</div>
        <pre className="output-content">
          {output || "No output yet. Run your code to see results."}
        </pre>
      </div>
    </div>
  );
}

export default OutputPanel;
