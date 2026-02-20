// server/executors/multiFileExecutor.js
const axios = require("axios");

function getJudge0LangId(language) {
  const map = {
    javascript: 93,
    python: 100,
    java: 91,
    cpp: 105,
    c: 103,
    go: 106,
    rust: 108,
    typescript: 101,
    ruby: 72,
    php: 98,
    swift: 83,
    kotlin: 78,
    csharp: 51,
  };
  return map[language] || 93;
}

async function executeWithJudge0(language, code, stdin = "") {
  try {
    const response = await axios.post(
      "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
      {
        language_id: getJudge0LangId(language),
        source_code: code,
        stdin,
      },
      {
        headers: { "content-type": "application/json" },
        timeout: 15000,
      },
    );

    const output = response.data.stdout || "";
    const error =
      response.data.stderr ||
      response.data.compile_output ||
      response.data.message ||
      "";

    // ✅ Judge0 returns time as "0.045" (seconds) and memory in KB
    const executionTime = response.data.time
      ? Math.round(parseFloat(response.data.time) * 1000)
      : null;
    const memoryUsed = response.data.memory || null; // KB

    return { output, error, executionTime, memoryUsed };
  } catch (err) {
    return {
      output: "",
      error: `Execution failed: ${err.message}`,
      executionTime: null,
      memoryUsed: null,
    };
  }
}

function detectEntryPoint(files, language) {
  const fileNames = Object.keys(files);
  const mainFile = fileNames.find(
    (name) => name.startsWith("main.") || name === "main",
  );
  if (mainFile) return mainFile;
  const indexFile = fileNames.find(
    (name) => name.startsWith("index.") || name === "index",
  );
  if (indexFile) return indexFile;
  if (language === "java") {
    const javaMain = fileNames.find((name) => {
      const content = files[name]?.content || "";
      return content.includes("public static void main");
    });
    if (javaMain) return javaMain;
  }
  if (language === "python") {
    const pythonMain = fileNames.find((name) => {
      const content = files[name]?.content || "";
      return content.includes('if __name__ == "__main__"');
    });
    if (pythonMain) return pythonMain;
  }
  return fileNames.sort()[0];
}

function bundleJavaScript(files, entryPoint) {
  const modules = {};
  Object.entries(files).forEach(([fileName, file]) => {
    let content = file.content;
    const exports = {};
    const functionRegex = /export\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      const params = match[2];
      let braceCount = 1;
      let startIdx = match.index + match[0].length;
      let endIdx = startIdx;
      while (braceCount > 0 && endIdx < content.length) {
        if (content[endIdx] === "{") braceCount++;
        if (content[endIdx] === "}") braceCount--;
        endIdx++;
      }
      const funcBody = content.substring(startIdx, endIdx - 1);
      exports[funcName] = `function ${funcName}(${params}) {${funcBody}}`;
    }
    const constRegex = /export\s+const\s+(\w+)\s*=\s*([^;]+);/g;
    while ((match = constRegex.exec(content)) !== null) {
      exports[match[1]] = `const ${match[1]} = ${match[2]};`;
    }
    modules[fileName] = { content, exports };
  });

  let bundled = "";
  const processed = new Set();
  function inlineDependencies(fileName) {
    if (processed.has(fileName)) return;
    processed.add(fileName);
    const module = modules[fileName];
    if (!module) return;
    let content = module.content;
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"]/g;
    let match;
    const imports = [];
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        importedItems: match[1].split(",").map((i) => i.trim()),
        sourceFile: match[2],
        fullMatch: match[0],
      });
    }
    imports.forEach(({ sourceFile }) => inlineDependencies(sourceFile));
    imports.forEach(({ importedItems, sourceFile, fullMatch }) => {
      const sourceModule = modules[sourceFile];
      if (sourceModule) {
        let replacement = "";
        importedItems.forEach((item) => {
          if (sourceModule.exports[item])
            replacement += sourceModule.exports[item] + "\n";
        });
        content = content.replace(fullMatch, replacement);
      }
    });
    content = content.replace(/export\s+/g, "");
    bundled += `\n// ═══ ${fileName} ═══\n${content}\n`;
  }
  inlineDependencies(entryPoint);
  return bundled;
}

function bundlePython(files, entryPoint) {
  let bundled = "";
  const processed = new Set();
  function processFile(fileName) {
    if (processed.has(fileName)) return;
    processed.add(fileName);
    const file = files[fileName];
    if (!file) return;
    let content = file.content;
    const importRegex = /from\s+\.(\w+)\s+import\s+([^\n]+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const moduleFile = `${match[1]}.py`;
      if (files[moduleFile]) processFile(moduleFile);
    }
    content = content.replace(/from\s+\.\w+\s+import\s+[^\n]+\n?/g, "");
    bundled += `\n# ═══ ${fileName} ═══\n${content}\n`;
  }
  Object.keys(files).forEach((f) => {
    if (f !== entryPoint) processFile(f);
  });
  processFile(entryPoint);
  return bundled;
}

function bundleJava(files, entryPoint) {
  const bundled = [];
  const entryFile = files[entryPoint];
  const packageMatch = entryFile?.content.match(/package\s+([\w.]+);/);
  if (packageMatch) bundled.push(`package ${packageMatch[1]};\n`);
  const allImports = new Set();
  Object.values(files).forEach((file) => {
    for (const match of file.content.matchAll(/import\s+([\w.*]+);/g)) {
      allImports.add(match[0]);
    }
  });
  bundled.push([...allImports].join("\n"), "\n");
  Object.entries(files).forEach(([fileName, file]) => {
    let content = file.content
      .replace(/package\s+[\w.]+;/g, "")
      .replace(/import\s+[\w.*]+;/g, "");
    bundled.push(`\n// ═══ ${fileName} ═══\n${content.trim()}\n`);
  });
  return bundled.join("\n");
}

function bundleCpp(files, entryPoint) {
  const headers = [];
  const implementations = [];
  Object.entries(files).forEach(([fileName, file]) => {
    if (fileName.endsWith(".h") || fileName.endsWith(".hpp")) {
      headers.push(`\n// ═══ ${fileName} ═══\n${file.content}\n`);
    } else {
      const content = file.content.replace(/#include\s+"[^"]+"/g, "");
      implementations.push(`\n// ═══ ${fileName} ═══\n${content}\n`);
    }
  });
  return [...headers, ...implementations].join("\n");
}

async function executeMultiFile(
  files,
  language,
  stdin = "",
  activeFile = null,
) {
  try {
    if (Object.keys(files).length === 1) {
      const singleFile = Object.values(files)[0];
      return await executeWithJudge0(language, singleFile.content, stdin);
    }
    const entryPoint =
      activeFile && files[activeFile]
        ? activeFile
        : detectEntryPoint(files, language);
    console.log(
      `📦 Bundling ${Object.keys(files).length} files, entry: ${entryPoint}`,
    );

    let bundledCode = "";
    switch (language) {
      case "javascript":
      case "typescript":
        bundledCode = bundleJavaScript(files, entryPoint);
        break;
      case "python":
        bundledCode = bundlePython(files, entryPoint);
        break;
      case "java":
        bundledCode = bundleJava(files, entryPoint);
        break;
      case "cpp":
      case "c":
        bundledCode = bundleCpp(files, entryPoint);
        break;
      default:
        bundledCode = Object.entries(files)
          .map(([name, file]) => `\n// ${name}\n${file.content}`)
          .join("\n");
    }

    return await executeWithJudge0(language, bundledCode, stdin);
  } catch (error) {
    console.error("❌ Multi-file execution error:", error);
    return {
      output: "",
      error: `Multi-file execution failed: ${error.message}`,
      executionTime: null,
      memoryUsed: null,
    };
  }
}

module.exports = { executeMultiFile, detectEntryPoint };
