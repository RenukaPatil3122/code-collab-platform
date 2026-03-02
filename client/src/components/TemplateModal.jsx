// src/components/TemplateModal.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Search,
  Code2,
  FileCode,
  ChevronRight,
  Crown,
  Lock,
} from "lucide-react";
import {
  getTemplatesForLanguage,
  getCategoriesForLanguage,
} from "../utils/codeTemplates";
import { useAuth } from "../contexts/AuthContext";
import PricingModal from "./PricingModal";
import "./TemplateModal.css";

const FREE_CATEGORIES = ["Basics", "DSA"];
const PRO_CATEGORIES = ["Sorting", "Searching", "Patterns"];

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

function useHighlightJS() {
  useEffect(() => {
    if (window.__hljsLoaded) return;
    window.__hljsLoaded = true;
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
    document.head.appendChild(style);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
}

function HighlightedCode({ code, language }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const try_ = () => {
      if (window.hljs) {
        ref.current.removeAttribute("data-highlighted");
        window.hljs.highlightElement(ref.current);
      } else setTimeout(try_, 80);
    };
    try_();
  }, [code, language]);
  return (
    <pre className="tm-preview-code">
      <code
        ref={ref}
        className={`language-${HLJ_LANG[language] || "plaintext"}`}
      >
        {code}
      </code>
    </pre>
  );
}

function TemplateModal({ language, onSelectTemplate, onClose }) {
  useHighlightJS();
  const { isPremium } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setCategory] = useState("All");
  const [preview, setPreview] = useState(null);
  const [showPricing, setShowPricing] = useState(false);

  const templates = getTemplatesForLanguage(language);
  const categories = getCategoriesForLanguage(language);

  const isProCat = (cat) => PRO_CATEGORIES.includes(cat);
  const isLocked = (cat) => isProCat(cat) && !isPremium;

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

  const handleCategoryClick = (cat) => {
    setCategory(cat);
  };

  const handleSelect = (code, category) => {
    if (isProCat(category) && !isPremium) {
      setShowPricing(true);
      return;
    }
    onSelectTemplate(code, language);
    onClose();
  };

  const displayedPreview =
    preview ||
    (filtered[0] ? { name: filtered[0][0], ...filtered[0][1] } : null);

  return (
    <>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!isPremium && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.35)",
                    fontWeight: 500,
                  }}
                >
                  <Lock size={11} /> Sorting/Searching/Patterns = Pro
                </span>
              )}
              {isPremium && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    color: "#fbbf24",
                    fontWeight: 600,
                  }}
                >
                  <Crown size={11} /> All templates unlocked
                </span>
              )}
              <button className="tm-close" onClick={onClose}>
                <X size={15} />
              </button>
            </div>
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
            {categories.map((cat) => {
              const locked = isLocked(cat);
              return (
                <button
                  key={cat}
                  className={`tm-chip ${activeCategory === cat ? "active" : ""}`}
                  style={
                    activeCategory === cat && cat !== "All"
                      ? {
                          background:
                            (CATEGORY_COLORS[cat] || "#6366f1") + "20",
                          borderColor:
                            (CATEGORY_COLORS[cat] || "#6366f1") + "99",
                          color: CATEGORY_COLORS[cat] || "#6366f1",
                        }
                      : locked
                        ? { opacity: 0.55 }
                        : {}
                  }
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat !== "All" && (
                    <span
                      className="tm-chip-dot"
                      style={{ background: CATEGORY_COLORS[cat] }}
                    />
                  )}
                  {cat}
                  {locked && <Lock size={10} style={{ marginLeft: 4 }} />}
                </button>
              );
            })}
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
                  const locked = isProCat(t.category) && !isPremium;
                  return (
                    <button
                      key={name}
                      className={`tm-item ${isActive ? "selected" : ""}`}
                      onClick={() => setPreview({ name, ...t })}
                      style={locked ? { opacity: 0.65 } : {}}
                    >
                      <div className="tm-item-inner">
                        <span className="tm-item-name">
                          {locked && (
                            <Lock
                              size={11}
                              style={{ marginRight: 5, color: "#f59e0b" }}
                            />
                          )}
                          {name}
                        </span>
                        <span
                          className="tm-item-cat"
                          style={{ color: catColor }}
                        >
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

                  <HighlightedCode
                    key={displayedPreview.name}
                    code={displayedPreview.code}
                    language={language}
                  />

                  {isProCat(displayedPreview.category) && !isPremium ? (
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "0.83rem",
                        color: "#fbbf24",
                      }}
                    >
                      <Crown size={14} />
                      Upgrade to Pro to use this template
                      <button
                        onClick={() => setShowPricing(true)}
                        style={{
                          marginLeft: "auto",
                          background: "linear-gradient(135deg,#f59e0b,#f97316)",
                          border: "none",
                          borderRadius: 7,
                          color: "white",
                          padding: "5px 12px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Upgrade
                      </button>
                    </div>
                  ) : (
                    <button
                      className="tm-use-btn"
                      onClick={() =>
                        handleSelect(
                          displayedPreview.code,
                          displayedPreview.category,
                        )
                      }
                    >
                      Use Template
                    </button>
                  )}
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

      {/* PricingModal renders OUTSIDE tm-overlay so it's not blocked */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>
  );
}

export default TemplateModal;
