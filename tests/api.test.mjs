import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(".");

async function waitForHealth(baseUrl, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // keep polling until the server is ready
    }
    await new Promise((resolvePoll) => setTimeout(resolvePoll, 250));
  }
  throw new Error("server did not become ready");
}

async function api(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

test("auth and state API: register, login, save state, read state", async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), "learning-api-"));
  const dbFile = join(tempDir, "test-learning.sqlite");
  const port = 5300 + Math.floor(Math.random() * 400);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["server/server.mjs", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      LEARNING_DB_FILE: dbFile,
      AI_API_KEY: "",
      OPENAI_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  t.after(async () => {
    server.kill();
    await rm(tempDir, { recursive: true, force: true });
  });

  await waitForHealth(baseUrl);

  const username = `api_user_${Date.now()}`;
  const password = "123456";
  const registered = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  assert.equal(
    registered.response.status,
    201,
    `register body=${JSON.stringify(registered.body)} stderr=${stderr}`,
  );
  assert.equal(registered.body.user.username, username);
  assert.ok(registered.body.token);
  assert.ok(Array.isArray(registered.body.state.notes));

  const loggedIn = await api(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  assert.equal(loggedIn.response.status, 200);
  assert.equal(loggedIn.body.user.username, username);
  assert.ok(loggedIn.body.token);

  const token = loggedIn.body.token;
  const state = loggedIn.body.state;
  state.plans = [
    ...state.plans,
    {
      id: "plan_api_test",
      title: "接口测试保存计划",
      scope: "今日",
      category: "接口测试",
      track: "career",
      dueDate: "2026-06-07",
      status: "未开始",
      source: "手动",
      createdAt: "2026-06-07",
    },
  ];

  const saved = await api(baseUrl, "/api/state", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ state }),
  });

  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.ok, true);

  const read = await api(baseUrl, "/api/state", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(read.response.status, 200);
  assert.ok(read.body.state.plans.some((plan) => plan.id === "plan_api_test"));
  assert.equal(
    read.body.state.plans.find((plan) => plan.id === "plan_api_test").title,
    "接口测试保存计划",
  );
});
