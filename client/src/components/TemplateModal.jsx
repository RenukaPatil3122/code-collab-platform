// src/components/TemplateModal.jsx
import React, { useState, useMemo } from "react";
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

function TemplateModal({ language, onSelectTemplate, onClose }) {
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
        {/* ── Header ── */}
        <div className="tm-header">
          <div className="tm-header-left">
            <Code2 size={22} />
            <h2>Code Templates</h2>
            <span className="tm-lang-badge">
              {LANGUAGE_LABELS[language] || language}
            </span>
          </div>
          <button className="tm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="tm-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <span className="tm-count">{filtered.length}</span>
        </div>

        {/* ── Category chips ── */}
        <div className="tm-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`tm-chip ${activeCategory === cat ? "active" : ""}`}
              style={
                activeCategory === cat && cat !== "All"
                  ? {
                      background: CATEGORY_COLORS[cat] + "22",
                      borderColor: CATEGORY_COLORS[cat],
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

        {/* ── Body: list + preview ── */}
        <div className="tm-body">
          {/* List */}
          <div className="tm-list">
            {filtered.length === 0 ? (
              <div className="tm-empty">
                <FileCode size={40} />
                <p>No templates match "{searchTerm}"</p>
              </div>
            ) : (
              filtered.map(([name, t]) => {
                const isActive = displayedPreview?.name === name;
                return (
                  <button
                    key={name}
                    className={`tm-item ${isActive ? "selected" : ""}`}
                    onClick={() => setPreview({ name, ...t })}
                  >
                    <div className="tm-item-inner">
                      <div className="tm-item-top">
                        <FileCode size={16} />
                        <span className="tm-item-name">{name}</span>
                      </div>
                      <p className="tm-item-desc">{t.description}</p>
                      <span
                        className="tm-item-cat"
                        style={{ color: CATEGORY_COLORS[t.category] }}
                      >
                        {t.category}
                      </span>
                    </div>
                    <ChevronRight size={14} className="tm-item-arrow" />
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
                          "#667eea") + "22",
                      color:
                        CATEGORY_COLORS[displayedPreview.category] || "#667eea",
                    }}
                  >
                    {displayedPreview.category}
                  </span>
                </div>
                <pre className="tm-preview-code">
                  <code>{displayedPreview.code}</code>
                </pre>
                <button
                  className="tm-use-btn"
                  onClick={() => handleSelect(displayedPreview.code)}
                >
                  Use Template
                </button>
              </>
            ) : (
              <div className="tm-preview-empty">
                <Code2 size={40} />
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
