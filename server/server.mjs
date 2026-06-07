import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { makeInitialState } from "./seed.mjs";
import { openDb, publicUser, replaceUserState, selectUserState } from "./db.mjs";
import { runRealAi } from "./ai.mjs";

const dbStore = openDb();
const distRoot = resolve("dist");
const port = Number(process.argv[2] || process.env.PORT || 5175);
const sessionDays = 7;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;

const hashPassword = (password, salt) =>
  createHash("sha256").update(`${salt}:${password}`).digest("hex");

const json = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolveBody, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });

const authFromRequest = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const db = dbStore.read();
  const now = new Date().toISOString();
  const session = db.sessions.find((item) => item.token === token && item.expiresAt > now);
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;
  return { db, user, token };
};

const requireAuth = (request, response) => {
  const auth = authFromRequest(request);
  if (!auth) {
    json(response, 401, { message: "请先登录" });
    return null;
  }
  return auth;
};

const createSession = (db, userId) => {
  const token = randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({ token, userId, createdAt, expiresAt });
  return token;
};

const handleApi = async (request, response, url) => {
  if (request.method === "OPTIONS") {
    json(response, 204, {});
    return true;
  }

  if (url.pathname === "/api/health") {
    json(response, 200, { ok: true, dbFile: dbStore.dbFile });
    return true;
  }

  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username.length < 3 || password.length < 6) {
      json(response, 400, { message: "用户名至少 3 位，密码至少 6 位" });
      return true;
    }

    const db = dbStore.read();
    if (db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      json(response, 409, { message: "用户名已存在" });
      return true;
    }

    const salt = randomBytes(16).toString("hex");
    const user = {
      id: uid("user"),
      username,
      salt,
      passwordHash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    replaceUserState(db, user.id, makeInitialState());
    const token = createSession(db, user.id);
    dbStore.write(db);
    json(response, 201, { token, user: publicUser(user), state: selectUserState(db, user.id) });
    return true;
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const db = dbStore.read();
    const user = db.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!user || user.passwordHash !== hashPassword(password, user.salt)) {
      json(response, 401, { message: "用户名或密码错误" });
      return true;
    }
    const token = createSession(db, user.id);
    dbStore.write(db);
    json(response, 200, { token, user: publicUser(user), state: selectUserState(db, user.id) });
    return true;
  }

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const auth = requireAuth(request, response);
    if (!auth) return true;
    json(response, 200, {
      user: publicUser(auth.user),
      state: selectUserState(auth.db, auth.user.id),
    });
    return true;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      const db = dbStore.read();
      db.sessions = db.sessions.filter((session) => session.token !== token);
      dbStore.write(db);
    }
    json(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/state" && request.method === "GET") {
    const auth = requireAuth(request, response);
    if (!auth) return true;
    json(response, 200, { state: selectUserState(auth.db, auth.user.id) });
    return true;
  }

  if (url.pathname === "/api/state" && request.method === "PUT") {
    const auth = requireAuth(request, response);
    if (!auth) return true;
    const body = await readBody(request);
    replaceUserState(auth.db, auth.user.id, body.state || {});
    dbStore.write(auth.db);
    json(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/ai" && request.method === "POST") {
    const auth = requireAuth(request, response);
    if (!auth) return true;
    const body = await readBody(request);
    const state = selectUserState(auth.db, auth.user.id);
    try {
      const output = await runRealAi({
        action: String(body.action || "next"),
        noteId: body.noteId,
        state,
      });
      json(response, 200, { output, source: "remote" });
    } catch (error) {
      json(response, error.statusCode || 503, {
        message: error.message || "AI 接口暂不可用，前端会使用本地 fallback。",
      });
    }
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    json(response, 404, { message: "接口不存在" });
    return true;
  }

  return false;
};

const resolveStatic = (url = "/") => {
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const requested = normalize(pathname === "/" ? "/index.html" : pathname);
  const candidate = resolve(join(distRoot, requested));
  if (!candidate.startsWith(distRoot)) return join(distRoot, "index.html");
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(distRoot, "index.html");
};

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (await handleApi(request, response, url)) return;
    const filePath = resolveStatic(request.url);
    const ext = extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
    });
    createReadStream(filePath)
      .on("error", () => {
        response.statusCode = 404;
        response.end("Not found");
      })
      .pipe(response);
  } catch (error) {
    json(response, 500, { message: error.message || "服务器错误" });
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Learning API and app are running at http://127.0.0.1:${port}`);
});
