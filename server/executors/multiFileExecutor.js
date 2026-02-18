// server/executors/multiFileExecutor.js
// Simplified multi-file executor optimized for Judge0

const axios = require("axios");

// Judge0 language IDs
function getJudge0LangId(language) {
  const map = {
    javascript: 93, // Node.js 18 (supports ES6 modules with .mjs)
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

// Execute code with Judge0
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

    return { output, error };
  } catch (err) {
    return {
      output: "",
      error: `Execution failed: ${err.message}`,
    };
  }
}

/**
 * Detect entry point file from files object
 */
function detectEntryPoint(files, language) {
  const fileNames = Object.keys(files);

  // 1. Look for main.*
  const mainFile = fileNames.find(
    (name) => name.startsWith("main.") || name === "main",
  );
  if (mainFile) return mainFile;

  // 2. Look for index.*
  const indexFile = fileNames.find(
    (name) => name.startsWith("index.") || name === "index",
  );
  if (indexFile) return indexFile;

  // 3. Language-specific
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

  // 4. First file alphabetically
  return fileNames.sort()[0];
}

/**
 * Bundle JavaScript files - Simple approach for Judge0
 * Converts ES6 imports to inline code
 */
function bundleJavaScript(files, entryPoint) {
  const modules = {};

  // Step 1: Process each file and extract exports
  Object.entries(files).forEach(([fileName, file]) => {
    let content = file.content;
    const exports = {};

    // Extract exported functions
    const functionRegex = /export\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      const params = match[2];

      // Find the function body
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

    // Extract exported constants
    const constRegex = /export\s+const\s+(\w+)\s*=\s*([^;]+);/g;
    while ((match = constRegex.exec(content)) !== null) {
      const varName = match[1];
      const value = match[2];
      exports[varName] = `const ${varName} = ${value};`;
    }

    modules[fileName] = { content, exports };
  });

  // Step 2: Build the entry file with inline dependencies
  let bundled = "";
  const processed = new Set();

  function inlineDependencies(fileName) {
    if (processed.has(fileName)) return;
    processed.add(fileName);

    const module = modules[fileName];
    if (!module) return;

    let content = module.content;

    // Find all imports
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"]/g;
    let match;
    const imports = [];

    while ((match = importRegex.exec(content)) !== null) {
      const importedItems = match[1].split(",").map((i) => i.trim());
      const sourceFile = match[2];

      imports.push({ importedItems, sourceFile, fullMatch: match[0] });
    }

    // Inline dependencies first
    imports.forEach(({ sourceFile }) => {
      inlineDependencies(sourceFile);
    });

    // Replace imports with actual code
    imports.forEach(({ importedItems, sourceFile, fullMatch }) => {
      const sourceModule = modules[sourceFile];
      if (sourceModule) {
        let replacement = "";
        importedItems.forEach((item) => {
          if (sourceModule.exports[item]) {
            replacement += sourceModule.exports[item] + "\n";
          }
        });
        content = content.replace(fullMatch, replacement);
      }
    });

    // Remove export keywords
    content = content.replace(/export\s+/g, "");

    bundled += `\n// ═══ ${fileName} ═══\n${content}\n`;
  }

  inlineDependencies(entryPoint);

  return bundled;
}

/**
 * Bundle Python files
 */
function bundlePython(files, entryPoint) {
  let bundled = "";
  const processed = new Set();

  function processFile(fileName) {
    if (processed.has(fileName)) return;
    processed.add(fileName);

    const file = files[fileName];
    if (!file) return;

    let content = file.content;

    // Find relative imports
    const importRegex = /from\s+\.(\w+)\s+import\s+([^\n]+)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const moduleName = match[1];
      const moduleFile = `${moduleName}.py`;

      if (files[moduleFile]) {
        // Process dependency first
        processFile(moduleFile);
      }
    }

    // Remove relative import statements (functions are now bundled)
    content = content.replace(/from\s+\.\w+\s+import\s+[^\n]+\n?/g, "");

    bundled += `\n# ═══ ${fileName} ═══\n${content}\n`;
  }

  // Process all dependencies first
  Object.keys(files).forEach((fileName) => {
    if (fileName !== entryPoint) {
      processFile(fileName);
    }
  });

  // Then process entry point
  processFile(entryPoint);

  return bundled;
}

/**
 * Bundle Java files
 */
function bundleJava(files, entryPoint) {
  const bundled = [];

  // Extract package name from entry point
  const entryFile = files[entryPoint];
  const packageMatch = entryFile?.content.match(/package\s+([\w.]+);/);
  const packageName = packageMatch ? packageMatch[1] : "";

  // Add package declaration once
  if (packageName) {
    bundled.push(`package ${packageName};\n`);
  }

  // Collect all imports
  const allImports = new Set();
  Object.values(files).forEach((file) => {
    const importMatches = file.content.matchAll(/import\s+([\w.*]+);/g);
    for (const match of importMatches) {
      allImports.add(match[0]);
    }
  });

  bundled.push([...allImports].join("\n"));
  bundled.push("\n");

  // Add all classes (remove package and import statements)
  Object.entries(files).forEach(([fileName, file]) => {
    let content = file.content;

    // Remove package and imports
    content = content.replace(/package\s+[\w.]+;/g, "");
    content = content.replace(/import\s+[\w.*]+;/g, "");

    bundled.push(`\n// ═══ ${fileName} ═══\n${content.trim()}\n`);
  });

  return bundled.join("\n");
}

/**
 * Bundle C/C++ files
 */
function bundleCpp(files, entryPoint) {
  const headers = [];
  const implementations = [];

  Object.entries(files).forEach(([fileName, file]) => {
    if (fileName.endsWith(".h") || fileName.endsWith(".hpp")) {
      headers.push(`\n// ═══ ${fileName} ═══\n${file.content}\n`);
    } else {
      // Remove #include "local.h" statements
      let content = file.content.replace(/#include\s+"[^"]+"/g, "");
      implementations.push(`\n// ═══ ${fileName} ═══\n${content}\n`);
    }
  });

  return [...headers, ...implementations].join("\n");
}

/**
 * Main multi-file executor
 */
async function executeMultiFile(
  files,
  language,
  stdin = "",
  activeFile = null,
) {
  try {
    // Single file mode
    if (Object.keys(files).length === 1) {
      const singleFile = Object.values(files)[0];
      return await executeWithJudge0(language, singleFile.content, stdin);
    }

    // Detect entry point
    const entryPoint =
      activeFile && files[activeFile]
        ? activeFile
        : detectEntryPoint(files, language);

    console.log(
      `📦 Bundling ${Object.keys(files).length} files, entry: ${entryPoint}`,
    );

    // Bundle files based on language
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
        // For other languages, just concatenate all files
        bundledCode = Object.entries(files)
          .map(([name, file]) => `\n// ${name}\n${file.content}`)
          .join("\n");
    }

    console.log(`✅ Bundled code: ${bundledCode.length} chars`);

    // Execute bundled code
    return await executeWithJudge0(language, bundledCode, stdin);
  } catch (error) {
    console.error("❌ Multi-file execution error:", error);
    return {
      output: "",
      error: `Multi-file execution failed: ${error.message}`,
    };
  }
}

module.exports = {
  executeMultiFile,
  detectEntryPoint,
};
