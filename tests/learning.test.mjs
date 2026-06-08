import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

async function importLearningModule() {
  const root = resolve(".");
  const tempDir = await mkdtemp(join(tmpdir(), "learning-rules-"));
  const compileFile = async (sourceRelativePath, outputRelativePath, rewriteImports = (value) => value) => {
    const sourcePath = join(root, sourceRelativePath);
    const source = await readFile(sourcePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
        verbatimModuleSyntax: false,
      },
      fileName: sourcePath,
    }).outputText;
    const outputPath = join(tempDir, outputRelativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, rewriteImports(compiled), "utf8");
  };

  await compileFile("src/lib/learning.ts", "learning.mjs", (compiled) =>
    compiled
      .replaceAll('from "./learning/resources"', 'from "./learning/resources.mjs"')
      .replaceAll('from "./learning/grading"', 'from "./learning/grading.mjs"')
      .replaceAll('from "./learning/search"', 'from "./learning/search.mjs"')
      .replaceAll('from "./learning/todayQueue"', 'from "./learning/todayQueue.mjs"'),
  );
  const rewriteLearningImport = (compiled) =>
    compiled.replaceAll('from "../learning"', 'from "../learning.mjs"');
  await compileFile("src/lib/learning/resources.ts", "learning/resources.mjs");
  await compileFile("src/lib/learning/grading.ts", "learning/grading.mjs");
  await compileFile("src/lib/learning/search.ts", "learning/search.mjs", rewriteLearningImport);
  await compileFile("src/lib/learning/todayQueue.ts", "learning/todayQueue.mjs", rewriteLearningImport);

  const modulePath = join(tempDir, "learning.mjs");
  const module = await import(`file:///${modulePath.replace(/\\/g, "/")}`);
  return { module, cleanup: () => rm(tempDir, { recursive: true, force: true }) };
}

function makeBaseState() {
  return {
    goals: [
      {
        id: "goal_backend",
        title: "Java 后端就业准备",
        type: "custom",
        templateKey: "custom",
        domain: "Java 后端",
        importance: 5,
        track: "shared",
        category: "数据库 / 网络 / 面试",
        deadline: "2026-07-01",
        weeklyHours: 12,
        currentLevel: "数据库索引薄弱",
        progress: 60,
        status: "进行中",
        description: "补齐后端面试高频知识",
        linkedKnowledge: ["数据库索引", "TCP"],
        createdAt: "2026-06-01",
        updatedAt: "2026-06-08",
      },
    ],
    notes: [
      {
        id: "note_index",
        title: "数据库索引",
        type: "技术",
        direction: "数据库",
        tracks: ["shared"],
        associatedGoalIds: ["goal_backend"],
        mastery: "初学",
        importance: "高",
        summary: "索引用于提升查询效率。",
        content: "联合索引、最左前缀、覆盖索引和回表。",
        coreConcepts: ["联合索引"],
        commonQuestions: ["联合索引为什么要遵守最左前缀？"],
        myUnderstanding: "索引要结合查询条件设计。",
        relatedNoteIds: [],
        reviewRecords: [],
        nextAction: "完成索引专项题",
        createdAt: "2026-06-01",
        updatedAt: "2026-06-08",
      },
    ],
    knowledgePoints: [
      {
        id: "kp_index",
        name: "联合索引",
        noteIds: ["note_index"],
        goalIds: ["goal_backend"],
        tracks: ["shared"],
        mastery: "理解",
        masteryScore: 50,
        evidenceCount: 1,
        systemMastery: "理解",
        lastTestScore: 72,
        lastReviewedAt: "2026-06-07",
        repeatedMistakeCount: 0,
        reviewPriority: "中",
        reason: "来自《数据库索引》",
        updatedAt: "2026-06-08",
      },
    ],
    milestones: [
      {
        id: "milestone_index",
        goalId: "goal_backend",
        title: "数据库索引专项",
        description: "完成自测和错题复盘",
        deadline: "2026-06-01",
        status: "延期",
        progress: 35,
        createdAt: "2026-05-20",
        updatedAt: "2026-06-08",
      },
    ],
    plans: [
      {
        id: "plan_index",
        title: "完成索引自测",
        scope: "今日",
        category: "数据库",
        track: "shared",
        dueDate: "2026-06-08",
        status: "未开始",
        source: "自测系统",
        noteId: "note_index",
        goalId: "goal_backend",
        milestoneId: "milestone_index",
        createdAt: "2026-06-08",
      },
    ],
    reviewReminders: [
      {
        id: "review_index",
        noteId: "note_index",
        goalId: "goal_backend",
        conceptName: "联合索引",
        dueAt: "2026-06-08",
        intervalDays: 1,
        status: "待复习",
        createdAt: "2026-06-07",
        lastScore: 2,
      },
    ],
    reflections: [],
    projects: [],
    questions: [
      {
        id: "question_index",
        goalId: "goal_backend",
        noteId: "note_index",
        knowledgePointIds: ["kp_index"],
        type: "面试题",
        question: "联合索引为什么要遵守最左前缀原则？",
        answer: "联合索引按列顺序组织，查询需要从最左列开始匹配。",
        difficulty: 4,
        source: "AI生成",
        createdAt: "2026-06-08",
      },
    ],
    answerAttempts: [],
    mistakes: [],
    recommendations: [],
    studyEvents: [],
  };
}

test("learning rules: mastery evidence raises and lowers system mastery score", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    const raised = module.applyKnowledgeEvidence(state.knowledgePoints, {
      knowledgePointIds: ["kp_index"],
      delta: 15,
      score: 90,
      reviewedAt: "2026-06-08",
    });
    assert.equal(raised[0].masteryScore, 65);
    assert.equal(raised[0].systemMastery, "熟练");
    assert.equal(raised[0].evidenceCount, 2);
    assert.equal(raised[0].lastTestScore, 90);

    const lowered = module.updateKnowledgeAfterQuestionAttempt(
      raised,
      state.questions,
      [{ id: "attempt_old", questionId: "question_index", score: 45, answerText: "", feedback: "", createdAt: "2026-06-07" }],
      state.questions[0],
      { id: "attempt_new", questionId: "question_index", score: 40, answerText: "只写结论", feedback: "过浅", createdAt: "2026-06-08" },
      true,
    );
    assert.equal(lowered[0].masteryScore, 15);
    assert.equal(lowered[0].systemMastery, "未学");
    assert.equal(lowered[0].reviewPriority, "高");
    assert.equal(lowered[0].repeatedMistakeCount, 1);
  } finally {
    await cleanup();
  }
});

test("learning rules: low score attempt creates and repeats mistakes", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    const lowAttempt = {
      id: "attempt_low",
      questionId: "question_index",
      score: 45,
      answerText: "按顺序用",
      feedback: "缺少索引结构解释",
      createdAt: "2026-06-08",
    };
    const first = module.upsertMistakeFromAttempt([], state.questions[0], lowAttempt);
    assert.equal(first.mistakes.length, 1);
    assert.equal(first.mistake.status, "待复习");
    assert.equal(first.repeatedMistake, false);
    assert.equal(first.mistake.repeatedCount, 1);

    const second = module.upsertMistakeFromAttempt(first.mistakes, state.questions[0], {
      ...lowAttempt,
      id: "attempt_low_again",
    });
    assert.equal(second.mistakes.length, 1);
    assert.equal(second.repeatedMistake, true);
    assert.equal(second.mistake.repeatedCount, 2);

    const passed = module.upsertMistakeFromAttempt(second.mistakes, state.questions[0], {
      ...lowAttempt,
      id: "attempt_pass",
      score: 80,
    });
    assert.equal(passed.mistakes.length, 1);
    assert.equal(passed.mistake, null);
  } finally {
    await cleanup();
  }
});

test("learning rules: recommendations include explainable reasons", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    state.knowledgePoints[0].masteryScore = 28;
    state.knowledgePoints[0].systemMastery = "初学";
    state.knowledgePoints[0].lastTestScore = 45;
    state.mistakes = [
      {
        id: "mistake_index",
        questionId: "question_index",
        goalId: "goal_backend",
        noteId: "note_index",
        knowledgePointIds: ["kp_index"],
        title: "联合索引最左前缀",
        reason: "只背结论",
        repeatedCount: 2,
        status: "待复习",
        createdAt: "2026-06-08",
        updatedAt: "2026-06-08",
      },
    ];

    const recommendations = module.buildRecommendations(state, "2026-06-08");
    assert.ok(recommendations.length >= 3);
    assert.ok(recommendations.some((item) => item.id === "rec_kp_kp_index"));
    assert.ok(recommendations.some((item) => item.id === "rec_mistake_mistake_index"));
    assert.ok(recommendations.some((item) => item.id === "rec_milestone_milestone_index"));
    const knowledgeRecommendation = recommendations.find((item) => item.id === "rec_kp_kp_index");
    assert.ok(knowledgeRecommendation.reasons.some((reason) => reason.includes("系统掌握分 28/100")));
    assert.ok(knowledgeRecommendation.reasons.some((reason) => reason.includes("最近自测 45")));
  } finally {
    await cleanup();
  }
});

test("learning rules: weekly summary reports mistakes, milestones, test score and mastery score", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    state.answerAttempts = [
      {
        id: "attempt_week",
        questionId: "question_index",
        score: 45,
        answerText: "按顺序",
        feedback: "回答过浅",
        createdAt: "2026-06-08",
      },
    ];
    state.mistakes = [
      {
        id: "mistake_index",
        questionId: "question_index",
        goalId: "goal_backend",
        noteId: "note_index",
        knowledgePointIds: ["kp_index"],
        title: "联合索引最左前缀",
        reason: "没有解释 B+ 树列顺序",
        repeatedCount: 2,
        status: "待复习",
        createdAt: "2026-06-08",
        updatedAt: "2026-06-08",
      },
    ];
    state.studyEvents = [
      {
        id: "event_kp",
        type: "answered_question",
        goalId: "goal_backend",
        noteId: "note_index",
        knowledgePointId: "kp_index",
        score: 45,
        title: "完成联合索引自测",
        createdAt: "2026-06-08",
      },
    ];

    const summary = module.buildWeeklySummary(state);
    assert.match(summary, /里程碑风险/);
    assert.match(summary, /自测表现/);
    assert.match(summary, /平均 45 分/);
    assert.match(summary, /错题风险/);
    assert.match(summary, /重复错题 1 道/);
    assert.match(summary, /掌握分变化/);
    assert.match(summary, /联合索引：50\/100/);
  } finally {
    await cleanup();
  }
});

test("v4 rules: resource import powers search, knowledge answers and learning paths", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    const resource = {
      id: "resource_tcp",
      title: "TCP 连接管理资料",
      type: "markdown",
      goalId: "goal_backend",
      sourceName: "课程讲义",
      fileName: "tcp.md",
      contentText:
        "# TCP 连接管理\n\nTCP 需要三次握手。客户端发送 SYN，服务端返回 SYN+ACK，客户端再发送 ACK。\n\n## 为什么不是两次握手\n两次握手无法确认客户端接收能力，也无法可靠同步双方初始序列号，历史连接请求可能造成服务端资源浪费。",
      status: "已解析",
      createdAt: "2026-06-08",
      updatedAt: "2026-06-08",
    };

    const chunks = module.buildResourceChunks(resource, 120);
    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0].resourceId, resource.id);
    assert.ok(chunks[0].summary.includes("TCP"));

    const note = module.buildNoteFromResource(resource, chunks, state.goals);
    assert.equal(note.associatedGoalIds[0], "goal_backend");
    assert.equal(note.mastery, "初学");
    assert.ok(note.coreConcepts.length > 0);

    const knowledgePoints = module.upsertKnowledgeFromNote(note, state.knowledgePoints, state.goals);
    const nextState = {
      ...state,
      resources: [resource],
      resourceChunks: chunks,
      notes: [note, ...state.notes],
      knowledgePoints,
      searchDocuments: [],
      learningPaths: [],
      learningPathSteps: [],
      rubrics: [],
      aiGradingResults: [],
      knowledgeRelations: [],
      reviewPolicies: [],
      importJobs: [],
    };

    const documents = module.buildSearchDocuments(nextState);
    assert.ok(documents.some((document) => document.sourceType === "resource"));
    assert.ok(documents.some((document) => document.sourceType === "note"));
    assert.ok(documents.every((document) => Array.isArray(document.embedding)));
    assert.ok(documents.some((document) => document.embedding.length > 0));

    const results = module.searchKnowledgeBase(nextState, "为什么 TCP 不能两次握手");
    assert.ok(results.length >= 1);
    assert.ok(results[0].score > 0);
    assert.ok(results[0].keywordScore > 0 || results[0].semanticScore > 0);
    assert.ok(["resource", "note", "question", "knowledge"].includes(results[0].document.sourceType));

    const answer = module.answerKnowledgeQuestion(nextState, "为什么 TCP 不能两次握手？");
    assert.match(answer.answer, /参考来源/);
    assert.ok(answer.sources.length >= 1);

    const generated = module.buildAdaptiveLearningPath(nextState, "goal_backend", {
      startDate: "2026-06-08",
      horizonDays: 7,
    });
    assert.ok(generated);
    assert.equal(generated.path.goalId, "goal_backend");
    assert.ok(generated.steps.some((step) => step.actionType === "读资料"));
    assert.ok(generated.steps.some((step) => step.actionType === "做题" || step.actionType === "错题复盘"));

    const plans = module.materializeLearningPathAsPlans(
      generated.path,
      generated.steps,
      state.goals[0],
    );
    assert.equal(plans.length, generated.steps.length);
    assert.ok(plans.every((plan) => plan.source === "学习路径"));
  } finally {
    await cleanup();
  }
});

test("v5 search: semantic retrieval recalls related wording and refuses unsupported answers", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    const resource = {
      id: "resource_network_history",
      title: "连接建立异常案例",
      type: "markdown",
      goalId: "goal_backend",
      sourceName: "网络课程",
      fileName: "network.md",
      contentText:
        "旧连接请求和过期报文可能让服务端误以为新连接已经建立，导致半连接队列和服务端资源被浪费。三次握手通过再次确认接收能力来降低这个风险。",
      status: "已解析",
      createdAt: "2026-06-08",
      updatedAt: "2026-06-08",
    };
    const nextState = {
      ...state,
      resources: [resource],
      resourceChunks: module.buildResourceChunks(resource, 160),
      searchDocuments: [],
      learningPaths: [],
      learningPathSteps: [],
      rubrics: [],
      aiGradingResults: [],
      knowledgeRelations: [],
      reviewPolicies: [],
      importJobs: [],
    };

    const results = module.searchKnowledgeBase(nextState, "历史报文为什么会浪费服务端资源");
    assert.ok(results.length >= 1);
    assert.ok(results[0].semanticScore >= 16);
    assert.match(results[0].document.content, /旧连接请求|过期报文|半连接队列/);

    const unsupported = module.answerKnowledgeQuestion(
      { ...state, notes: [], resources: [], resourceChunks: [], questions: [], mistakes: [], knowledgePoints: [] },
      "量子力学和 TCP 有什么关系？",
    );
    assert.equal(unsupported.sources.length, 0);
    assert.match(unsupported.answer, /没有召回|先导入资料|补充笔记/);
  } finally {
    await cleanup();
  }
});

test("v5 grading: rubric based grading reports missing points and low score", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const question = makeBaseState().questions[0];
    const rubric = module.buildDefaultRubric(question);
    assert.equal(rubric.questionId, question.id);
    assert.ok(rubric.criteria.length >= 3);

    const weak = module.gradeAnswerWithRubric(question, rubric, "按顺序用。");
    assert.equal(weak.questionId, question.id);
    assert.ok(weak.score < 60);
    assert.ok(weak.missingPoints.length > 0);
    assert.ok(weak.deductions.length > 0);
    assert.match(weak.improvedAnswer, /核心答案|还需要补充/);
    assert.match(weak.nextAction, /重学|遗漏|费曼/);

    const strong = module.gradeAnswerWithRubric(
      question,
      rubric,
      "联合索引按照列顺序组织，查询要从最左列开始匹配，才能利用有序结构缩小扫描范围。例如 index(a,b) 在只查 b 时很难命中完整索引。",
    );
    assert.ok(strong.score > weak.score);
    assert.ok(strong.strengths.length > 0);
  } finally {
    await cleanup();
  }
});

test("v5 cockpit: today queue is explainable and completion/postpone mutate source state", async () => {
  const { module, cleanup } = await importLearningModule();
  try {
    const state = makeBaseState();
    state.knowledgePoints[0].masteryScore = 28;
    state.knowledgePoints[0].systemMastery = "初学";
    state.knowledgePoints[0].lastTestScore = 45;
    state.mistakes = [
      {
        id: "mistake_index",
        questionId: "question_index",
        goalId: "goal_backend",
        noteId: "note_index",
        knowledgePointIds: ["kp_index"],
        title: "联合索引最左前缀",
        reason: "只背结论",
        repeatedCount: 2,
        status: "待复习",
        createdAt: "2026-06-08",
        updatedAt: "2026-06-08",
      },
    ];

    const queue = module.buildTodayLearningQueue(state, "2026-06-08");
    assert.ok(queue.length >= 3);
    assert.ok(queue.every((task) => task.reasons.length > 0));
    assert.ok(queue.some((task) => task.sourceType === "review"));
    assert.ok(queue.some((task) => task.sourceType === "plan"));
    assert.ok(queue.some((task) => task.sourceType === "mistake"));

    const planTask = queue.find((task) => task.sourceType === "plan");
    const completed = module.completeTodayLearningTask(state, planTask, "2026-06-08");
    assert.equal(completed.plans.find((plan) => plan.id === "plan_index").status, "完成");
    assert.ok(completed.studyEvents.some((event) => event.title.includes("完成今日任务")));

    const reviewTask = queue.find((task) => task.sourceType === "review");
    const postponed = module.postponeTodayLearningTask(state, reviewTask, 1, "2026-06-08");
    assert.equal(postponed.reviewReminders.find((reminder) => reminder.id === "review_index").dueAt, "2026-06-09");
  } finally {
    await cleanup();
  }
});
