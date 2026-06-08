import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";

async function importLearningModule() {
  const root = resolve(".");
  const sourcePath = join(root, "src/lib/learning.ts");
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
  const tempDir = await mkdtemp(join(tmpdir(), "learning-rules-"));
  const modulePath = join(tempDir, "learning.mjs");
  await writeFile(modulePath, compiled, "utf8");
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
