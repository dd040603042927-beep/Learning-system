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
  assert.ok(Array.isArray(registered.body.state.resources));
  assert.ok(Array.isArray(registered.body.state.resourceChunks));
  assert.ok(Array.isArray(registered.body.state.searchDocuments));
  assert.ok(Array.isArray(registered.body.state.learningPaths));
  assert.ok(Array.isArray(registered.body.state.learningPathSteps));
  assert.ok(Array.isArray(registered.body.state.milestones));
  assert.ok(Array.isArray(registered.body.state.questions));
  assert.ok(Array.isArray(registered.body.state.answerAttempts));
  assert.ok(Array.isArray(registered.body.state.mistakes));
  assert.ok(Array.isArray(registered.body.state.recommendations));
  assert.ok(Array.isArray(registered.body.state.studyEvents));
  assert.ok(Array.isArray(registered.body.state.importJobs));
  assert.deepEqual(registered.body.state.goals, []);
  assert.ok(
    !registered.body.state.goals.some((goal) =>
      /考研|前端/.test(`${goal.title || ""}${goal.domain || ""}`),
    ),
    "new users must not receive default kaoyan/frontend goals",
  );

  const loggedIn = await api(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  assert.equal(loggedIn.response.status, 200);
  assert.equal(loggedIn.body.user.username, username);
  assert.ok(loggedIn.body.token);

  const token = loggedIn.body.token;
  const state = loggedIn.body.state;
  const customGoal = {
    id: "goal_cet6_test",
    title: "英语六级真题刷完",
    type: "custom",
    templateKey: "custom",
    domain: "英语六级",
    importance: 5,
    track: "shared",
    category: "真题 / 单词 / 听力 / 作文",
    deadline: "2026-12-01",
    weeklyHours: 7,
    currentLevel: "词汇薄弱，听力需要每日练习",
    progress: 0,
    status: "进行中",
    description: "12 月前刷完近十年真题并完成错题复盘",
    linkedKnowledge: ["真题", "单词", "听力", "作文"],
    createdAt: "2026-06-07",
    updatedAt: "2026-06-07",
  };
  const linkedNote = {
    id: "note_cet6_listening",
    title: "英语六级听力精听方法",
    type: "课程",
    direction: "英语六级",
    tracks: ["shared"],
    associatedGoalIds: [customGoal.id],
    mastery: "初学",
    importance: "高",
    summary: "记录听力精听步骤和错题复盘方式。",
    content: "先盲听，再对照原文标记弱点，最后复述核心句。",
    coreConcepts: ["精听", "错题复盘"],
    commonQuestions: ["为什么听懂原文但做不对题？"],
    myUnderstanding: "听力训练要把输入和题型判断分开练。",
    relatedNoteIds: [],
    reviewRecords: [],
    nextAction: "完成一套 2024 年 6 月听力精听",
    createdAt: "2026-06-07",
    updatedAt: "2026-06-07",
  };
  const knowledgePoint = {
    id: "kp_cet6_listening",
    name: "精听",
    noteIds: [linkedNote.id],
    goalIds: [customGoal.id],
    tracks: ["shared"],
    mastery: "初学",
    masteryScore: 32,
    evidenceCount: 2,
    systemMastery: "初学",
    lastTestScore: 45,
    lastReviewedAt: "2026-06-07",
    repeatedMistakeCount: 1,
    reviewPriority: "高",
    reason: "最近自测低分，且进入错题本",
    updatedAt: "2026-06-07",
  };
  const milestone = {
    id: "milestone_cet6_listening_round1",
    goalId: customGoal.id,
    title: "听力真题第一轮",
    description: "完成 2024 年 6 月听力精听和错题复盘",
    deadline: "2026-07-01",
    status: "进行中",
    progress: 40,
    createdAt: "2026-06-07",
    updatedAt: "2026-06-07",
  };
  const question = {
    id: "question_cet6_listening",
    goalId: customGoal.id,
    noteId: linkedNote.id,
    knowledgePointIds: [knowledgePoint.id],
    type: "简答题",
    question: "为什么听懂原文但做不对题？",
    answer: "需要把输入理解、题干定位和选项排除分开训练。",
    difficulty: 3,
    source: "AI生成",
    createdAt: "2026-06-07",
  };
  const attempt = {
    id: "attempt_cet6_listening",
    questionId: question.id,
    score: 45,
    answerText: "因为没有认真听。",
    feedback: "回答过浅，需要说明题干定位和选项排除。",
    createdAt: "2026-06-07",
  };
  const mistake = {
    id: "mistake_cet6_listening",
    questionId: question.id,
    goalId: customGoal.id,
    noteId: linkedNote.id,
    knowledgePointIds: [knowledgePoint.id],
    title: "听懂原文但做不对题",
    reason: "没有区分理解输入和题型判断。",
    repeatedCount: 1,
    status: "待复习",
    createdAt: "2026-06-07",
    updatedAt: "2026-06-07",
  };
  const recommendation = {
    id: "rec_cet6_listening",
    title: "专项训练：六级听力精听",
    actionType: "做题",
    goalId: customGoal.id,
    noteId: linkedNote.id,
    knowledgePointId: knowledgePoint.id,
    priorityScore: 118,
    reasons: [
      "关联目标“英语六级真题刷完”，重要程度 5",
      "最近一次自测 45 分",
      "出现在 1 道错题中",
    ],
    status: "待处理",
    createdAt: "2026-06-07",
  };
  const studyEvent = {
    id: "event_cet6_answered",
    type: "answered_question",
    goalId: customGoal.id,
    noteId: linkedNote.id,
    knowledgePointId: knowledgePoint.id,
    score: 45,
    title: "完成六级听力自测",
    createdAt: "2026-06-07",
  };
  const resource = {
    id: "resource_api_test",
    title: "英语六级听力真题资料",
    type: "markdown",
    goalId: customGoal.id,
    sourceName: "真题摘录",
    fileName: "cet6-listening.md",
    contentText: "听力训练需要先盲听，再对照原文定位弱点，最后复述核心句。",
    status: "已解析",
    createdAt: "2026-06-07",
    updatedAt: "2026-06-07",
  };
  const resourceChunk = {
    id: "chunk_api_test",
    resourceId: resource.id,
    goalId: customGoal.id,
    title: "听力训练流程",
    content: "先盲听，再对照原文定位弱点，最后复述核心句。",
    orderIndex: 0,
    summary: "听力精听按盲听、对照、复述推进。",
    knowledgePointIds: [knowledgePoint.id],
    createdAt: "2026-06-07",
  };
  const learningPath = {
    id: "path_api_test",
    goalId: customGoal.id,
    title: "英语六级 7 天学习路径",
    startDate: "2026-06-07",
    endDate: "2026-06-13",
    status: "草稿",
    createdAt: "2026-06-07",
    updatedAt: "2026-06-07",
  };
  const learningPathStep = {
    id: "path_step_api_test",
    pathId: learningPath.id,
    goalId: customGoal.id,
    title: "阅读资料并完成听力精听",
    actionType: "读资料",
    sourceId: resource.id,
    dueDate: "2026-06-08",
    estimatedMinutes: 45,
    status: "未开始",
    reasons: ["资料已解析", "关联目标「英语六级真题刷完」"],
  };
  state.goals = [customGoal];
  state.resources = [resource];
  state.resourceChunks = [resourceChunk];
  state.searchDocuments = [
    {
      id: "search_api_test",
      sourceType: "resource",
      sourceId: resource.id,
      goalId: customGoal.id,
      title: resource.title,
      content: resource.contentText,
      keywords: ["听力", "精听"],
      updatedAt: "2026-06-07",
    },
  ];
  state.learningPaths = [learningPath];
  state.learningPathSteps = [learningPathStep];
  state.notes = [linkedNote];
  state.knowledgePoints = [knowledgePoint];
  state.milestones = [milestone];
  state.plans = [
    {
      id: "plan_api_test",
      title: "完成 2024 年 6 月英语六级听力精听",
      scope: "今日",
      category: "听力",
      track: "shared",
      dueDate: "2026-06-07",
      status: "未开始",
      source: "手动",
      noteId: linkedNote.id,
      goalId: customGoal.id,
      milestoneId: milestone.id,
      createdAt: "2026-06-07",
    },
  ];
  state.reviewReminders = [
    {
      id: "review_api_test",
      noteId: linkedNote.id,
      goalId: customGoal.id,
      conceptName: "精听",
      dueAt: "2026-06-08",
      intervalDays: 1,
      status: "待复习",
      createdAt: "2026-06-07",
    },
  ];
  state.reflections = [
    {
      id: "reflection_api_test",
      weekStart: "2026-06-01",
      goalFocusIds: [customGoal.id],
      generatedSummary: "本周围绕英语六级目标推进听力精听。",
      wins: "",
      blockers: "",
      masteryNotes: "",
      nextWeekFocus: "",
      createdAt: "2026-06-07",
    },
  ];
  state.questions = [question];
  state.answerAttempts = [attempt];
  state.mistakes = [mistake];
  state.recommendations = [recommendation];
  state.studyEvents = [studyEvent];
  state.importJobs = [
    {
      id: "import_job_api_test",
      resourceId: resource.id,
      status: "已完成",
      step: "生成题目",
      createdAt: "2026-06-07",
      updatedAt: "2026-06-07",
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
    "完成 2024 年 6 月英语六级听力精听",
  );
  assert.equal(read.body.state.goals.length, 1);
  assert.equal(read.body.state.goals[0].type, "custom");
  assert.equal(read.body.state.goals[0].domain, "英语六级");
  assert.equal(read.body.state.goals[0].importance, 5);
  assert.equal(read.body.state.resources[0].title, resource.title);
  assert.equal(read.body.state.resourceChunks[0].resourceId, resource.id);
  assert.equal(read.body.state.searchDocuments[0].sourceType, "resource");
  assert.equal(read.body.state.learningPaths[0].title, learningPath.title);
  assert.equal(read.body.state.learningPathSteps[0].actionType, "读资料");
  assert.equal(read.body.state.importJobs[0].status, "已完成");
  assert.deepEqual(read.body.state.notes[0].associatedGoalIds, [customGoal.id]);
  assert.equal(read.body.state.plans[0].goalId, customGoal.id);
  assert.equal(read.body.state.plans[0].milestoneId, milestone.id);
  assert.equal(read.body.state.reviewReminders[0].goalId, customGoal.id);
  assert.deepEqual(read.body.state.reflections[0].goalFocusIds, [customGoal.id]);
  assert.equal(read.body.state.knowledgePoints[0].masteryScore, 32);
  assert.equal(read.body.state.knowledgePoints[0].systemMastery, "初学");
  assert.equal(read.body.state.milestones[0].title, milestone.title);
  assert.equal(read.body.state.questions[0].type, "简答题");
  assert.equal(read.body.state.answerAttempts[0].score, 45);
  assert.equal(read.body.state.mistakes[0].status, "待复习");
  assert.equal(read.body.state.recommendations[0].reasons.length, 3);
  assert.equal(read.body.state.studyEvents[0].type, "answered_question");
});
