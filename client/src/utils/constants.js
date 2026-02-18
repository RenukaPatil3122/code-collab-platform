// src/utils/constants.js

export const LANGUAGES = [
  { value: "javascript", label: "JavaScript", ext: "js" },
  { value: "python", label: "Python", ext: "py" },
  { value: "java", label: "Java", ext: "java" },
  { value: "cpp", label: "C++", ext: "cpp" },
  { value: "c", label: "C", ext: "c" },
  { value: "csharp", label: "C#", ext: "cs" },
  { value: "go", label: "Go", ext: "go" },
  { value: "rust", label: "Rust", ext: "rs" },
  { value: "typescript", label: "TypeScript", ext: "ts" },
  { value: "ruby", label: "Ruby", ext: "rb" },
  { value: "php", label: "PHP", ext: "php" },
];

export const INTERVIEW_DIFFICULTIES = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export const INTERVIEW_DURATIONS = {
  [INTERVIEW_DIFFICULTIES.EASY]: 15 * 60,
  [INTERVIEW_DIFFICULTIES.MEDIUM]: 30 * 60,
  [INTERVIEW_DIFFICULTIES.HARD]: 45 * 60,
};

export const AI_FEATURES = {
  EXPLAIN: "explain",
  DEBUG: "debug",
  OPTIMIZE: "optimize",
  GENERATE_TESTS: "generate_tests",
  SUGGEST: "suggest",
};

export const VERSION_SAVE_INTERVAL = 60000;

// Helper: get file extension → Monaco language
export const EXT_TO_LANGUAGE = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
};

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  // Room
  JOIN_ROOM: "join-room",
  LEAVE_ROOM: "leave-room",
  ROOM_STATE: "room-state",

  // Users
  USER_JOINED: "user-joined",
  USER_LEFT: "user-left",

  // Code
  CODE_CHANGE: "code-change",
  CODE_UPDATE: "code-update",
  LANGUAGE_CHANGE: "language-change",
  LANGUAGE_UPDATE: "language-update",

  // Execution
  RUN_CODE: "run-code",
  CODE_OUTPUT: "code-output",
  RUN_TEST_CASES: "run-test-cases",
  TEST_RESULTS: "test-results",

  // Test Cases
  UPDATE_TEST_CASES: "update-test-cases",
  TEST_CASES_UPDATED: "test-cases-updated",

  // Chat
  CHAT_MESSAGE: "chat-message",

  // Cursor
  CURSOR_MOVE: "cursor-move",
  CURSOR_UPDATE: "cursor-update",

  // Interview Mode
  START_INTERVIEW: "start-interview",
  INTERVIEW_STARTED: "interview-started",
  END_INTERVIEW: "end-interview",
  INTERVIEW_ENDED: "interview-ended",
  SUBMIT_INTERVIEW: "submit-interview",
  INTERVIEW_RESULTS: "interview-results",

  // Version Control
  SAVE_VERSION: "save-version",
  VERSION_SAVED: "version-saved",
  GET_VERSIONS: "get-versions",
  VERSIONS_LIST: "versions-list",
  RESTORE_VERSION: "restore-version",
  VERSION_RESTORED: "version-restored",

  // AI Assistant
  AI_REQUEST: "ai-request",
  AI_RESPONSE: "ai-response",

  // ── Multi-file Support (NEW) ──────────────────
  FILE_CREATE: "file-create",
  FILE_CREATED: "file-created",
  FILE_DELETE: "file-delete",
  FILE_DELETED: "file-deleted",
  FILE_RENAME: "file-rename",
  FILE_RENAMED: "file-renamed",
  FILE_SELECT: "file-select",
  FILE_SELECTED: "file-selected",
  FILE_CONTENT_CHANGE: "file-content-change",
  FILE_CONTENT_UPDATE: "file-content-update",
  FILES_STATE: "files-state",
};

export const THEMES = {
  DARK: "vs-dark",
  LIGHT: "light",
};

export const AUTO_SAVE_DEBOUNCE = 2000;
