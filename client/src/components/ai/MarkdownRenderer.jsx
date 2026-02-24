// src/components/ai/MarkdownRenderer.jsx
// Zero-dependency, no dangerouslySetInnerHTML - pure React token rendering

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import "./MarkdownRenderer.css";

/* ─── Syntax token definitions ────────────────────────── */
const JS_KEYWORDS =
  /^(const|let|var|function|return|if|else|for|while|class|import|export|default|from|async|await|new|this|typeof|instanceof|try|catch|finally|throw|switch|case|break|continue|of|in|do)\b/;
const PY_KEYWORDS =
  /^(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|is|with|as|try|except|finally|raise|lambda|pass|break|continue|yield|global|nonlocal)\b/;
const GENERIC_KEYWORDS =
  /^(int|float|double|string|boolean|bool|void|public|private|protected|static|final|extends|implements|new|return|if|else|for|while|namespace|using|var|fn|func|fun|let|const|class|interface|package)\b/;
const LITERALS =
  /^(true|false|null|undefined|nil|NULL|None|True|False|NaN|Infinity)\b/;
const TYPES = /^[A-Z][a-zA-Z0-9]*/;
const FUNC_CALL = /^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/;
const STRING_DQ = /^"(?:[^"\\]|\\.)*"/;
const STRING_SQ = /^'(?:[^'\\]|\\.)*'/;
const STRING_BT = /^`(?:[^`\\]|\\.)*`/;
const NUMBER = /^\b\d+\.?\d*\b/;
const COMMENT_LINE = /^\/\/.*/;
const COMMENT_PY = /^#.*/;
const COMMENT_ML = /^\/\*[\s\S]*?\*\//;
const OPERATOR = /^(=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~?:])/;
const PUNCTUATION = /^[{}[\]();,.]/;

function tokenizeLine(line, lang) {
  const isJS = ["javascript", "js", "jsx", "ts", "tsx", "typescript"].includes(
    lang,
  );
  const isPY = ["python", "py"].includes(lang);
  const tokens = [];
  let src = line;

  while (src.length > 0) {
    let m;

    // Comments first
    if (isJS && (m = src.match(COMMENT_LINE))) {
      tokens.push({ type: "comment", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if (isPY && (m = src.match(COMMENT_PY))) {
      tokens.push({ type: "comment", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if ((m = src.match(COMMENT_ML))) {
      tokens.push({ type: "comment", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }

    // Strings
    if ((m = src.match(STRING_BT))) {
      tokens.push({ type: "string", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if ((m = src.match(STRING_DQ))) {
      tokens.push({ type: "string", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if ((m = src.match(STRING_SQ))) {
      tokens.push({ type: "string", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }

    // Numbers
    if ((m = src.match(NUMBER))) {
      tokens.push({ type: "number", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }

    // Keywords & identifiers
    if (isJS && (m = src.match(JS_KEYWORDS))) {
      tokens.push({ type: "keyword", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if (isPY && (m = src.match(PY_KEYWORDS))) {
      tokens.push({ type: "keyword", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if (!isJS && !isPY && (m = src.match(GENERIC_KEYWORDS))) {
      tokens.push({ type: "keyword", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if ((m = src.match(LITERALS))) {
      tokens.push({ type: "literal", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if ((m = src.match(FUNC_CALL))) {
      tokens.push({ type: "func", value: m[1] });
      src = src.slice(m[1].length);
      continue;
    }
    if ((m = src.match(TYPES))) {
      tokens.push({ type: "type", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }

    // Operators & punctuation
    if ((m = src.match(OPERATOR))) {
      tokens.push({ type: "operator", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }
    if ((m = src.match(PUNCTUATION))) {
      tokens.push({ type: "punctuation", value: m[0] });
      src = src.slice(m[0].length);
      continue;
    }

    // Whitespace / plain text — consume char by char
    const plain = src[0];
    if (tokens.length && tokens[tokens.length - 1].type === "plain") {
      tokens[tokens.length - 1].value += plain;
    } else {
      tokens.push({ type: "plain", value: plain });
    }
    src = src.slice(1);
  }

  return tokens;
}

const TOKEN_COLORS = {
  keyword: "#c792ea",
  string: "#c3e88d",
  number: "#f78c6c",
  literal: "#f78c6c",
  comment: "#546e7a",
  type: "#82aaff",
  func: "#82aaff",
  operator: "#89ddff",
  punctuation: "#89ddff",
  plain: "#c9d1d9",
};

function CodeLine({ lineNum, content, lang }) {
  const tokens = tokenizeLine(content, lang);
  return (
    <div className="md-code-line">
      <span className="md-line-num">{lineNum}</span>
      <span className="md-line-content">
        {tokens.map((tok, i) => (
          <span
            key={i}
            style={{
              color: TOKEN_COLORS[tok.type] || "#c9d1d9",
              fontStyle: tok.type === "comment" ? "italic" : "normal",
              fontWeight: tok.type === "keyword" ? 600 : "normal",
            }}
          >
            {tok.value}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ─── Code block ──────────────────────────────────────── */
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  // Remove trailing empty line if present
  if (lines[lines.length - 1] === "") lines.pop();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || "code"}</span>
        <button
          className={`md-code-copy${copied ? " copied" : ""}`}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check size={10} /> Copied
            </>
          ) : (
            <>
              <Copy size={10} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="md-code-pre">
        <code>
          {lines.map((line, i) => (
            <CodeLine key={i} lineNum={i + 1} content={line} lang={lang} />
          ))}
        </code>
      </pre>
    </div>
  );
}

/* ─── Inline markdown parser ──────────────────────────── */
function Inline({ text }) {
  // Split on bold (**), italic (*), inline code (`), strikethrough (~~)
  const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <strong key={i} className="md-bold">
              {part.slice(2, -2)}
            </strong>
          );
        if (part.startsWith("~~") && part.endsWith("~~"))
          return (
            <del key={i} className="md-strike">
              {part.slice(2, -2)}
            </del>
          );
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return (
            <em key={i} className="md-italic">
              {part.slice(1, -1)}
            </em>
          );
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="md-inline-code">
              {part.slice(1, -1)}
            </code>
          );
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/* ─── Block parser ────────────────────────────────────── */
function parseBlocks(md) {
  const blocks = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const lang = fence[1].toLowerCase();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      i++;
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const qLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", text: qLines.join(" ") });
      continue;
    }

    // Unordered list
    if (/^[-*+] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(```|#{1,3} |> |[-*+] |\d+\. |-{3,}|\*{3,})/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) blocks.push({ type: "p", text: paraLines.join(" ") });
  }

  return blocks;
}

/* ─── Main renderer ───────────────────────────────────── */
export default function MarkdownRenderer({ content }) {
  if (!content) return null;
  const blocks = parseBlocks(content);

  return (
    <div className="md-root">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h2 key={idx} className="md-h1">
                <Inline text={block.text} />
              </h2>
            );
          case "h2":
            return (
              <h3 key={idx} className="md-h2">
                <Inline text={block.text} />
              </h3>
            );
          case "h3":
            return (
              <p key={idx} className="md-h3">
                <Inline text={block.text} />
              </p>
            );
          case "hr":
            return <hr key={idx} className="md-hr" />;
          case "code":
            return <CodeBlock key={idx} lang={block.lang} code={block.code} />;
          case "blockquote":
            return (
              <blockquote key={idx} className="md-blockquote">
                <Inline text={block.text} />
              </blockquote>
            );
          case "ul":
            return (
              <ul key={idx} className="md-ul">
                {block.items.map((item, ii) => (
                  <li key={ii} className="md-li md-li-ul">
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="md-ol">
                {block.items.map((item, ii) => (
                  <li key={ii} className="md-li md-li-ol">
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={idx} className="md-p">
                <Inline text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
