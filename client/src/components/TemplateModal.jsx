// src/components/TemplateModal.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, Code2, FileCode, ChevronRight } from "lucide-react";
import {
  getTemplatesForLanguage,
  getCategoriesForLanguage,
} from "../utils/codeTemplates";
import "./TemplateModal.css";

const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  go: "Go",
  rust: "Rust",
};

const CATEGORY_COLORS = {
  Basics: "#4ade80",
  DSA: "#60a5fa",
  Sorting: "#f59e0b",
  Searching: "#a78bfa",
  Patterns: "#f87171",
};

// Map our language keys to highlight.js language names
const HLJ_LANG = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rust",
};

// Inject highlight.js once into the document
function useHighlightJS() {
  useEffect(() => {
    if (window.__hljsLoaded) return;
    window.__hljsLoaded = true;

    // CSS theme — we use a custom dark theme that fits the modal perfectly
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
    document.head.appendChild(style);

    // Script
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
}

// Component that renders a highlighted <pre><code> block
function HighlightedCode({ code, language }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    // Wait for hljs to be available (it loads async)
    const tryHighlight = () => {
      if (window.hljs) {
        ref.current.removeAttribute("data-highlighted");
        window.hljs.highlightElement(ref.current);
      } else {
        setTimeout(tryHighlight, 80);
      }
    };
    tryHighlight();
  }, [code, language]);

  const hljsLang = HLJ_LANG[language] || "plaintext";

  return (
    <pre className="tm-preview-code">
      <code ref={ref} className={`language-${hljsLang}`}>
        {code}
      </code>
    </pre>
  );
}

function TemplateModal({ language, onSelectTemplate, onClose }) {
  useHighlightJS();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setCategory] = useState("All");
  const [preview, setPreview] = useState(null);

  const templates = getTemplatesForLanguage(language);
  const categories = getCategoriesForLanguage(language);

  const filtered = useMemo(() => {
    return Object.entries(templates).filter(([name, t]) => {
      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat =
        activeCategory === "All" || t.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [templates, searchTerm, activeCategory]);

  const handleSelect = (code) => {
    onSelectTemplate(code, language);
    onClose();
  };

  const displayedPreview =
    preview ||
    (filtered[0] ? { name: filtered[0][0], ...filtered[0][1] } : null);

  return (
    <div className="tm-overlay" onClick={onClose}>
      <div
        className="tm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="tm-header">
          <div className="tm-header-left">
            <Code2 size={18} />
            <h2>Code Templates</h2>
            <span className="tm-lang-badge">
              {LANGUAGE_LABELS[language] || language}
            </span>
          </div>
          <button className="tm-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="tm-search-bar">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <span className="tm-count">{filtered.length}</span>
        </div>

        {/* Category chips */}
        <div className="tm-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`tm-chip ${activeCategory === cat ? "active" : ""}`}
              style={
                activeCategory === cat && cat !== "All"
                  ? {
                      background: CATEGORY_COLORS[cat] + "20",
                      borderColor: CATEGORY_COLORS[cat] + "99",
                      color: CATEGORY_COLORS[cat],
                    }
                  : {}
              }
              onClick={() => setCategory(cat)}
            >
              {cat !== "All" && (
                <span
                  className="tm-chip-dot"
                  style={{ background: CATEGORY_COLORS[cat] }}
                />
              )}
              {cat}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="tm-body">
          {/* List */}
          <div className="tm-list">
            {filtered.length === 0 ? (
              <div className="tm-empty">
                <FileCode size={36} />
                <p>No templates match "{searchTerm}"</p>
              </div>
            ) : (
              filtered.map(([name, t]) => {
                const isActive = displayedPreview?.name === name;
                const catColor =
                  CATEGORY_COLORS[t.category] || "var(--tm-accent)";
                return (
                  <button
                    key={name}
                    className={`tm-item ${isActive ? "selected" : ""}`}
                    onClick={() => setPreview({ name, ...t })}
                  >
                    <div className="tm-item-inner">
                      <span className="tm-item-name">{name}</span>
                      <span className="tm-item-cat" style={{ color: catColor }}>
                        {t.category}
                      </span>
                    </div>
                    <ChevronRight size={13} className="tm-item-arrow" />
                  </button>
                );
              })
            )}
          </div>

          {/* Preview */}
          <div className="tm-preview">
            {displayedPreview ? (
              <>
                <div className="tm-preview-header">
                  <div>
                    <h3>{displayedPreview.name}</h3>
                    <p>{displayedPreview.description}</p>
                  </div>
                  <span
                    className="tm-preview-cat"
                    style={{
                      background:
                        (CATEGORY_COLORS[displayedPreview.category] ||
                          "#6366f1") + "20",
                      borderColor:
                        (CATEGORY_COLORS[displayedPreview.category] ||
                          "#6366f1") + "66",
                      color:
                        CATEGORY_COLORS[displayedPreview.category] ||
                        "var(--tm-accent)",
                    }}
                  >
                    {displayedPreview.category}
                  </span>
                </div>

                {/* Highlighted code block */}
                <HighlightedCode
                  key={displayedPreview.name}
                  code={displayedPreview.code}
                  language={language}
                />

                <button
                  className="tm-use-btn"
                  onClick={() => handleSelect(displayedPreview.code)}
                >
                  Use Template
                </button>
              </>
            ) : (
              <div className="tm-preview-empty">
                <Code2 size={36} />
                <p>Select a template to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateModal;
