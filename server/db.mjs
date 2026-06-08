import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const stateTables = [
  ["notes", "notes"],
  ["resources", "resources"],
  ["resourceChunks", "resourceChunks"],
  ["searchDocuments", "searchDocuments"],
  ["learningPaths", "learningPaths"],
  ["learningPathSteps", "learningPathSteps"],
  ["knowledgePoints", "knowledgePoints"],
  ["milestones", "milestones"],
  ["plans", "plans"],
  ["reviewReminders", "reviewReminders"],
  ["reflections", "reflections"],
  ["goals", "goals"],
  ["projects", "projects"],
  ["questions", "questions"],
  ["answerAttempts", "answerAttempts"],
  ["mistakes", "mistakes"],
  ["recommendations", "recommendations"],
  ["studyEvents", "studyEvents"],
  ["rubrics", "rubrics"],
  ["aiGradingResults", "aiGradingResults"],
  ["knowledgeRelations", "knowledgeRelations"],
  ["reviewPolicies", "reviewPolicies"],
  ["importJobs", "importJobs"],
];

const emptyDb = () => ({
  users: [],
  sessions: [],
  notes: [],
  resources: [],
  resourceChunks: [],
  searchDocuments: [],
  learningPaths: [],
  learningPathSteps: [],
  knowledgePoints: [],
  milestones: [],
  plans: [],
  reviewReminders: [],
  reflections: [],
  goals: [],
  projects: [],
  questions: [],
  answerAttempts: [],
  mistakes: [],
  recommendations: [],
  studyEvents: [],
  rubrics: [],
  aiGradingResults: [],
  knowledgeRelations: [],
  reviewPolicies: [],
  importJobs: [],
});

function findPython() {
  const candidates = [process.env.PYTHON_BIN, "python3", "python"].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  throw new Error("未找到 Python。SQLite 数据层需要 python3 或 python 的标准库 sqlite3。");
}

export function openDb(file = process.env.LEARNING_DB_FILE || "server/data/learning.sqlite") {
  const dbFile = resolve(file);
  const python = findPython();
  const driver = resolve("server/sqlite_driver.py");
  const shouldMigrateLegacyJson = !existsSync(dbFile);
  mkdirSync(dirname(dbFile), { recursive: true });

  const callDriver = (action, payload = {}) => {
    const result = spawnSync(
      python,
      [driver, dbFile],
      {
        input: JSON.stringify({ action, ...payload }),
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
        },
      },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || "SQLite driver failed");
    }

    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  };

  callDriver("init");

  const legacyJson = resolve("server/data/learning-db.json");
  if (shouldMigrateLegacyJson && existsSync(legacyJson)) {
    callDriver("write", { db: { ...emptyDb(), ...JSON.parse(readFileSync(legacyJson, "utf8")) } });
  }

  const read = () => ({ ...emptyDb(), ...callDriver("read").db });
  const write = (db) => {
    callDriver("write", { db: { ...emptyDb(), ...db } });
  };

  return { read, write, dbFile };
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  };
}

export function selectUserState(db, userId) {
  const stripUserId = ({ userId: _userId, ...row }) => row;
  return Object.fromEntries(
    stateTables.map(([stateKey, tableName]) => [
      stateKey,
      db[tableName].filter((row) => row.userId === userId).map(stripUserId),
    ]),
  );
}

export function replaceUserState(db, userId, state) {
  stateTables.forEach(([stateKey, tableName]) => {
    db[tableName] = db[tableName].filter((row) => row.userId !== userId);
    const rows = Array.isArray(state[stateKey]) ? state[stateKey] : [];
    db[tableName].push(...rows.map((row) => ({ ...row, userId })));
  });
}
