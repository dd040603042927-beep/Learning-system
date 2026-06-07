import type { AppState, Note } from "../types";
import { dueReminders, trackShortLabels } from "./learning";

export type AiAction = "summary" | "concepts" | "quiz" | "socratic" | "next";

export const aiActionLabels: Record<AiAction, string> = {
  summary: "笔记总结",
  concepts: "知识点提取",
  quiz: "生成复习题",
  socratic: "反问式学习",
  next: "下一步建议",
};

export function runLocalAi(action: AiAction, state: AppState, note?: Note) {
  if (action !== "next" && !note) {
    return "请选择一篇笔记。";
  }

  switch (action) {
    case "summary":
      return summarizeNote(note!);
    case "concepts":
      return extractKnowledgePrompt(note!, state);
    case "quiz":
      return buildQuiz(note!);
    case "socratic":
      return buildSocraticQuestions(note!);
    case "next":
      return buildNextSuggestions(state);
  }
}

function summarizeNote(note: Note) {
  return [
    `摘要：${note.summary || "这篇笔记还缺少摘要，需要先压缩核心内容。"}`,
    `重点：${note.coreConcepts.join("、") || "暂未填写核心概念。"}`,
    `我的理解：${note.myUnderstanding || "还没有写自己的理解，建议补上。"} `,
    `下一步行动：${note.nextAction || "还没有行动项，建议补一个可执行任务。"}`,
  ].join("\n");
}

function extractKnowledgePrompt(note: Note, state: AppState) {
  const goals = state.goals
    .filter((goal) => note.associatedGoalIds.includes(goal.id))
    .map((goal) => goal.title);

  return [
    `核心知识点：${note.coreConcepts.join("、")}`,
    `路线归属：${note.tracks.map((track) => trackShortLabels[track]).join(" / ")}`,
    `关联目标：${goals.join("、") || "暂未关联目标"}`,
    `建议复习优先级：${note.importance === "高" || note.tracks.includes("shared") ? "高" : note.importance}`,
    note.tracks.includes("shared")
      ? "理由：这是考研和就业都能复用的交叉知识点，应该优先做自测和讲解。"
      : "理由：根据重要程度和掌握程度安排复习。",
  ].join("\n");
}

function buildQuiz(note: Note) {
  const conceptQuestions = note.coreConcepts.slice(0, 4).map((concept, index) => {
    return `${index + 1}. 用自己的话解释「${concept}」，并举一个应用场景。`;
  });
  const existing = note.commonQuestions.map((question, index) => {
    return `${index + conceptQuestions.length + 1}. ${question}`;
  });
  return [
    "复习题：",
    ...conceptQuestions,
    ...existing,
    "",
    "面试/简答加压题：这个知识点最容易和你已学过的哪个知识点混淆？你怎么区分？",
  ].join("\n");
}

function buildSocraticQuestions(note: Note) {
  return [
    `先不要看资料。你能不能用 3 句话讲清楚「${note.title}」？`,
    `它解决的真实问题是什么？如果没有它，会发生什么？`,
    `你现在的理解是：${note.myUnderstanding || "还没有写。请补充自己的理解。"} `,
    `你下一步准备做：${note.nextAction || "还没有行动项。请把它改成一个能在 1-2 小时内完成的小任务。"}`,
    "最后检查：你能不能给别人讲一个例子，并回答对方的追问？",
  ].join("\n");
}

function buildNextSuggestions(state: AppState) {
  const weakNotes = state.notes
    .filter((note) => note.mastery === "未学" || note.mastery === "初学")
    .slice(0, 3);
  const due = dueReminders(state.reviewReminders);
  const activeProjects = state.projects.filter((project) => project.nextAction.trim());
  const incompletePlans = state.plans.filter((plan) => plan.status !== "完成").slice(0, 3);

  const suggestions = [
    due.length > 0
      ? `1. 先完成 ${due.length} 个到期复习，优先做自测而不是只重读笔记。`
      : "1. 今天没有到期复习，可以安排一次输出型复盘。",
    weakNotes.length > 0
      ? `2. 补强低掌握度笔记：${weakNotes.map((note) => note.title).join("、")}。`
      : "2. 低掌握度笔记较少，可以把一个理解级知识点提升到可讲解。",
    activeProjects.length > 0
      ? `3. 推进项目作品集：${activeProjects[0].nextAction}`
      : "3. 增加一个项目驱动任务，把最近学的知识点变成小功能。",
    incompletePlans.length > 0
      ? `4. 收敛计划：先完成「${incompletePlans[0].title}」，避免计划堆积。`
      : "4. 计划清单较干净，可以为下周新增一个项目任务。",
  ];

  return suggestions.join("\n");
}
