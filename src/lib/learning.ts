import type {
  AiGradingResult,
  AnswerAttempt,
  AppState,
  Goal,
  GoalImportance,
  GoalStatus,
  Importance,
  ImportJob,
  KnowledgePoint,
  KnowledgeRelation,
  LearningPath,
  LearningPathStep,
  Milestone,
  Mistake,
  Mastery,
  Note,
  Question,
  Recommendation,
  Resource,
  ResourceChunk,
  ResourceType,
  ReviewReminder,
  ReviewPolicy,
  Rubric,
  SearchDocument,
  StudyEvent,
  StudyPlan,
  Track,
} from "../types";

export const trackLabels: Record<Track, string> = {
  kaoyan: "考研路线",
  career: "就业路线",
  shared: "双路线交叉",
};

export const trackShortLabels: Record<Track, string> = {
  kaoyan: "考研",
  career: "就业",
  shared: "交叉",
};

export const goalImportanceLabels: Record<GoalImportance, string> = {
  1: "低",
  2: "一般",
  3: "正常",
  4: "重要",
  5: "核心",
};

export const goalStatuses: GoalStatus[] = ["进行中", "已完成", "暂停", "放弃"];

export interface GoalTemplateOption {
  key: string;
  label: string;
  domain: string;
  track: Track;
  defaultTitle: string;
  defaultCategory: string;
  defaultImportance: GoalImportance;
  defaultWeeklyHours: number;
  descriptionHint: string;
  suggestions: string[];
}

export const goalTemplates: GoalTemplateOption[] = [
  {
    key: "kaoyan",
    label: "考研备考",
    domain: "考研",
    track: "kaoyan",
    defaultTitle: "2027 考研计算机",
    defaultCategory: "数学 / 英语 / 政治 / 专业课",
    defaultImportance: 5,
    defaultWeeklyHours: 25,
    descriptionHint: "例如：数学一般，408 初学，英语薄弱，需要形成复习闭环。",
    suggestions: ["数学", "英语", "政治", "专业课", "真题", "错题", "复习计划"],
  },
  {
    key: "career",
    label: "就业求职",
    domain: "就业",
    track: "career",
    defaultTitle: "前端实习准备",
    defaultCategory: "技术栈 / 项目 / 算法 / 面试",
    defaultImportance: 4,
    defaultWeeklyHours: 14,
    descriptionHint: "例如：3 个月内完成 2 个项目，补齐简历和面试表达。",
    suggestions: ["技术栈", "项目", "算法", "八股文", "简历", "面试记录"],
  },
  {
    key: "course",
    label: "课程学习",
    domain: "课程",
    track: "shared",
    defaultTitle: "本学期核心课程",
    defaultCategory: "课堂 / 作业 / 复习 / 考试",
    defaultImportance: 3,
    defaultWeeklyHours: 8,
    descriptionHint: "例如：围绕课程章节整理笔记，按周完成作业和复盘。",
    suggestions: ["章节笔记", "作业", "考试重点", "错题", "周复盘"],
  },
  {
    key: "certificate",
    label: "证书考试",
    domain: "证书",
    track: "shared",
    defaultTitle: "证书考试备考",
    defaultCategory: "教材 / 真题 / 错题 / 冲刺",
    defaultImportance: 4,
    defaultWeeklyHours: 10,
    descriptionHint: "例如：12 月前刷完真题，建立错题和到期复习清单。",
    suggestions: ["教材", "真题", "错题", "模拟考试", "冲刺计划"],
  },
  {
    key: "project",
    label: "项目开发",
    domain: "项目",
    track: "career",
    defaultTitle: "个人项目第二版",
    defaultCategory: "需求 / 开发 / 测试 / 复盘",
    defaultImportance: 4,
    defaultWeeklyHours: 12,
    descriptionHint: "例如：完成可展示版本，沉淀技术难点和项目复盘。",
    suggestions: ["需求拆解", "技术方案", "开发任务", "测试", "项目复盘"],
  },
  {
    key: "reading",
    label: "读书成长",
    domain: "读书",
    track: "shared",
    defaultTitle: "技术书阅读计划",
    defaultCategory: "阅读 / 摘要 / 输出",
    defaultImportance: 2,
    defaultWeeklyHours: 4,
    descriptionHint: "例如：每周阅读 2 章，输出关键概念和实践清单。",
    suggestions: ["章节摘要", "关键概念", "实践清单", "读书复盘"],
  },
  {
    key: "custom",
    label: "自定义目标",
    domain: "自定义",
    track: "shared",
    defaultTitle: "",
    defaultCategory: "",
    defaultImportance: 3,
    defaultWeeklyHours: 5,
    descriptionHint: "写清楚目标、当前基础、投入节奏和完成标准。",
    suggestions: [],
  },
];

export const masteryWeight: Record<Mastery, number> = {
  未学: 0,
  初学: 1,
  理解: 2,
  熟练: 3,
  可讲解: 4,
};

export const masteryBaseScore: Record<Mastery, number> = {
  未学: 5,
  初学: 25,
  理解: 55,
  熟练: 78,
  可讲解: 92,
};

export const reviewIntervals = [1, 3, 7, 14, 30];

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(baseIso: string, days: number) {
  const [year, month, day] = baseIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function masteryFromScore(score: number): Mastery {
  const normalized = clampScore(score);
  if (normalized < 20) return "未学";
  if (normalized < 40) return "初学";
  if (normalized < 65) return "理解";
  if (normalized < 85) return "熟练";
  return "可讲解";
}

function asMastery(value: unknown, fallback: Mastery = "初学"): Mastery {
  return value === "未学" ||
    value === "初学" ||
    value === "理解" ||
    value === "熟练" ||
    value === "可讲解"
    ? value
    : fallback;
}

function daysUntil(targetIso?: string, baseIso = todayIso()) {
  if (!targetIso) return null;
  const target = new Date(`${targetIso}T00:00:00`).getTime();
  const base = new Date(`${baseIso}T00:00:00`).getTime();
  if (Number.isNaN(target) || Number.isNaN(base)) return null;
  return Math.ceil((target - base) / 86_400_000);
}

function daysSince(dateIso?: string, baseIso = todayIso()) {
  if (!dateIso) return null;
  const days = daysUntil(dateIso, baseIso);
  return days === null ? null : -days;
}

export function getWeekStartIso(base = new Date()) {
  const date = new Date(base);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function splitList(value: string) {
  return value
    .split(/[\n,，、;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function cleanUnique(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asTrack(value: unknown, fallback: Track = "shared"): Track {
  return value === "kaoyan" || value === "career" || value === "shared"
    ? value
    : fallback;
}

function inferTrackFromDomain(domain = ""): Track {
  if (/考研|408|升学/.test(domain)) return "kaoyan";
  if (/就业|实习|项目|前端|后端|Java|算法|面试|简历/.test(domain)) return "career";
  return "shared";
}

function asGoalImportance(value: unknown, fallback: GoalImportance = 3): GoalImportance {
  if (typeof value === "number") {
    return Math.min(5, Math.max(1, Math.round(value))) as GoalImportance;
  }
  if (value === "高") return 5;
  if (value === "中") return 3;
  if (value === "低") return 2;
  return fallback;
}

export function getGoalTemplate(templateKey: string) {
  return goalTemplates.find((template) => template.key === templateKey) ?? goalTemplates[0];
}

export function normalizeGoal(goal: Partial<Goal>): Goal {
  const template = getGoalTemplate(String(goal.templateKey || "custom"));
  const legacyTrack = asTrack(goal.track, template.track);
  const domain = String(
    goal.domain || (goal.templateKey ? template.domain : trackShortLabels[legacyTrack]) || goal.category || "自定义",
  ).trim();
  const track = asTrack(goal.track, inferTrackFromDomain(domain));
  const fallbackImportance: GoalImportance =
    track === "kaoyan" ? 5 : track === "career" ? 4 : template.defaultImportance;
  const now = todayIso();
  return {
    id: goal.id || uid("goal"),
    title: String(goal.title || template.defaultTitle || "未命名目标").trim(),
    type: goal.type === "custom" || template.key === "custom" ? "custom" : "template",
    templateKey: goal.templateKey || template.key,
    domain,
    importance: asGoalImportance(goal.importance, fallbackImportance),
    track,
    category: String(goal.category || template.defaultCategory || domain).trim(),
    deadline: goal.deadline || "",
    weeklyHours:
      typeof goal.weeklyHours === "number" && Number.isFinite(goal.weeklyHours)
        ? Math.max(0, goal.weeklyHours)
        : template.defaultWeeklyHours,
    currentLevel: goal.currentLevel || "",
    progress:
      typeof goal.progress === "number" && Number.isFinite(goal.progress)
        ? Math.min(100, Math.max(0, Math.round(goal.progress)))
        : 0,
    priorityScore:
      typeof goal.priorityScore === "number" && Number.isFinite(goal.priorityScore)
        ? goal.priorityScore
        : undefined,
    status:
      goal.status === "已完成" || goal.status === "暂停" || goal.status === "放弃"
        ? goal.status
        : "进行中",
    description: String(goal.description || "").trim(),
    linkedKnowledge: Array.isArray(goal.linkedKnowledge) ? goal.linkedKnowledge : [],
    createdAt: goal.createdAt || now,
    updatedAt: goal.updatedAt || goal.createdAt || now,
  };
}

function normalizeKnowledgePoint(point: Partial<KnowledgePoint>): KnowledgePoint {
  const manualMastery = asMastery(point.mastery, "初学");
  const score =
    typeof point.masteryScore === "number" && Number.isFinite(point.masteryScore)
      ? clampScore(point.masteryScore)
      : masteryBaseScore[manualMastery];
  const now = todayIso();

  return {
    id: point.id || uid("kp"),
    name: String(point.name || "未命名知识点").trim(),
    noteIds: Array.isArray(point.noteIds) ? point.noteIds : [],
    goalIds: Array.isArray(point.goalIds) ? point.goalIds : [],
    tracks:
      Array.isArray(point.tracks) && point.tracks.length
        ? point.tracks.map((track) => asTrack(track))
        : ["shared"],
    mastery: manualMastery,
    masteryScore: score,
    evidenceCount:
      typeof point.evidenceCount === "number" && Number.isFinite(point.evidenceCount)
        ? Math.max(0, Math.round(point.evidenceCount))
        : 0,
    systemMastery: masteryFromScore(score),
    lastTestScore:
      typeof point.lastTestScore === "number" && Number.isFinite(point.lastTestScore)
        ? clampScore(point.lastTestScore)
        : undefined,
    lastReviewedAt: point.lastReviewedAt,
    repeatedMistakeCount:
      typeof point.repeatedMistakeCount === "number" && Number.isFinite(point.repeatedMistakeCount)
        ? Math.max(0, Math.round(point.repeatedMistakeCount))
        : 0,
    reviewPriority:
      point.reviewPriority === "高" || point.reviewPriority === "中" || point.reviewPriority === "低"
        ? point.reviewPriority
        : "中",
    reason: String(point.reason || ""),
    updatedAt: point.updatedAt || now,
  };
}

function normalizeMilestone(milestone: Partial<Milestone>): Milestone {
  const now = todayIso();
  const status =
    milestone.status === "未开始" ||
    milestone.status === "进行中" ||
    milestone.status === "完成" ||
    milestone.status === "延期"
      ? milestone.status
      : "未开始";

  return {
    id: milestone.id || uid("milestone"),
    goalId: milestone.goalId || "",
    title: String(milestone.title || "未命名里程碑").trim(),
    description: String(milestone.description || "").trim(),
    deadline: milestone.deadline || addDaysIso(now, 14),
    status,
    progress:
      typeof milestone.progress === "number" && Number.isFinite(milestone.progress)
        ? clampScore(milestone.progress)
        : status === "完成"
          ? 100
          : 0,
    createdAt: milestone.createdAt || now,
    updatedAt: milestone.updatedAt || milestone.createdAt || now,
  };
}

function normalizeQuestion(question: Partial<Question>): Question {
  const difficulty =
    typeof question.difficulty === "number" && Number.isFinite(question.difficulty)
      ? (Math.min(5, Math.max(1, Math.round(question.difficulty))) as Question["difficulty"])
      : 3;
  const type =
    question.type === "选择题" ||
    question.type === "简答题" ||
    question.type === "面试题" ||
    question.type === "费曼讲解题"
      ? question.type
      : "简答题";
  const source =
    question.source === "AI生成" ||
    question.source === "手动创建" ||
    question.source === "错题转化"
      ? question.source
      : "手动创建";

  return {
    id: question.id || uid("question"),
    goalId: question.goalId,
    noteId: question.noteId,
    knowledgePointIds: Array.isArray(question.knowledgePointIds)
      ? question.knowledgePointIds
      : [],
    type,
    question: String(question.question || "未填写题干").trim(),
    answer: String(question.answer || "").trim(),
    difficulty,
    source,
    createdAt: question.createdAt || todayIso(),
  };
}

function normalizeAttempt(attempt: Partial<AnswerAttempt>): AnswerAttempt {
  return {
    id: attempt.id || uid("attempt"),
    questionId: attempt.questionId || "",
    score:
      typeof attempt.score === "number" && Number.isFinite(attempt.score)
        ? clampScore(attempt.score)
        : 0,
    answerText: String(attempt.answerText || "").trim(),
    feedback: String(attempt.feedback || "").trim(),
    createdAt: attempt.createdAt || todayIso(),
  };
}

function normalizeMistake(mistake: Partial<Mistake>): Mistake {
  const now = todayIso();
  return {
    id: mistake.id || uid("mistake"),
    questionId: mistake.questionId || "",
    goalId: mistake.goalId,
    noteId: mistake.noteId,
    knowledgePointIds: Array.isArray(mistake.knowledgePointIds) ? mistake.knowledgePointIds : [],
    title: String(mistake.title || "未命名错题").trim(),
    reason: String(mistake.reason || "").trim(),
    repeatedCount:
      typeof mistake.repeatedCount === "number" && Number.isFinite(mistake.repeatedCount)
        ? Math.max(1, Math.round(mistake.repeatedCount))
        : 1,
    status: mistake.status === "已复习" ? "已复习" : "待复习",
    createdAt: mistake.createdAt || now,
    updatedAt: mistake.updatedAt || mistake.createdAt || now,
  };
}

function normalizeRecommendation(recommendation: Partial<Recommendation>): Recommendation {
  return {
    id: recommendation.id || uid("rec"),
    title: String(recommendation.title || "学习建议").trim(),
    actionType:
      recommendation.actionType === "复习" ||
      recommendation.actionType === "做题" ||
      recommendation.actionType === "写笔记" ||
      recommendation.actionType === "推进计划" ||
      recommendation.actionType === "复盘" ||
      recommendation.actionType === "项目实践"
        ? recommendation.actionType
        : "复习",
    goalId: recommendation.goalId,
    noteId: recommendation.noteId,
    knowledgePointId: recommendation.knowledgePointId,
    priorityScore:
      typeof recommendation.priorityScore === "number" &&
      Number.isFinite(recommendation.priorityScore)
        ? Math.max(0, Math.round(recommendation.priorityScore))
        : 0,
    reasons: Array.isArray(recommendation.reasons) ? recommendation.reasons : [],
    status:
      recommendation.status === "已接受" ||
      recommendation.status === "已完成" ||
      recommendation.status === "忽略"
        ? recommendation.status
        : "待处理",
    createdAt: recommendation.createdAt || todayIso(),
  };
}

function normalizeStudyEvent(event: Partial<StudyEvent>): StudyEvent {
  const type =
    event.type === "imported_resource" ||
    event.type === "completed_plan" ||
    event.type === "completed_review" ||
    event.type === "answered_question" ||
    event.type === "created_reflection" ||
    event.type === "updated_goal" ||
    event.type === "created_milestone" ||
    event.type === "created_question" ||
    event.type === "created_mistake" ||
    event.type === "generated_learning_path"
      ? event.type
      : "created_note";

  return {
    id: event.id || uid("event"),
    type,
    goalId: event.goalId,
    noteId: event.noteId,
    knowledgePointId: event.knowledgePointId,
    score:
      typeof event.score === "number" && Number.isFinite(event.score)
        ? Math.round(event.score)
        : undefined,
    title: String(event.title || "学习事件").trim(),
    createdAt: event.createdAt || todayIso(),
  };
}

function asResourceType(value: unknown, fallback: ResourceType = "txt"): ResourceType {
  return value === "markdown" ||
    value === "txt" ||
    value === "pdf" ||
    value === "web" ||
    value === "docx"
    ? value
    : fallback;
}

function normalizeResource(resource: Partial<Resource>): Resource {
  const now = todayIso();
  const status =
    resource.status === "待解析" || resource.status === "解析失败" ? resource.status : "已解析";
  return {
    id: resource.id || uid("resource"),
    title: String(resource.title || resource.fileName || resource.sourceName || "未命名资料").trim(),
    type: asResourceType(resource.type),
    goalId: resource.goalId,
    sourceName: resource.sourceName,
    fileName: resource.fileName,
    contentText: String(resource.contentText || ""),
    status,
    createdAt: resource.createdAt || now,
    updatedAt: resource.updatedAt || resource.createdAt || now,
  };
}

function normalizeResourceChunk(chunk: Partial<ResourceChunk>): ResourceChunk {
  return {
    id: chunk.id || uid("chunk"),
    resourceId: chunk.resourceId || "",
    goalId: chunk.goalId,
    title: String(chunk.title || "资料分段").trim(),
    content: String(chunk.content || "").trim(),
    orderIndex:
      typeof chunk.orderIndex === "number" && Number.isFinite(chunk.orderIndex)
        ? Math.max(0, Math.round(chunk.orderIndex))
        : 0,
    summary: chunk.summary ? String(chunk.summary) : undefined,
    knowledgePointIds: Array.isArray(chunk.knowledgePointIds) ? chunk.knowledgePointIds : [],
    createdAt: chunk.createdAt || todayIso(),
  };
}

function normalizeSearchDocument(document: Partial<SearchDocument>): SearchDocument {
  const sourceType =
    document.sourceType === "note" ||
    document.sourceType === "resource" ||
    document.sourceType === "question" ||
    document.sourceType === "mistake" ||
    document.sourceType === "knowledge" ||
    document.sourceType === "goal" ||
    document.sourceType === "milestone" ||
    document.sourceType === "reflection"
      ? document.sourceType
      : "note";
  return {
    id: document.id || uid("search"),
    sourceType,
    sourceId: document.sourceId || "",
    goalId: document.goalId,
    title: String(document.title || "检索文档").trim(),
    content: String(document.content || "").trim(),
    keywords: Array.isArray(document.keywords) ? cleanUnique(document.keywords.map(String)) : [],
    embedding:
      Array.isArray(document.embedding) && document.embedding.length
        ? normalizeVector(document.embedding)
        : buildLocalEmbedding(
            `${document.title || ""}\n${document.content || ""}\n${
              Array.isArray(document.keywords) ? document.keywords.join(" ") : ""
            }`,
          ),
    updatedAt: document.updatedAt || todayIso(),
  };
}

function normalizeLearningPath(path: Partial<LearningPath>): LearningPath {
  const now = todayIso();
  const status =
    path.status === "执行中" || path.status === "完成" || path.status === "暂停"
      ? path.status
      : "草稿";
  return {
    id: path.id || uid("path"),
    goalId: path.goalId || "",
    title: String(path.title || "学习路径").trim(),
    startDate: path.startDate || now,
    endDate: path.endDate || addDaysIso(now, 14),
    status,
    createdAt: path.createdAt || now,
    updatedAt: path.updatedAt || path.createdAt || now,
  };
}

function normalizeLearningPathStep(step: Partial<LearningPathStep>): LearningPathStep {
  const actionType =
    step.actionType === "读资料" ||
    step.actionType === "写笔记" ||
    step.actionType === "复习" ||
    step.actionType === "做题" ||
    step.actionType === "错题复盘" ||
    step.actionType === "项目实践" ||
    step.actionType === "周总结"
      ? step.actionType
      : "读资料";
  const status =
    step.status === "进行中" || step.status === "完成" || step.status === "跳过"
      ? step.status
      : "未开始";
  return {
    id: step.id || uid("path_step"),
    pathId: step.pathId || "",
    goalId: step.goalId || "",
    milestoneId: step.milestoneId,
    title: String(step.title || "学习步骤").trim(),
    actionType,
    sourceId: step.sourceId,
    dueDate: step.dueDate || todayIso(),
    estimatedMinutes:
      typeof step.estimatedMinutes === "number" && Number.isFinite(step.estimatedMinutes)
        ? Math.max(15, Math.round(step.estimatedMinutes))
        : 45,
    status,
    reasons: Array.isArray(step.reasons) ? step.reasons.map(String).filter(Boolean) : [],
  };
}

function normalizeRubric(rubric: Partial<Rubric>): Rubric {
  return {
    id: rubric.id || uid("rubric"),
    questionId: rubric.questionId || "",
    criteria: Array.isArray(rubric.criteria) ? rubric.criteria.map(String).filter(Boolean) : [],
    totalScore:
      typeof rubric.totalScore === "number" && Number.isFinite(rubric.totalScore)
        ? Math.max(1, Math.round(rubric.totalScore))
        : 100,
  };
}

function normalizeAiGradingResult(result: Partial<AiGradingResult>): AiGradingResult {
  return {
    id: result.id || uid("grading"),
    questionId: result.questionId || "",
    attemptId: result.attemptId || "",
    score:
      typeof result.score === "number" && Number.isFinite(result.score)
        ? clampScore(result.score)
        : 0,
    strengths: Array.isArray(result.strengths) ? result.strengths.map(String).filter(Boolean) : [],
    deductions: Array.isArray(result.deductions)
      ? result.deductions.map(String).filter(Boolean)
      : [],
    missingPoints: Array.isArray(result.missingPoints)
      ? result.missingPoints.map(String).filter(Boolean)
      : [],
    misconception: String(result.misconception || "").trim(),
    improvedAnswer: String(result.improvedAnswer || "").trim(),
    nextAction: String(result.nextAction || "").trim(),
    createdAt: result.createdAt || todayIso(),
  };
}

function normalizeKnowledgeRelation(relation: Partial<KnowledgeRelation>): KnowledgeRelation {
  const relationType =
    relation.relationType === "前置" ||
    relation.relationType === "容易混淆" ||
    relation.relationType === "应用于"
      ? relation.relationType
      : "相关";
  return {
    id: relation.id || uid("kp_rel"),
    sourceKnowledgeId: relation.sourceKnowledgeId || "",
    targetKnowledgeId: relation.targetKnowledgeId || "",
    relationType,
    reason: String(relation.reason || "").trim(),
  };
}

function normalizeReviewPolicy(policy: Partial<ReviewPolicy>): ReviewPolicy {
  return {
    id: policy.id || uid("review_policy"),
    userId: policy.userId,
    name: String(policy.name || "默认自适应复习策略").trim(),
    baseIntervals:
      Array.isArray(policy.baseIntervals) && policy.baseIntervals.length
        ? policy.baseIntervals
            .map((interval) => Math.max(1, Math.round(Number(interval) || 1)))
            .slice(0, 8)
        : reviewIntervals,
    lowScoreInterval:
      typeof policy.lowScoreInterval === "number" && Number.isFinite(policy.lowScoreInterval)
        ? Math.max(1, Math.round(policy.lowScoreInterval))
        : 1,
    highScoreMultiplier:
      typeof policy.highScoreMultiplier === "number" && Number.isFinite(policy.highScoreMultiplier)
        ? Math.max(1, policy.highScoreMultiplier)
        : 1.5,
  };
}

function normalizeImportJob(job: Partial<ImportJob>): ImportJob {
  const status =
    job.status === "等待中" || job.status === "解析中" || job.status === "失败"
      ? job.status
      : "已完成";
  const step =
    job.step === "上传" ||
    job.step === "提取文本" ||
    job.step === "分段" ||
    job.step === "总结"
      ? job.step
      : "生成题目";
  const now = todayIso();
  return {
    id: job.id || uid("import_job"),
    resourceId: job.resourceId || "",
    status,
    step,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt || now,
    updatedAt: job.updatedAt || job.createdAt || now,
  };
}

export function normalizeState(state: Partial<AppState>): AppState {
  const goals = (Array.isArray(state.goals) ? state.goals : []).map(normalizeGoal);
  const notes = (Array.isArray(state.notes) ? state.notes : []).map((note) => ({
    ...note,
    tracks: Array.isArray(note.tracks) && note.tracks.length ? note.tracks.map((track) => asTrack(track)) : ["shared"],
    associatedGoalIds: Array.isArray(note.associatedGoalIds) ? note.associatedGoalIds : [],
    reviewRecords: Array.isArray(note.reviewRecords) ? note.reviewRecords : [],
    coreConcepts: Array.isArray(note.coreConcepts) ? note.coreConcepts : [],
    commonQuestions: Array.isArray(note.commonQuestions) ? note.commonQuestions : [],
    relatedNoteIds: Array.isArray(note.relatedNoteIds) ? note.relatedNoteIds : [],
  })) as Note[];
  return {
    notes,
    resources: (Array.isArray(state.resources) ? state.resources : []).map(normalizeResource),
    resourceChunks: (Array.isArray(state.resourceChunks) ? state.resourceChunks : []).map(
      normalizeResourceChunk,
    ),
    searchDocuments: (Array.isArray(state.searchDocuments) ? state.searchDocuments : []).map(
      normalizeSearchDocument,
    ),
    learningPaths: (Array.isArray(state.learningPaths) ? state.learningPaths : []).map(
      normalizeLearningPath,
    ),
    learningPathSteps: (Array.isArray(state.learningPathSteps) ? state.learningPathSteps : []).map(
      normalizeLearningPathStep,
    ),
    knowledgePoints: (Array.isArray(state.knowledgePoints) ? state.knowledgePoints : []).map(
      normalizeKnowledgePoint,
    ),
    milestones: (Array.isArray(state.milestones) ? state.milestones : []).map(
      normalizeMilestone,
    ),
    plans: (Array.isArray(state.plans) ? state.plans : []).map((plan) => ({
      ...plan,
      track: asTrack(plan.track),
    })) as StudyPlan[],
    reviewReminders: (Array.isArray(state.reviewReminders) ? state.reviewReminders : []) as ReviewReminder[],
    reflections: (Array.isArray(state.reflections) ? state.reflections : []).map((reflection) => ({
      ...reflection,
      goalFocusIds: Array.isArray(reflection.goalFocusIds) ? reflection.goalFocusIds : [],
    })),
    goals,
    projects: (Array.isArray(state.projects) ? state.projects : []).map((project) => ({
      ...project,
      track: asTrack(project.track),
      techStack: Array.isArray(project.techStack) ? project.techStack : [],
      goalIds: Array.isArray(project.goalIds) ? project.goalIds : [],
      knowledgePointIds: Array.isArray(project.knowledgePointIds) ? project.knowledgePointIds : [],
      linkedNoteIds: Array.isArray(project.linkedNoteIds) ? project.linkedNoteIds : [],
    })) as AppState["projects"],
    questions: (Array.isArray(state.questions) ? state.questions : []).map(normalizeQuestion),
    answerAttempts: (Array.isArray(state.answerAttempts) ? state.answerAttempts : []).map(
      normalizeAttempt,
    ),
    mistakes: (Array.isArray(state.mistakes) ? state.mistakes : []).map(normalizeMistake),
    recommendations: (
      Array.isArray(state.recommendations) ? state.recommendations : []
    ).map(normalizeRecommendation),
    studyEvents: (Array.isArray(state.studyEvents) ? state.studyEvents : []).map(
      normalizeStudyEvent,
    ),
    rubrics: (Array.isArray(state.rubrics) ? state.rubrics : []).map(normalizeRubric),
    aiGradingResults: (
      Array.isArray(state.aiGradingResults) ? state.aiGradingResults : []
    ).map(normalizeAiGradingResult),
    knowledgeRelations: (
      Array.isArray(state.knowledgeRelations) ? state.knowledgeRelations : []
    ).map(normalizeKnowledgeRelation),
    reviewPolicies: (Array.isArray(state.reviewPolicies) ? state.reviewPolicies : []).map(
      normalizeReviewPolicy,
    ),
    importJobs: (Array.isArray(state.importJobs) ? state.importJobs : []).map(
      normalizeImportJob,
    ),
  };
}

export function dueReminders(reminders: ReviewReminder[], base = todayIso()) {
  return reminders
    .filter((reminder) => reminder.status === "待复习" && reminder.dueAt <= base)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function upcomingReminders(reminders: ReviewReminder[], base = todayIso()) {
  return reminders
    .filter((reminder) => reminder.status === "待复习" && reminder.dueAt > base)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export interface GoalInsight {
  goal: Goal;
  priorityScore: number;
  reasons: string[];
  noteCount: number;
  knowledgeCount: number;
  milestoneCount: number;
  overdueMilestoneCount: number;
  dueReviewCount: number;
  mistakeCount: number;
  activePlanCount: number;
  completedPlanCount: number;
  planCompletionRate: number;
  systemProgress: number;
  progressGap: number;
  averageMastery: string;
  averageMasteryScore: number;
  risk: string;
  daysLeft: number | null;
}

export function estimateGoalProgress(state: AppState, goalId: string) {
  const normalized = normalizeState(state);
  const relatedMilestones = normalized.milestones.filter((milestone) => milestone.goalId === goalId);
  const relatedPlans = normalized.plans.filter((plan) => plan.goalId === goalId);
  const relatedKnowledge = normalized.knowledgePoints.filter((point) =>
    point.goalIds.includes(goalId),
  );

  const milestoneProgress =
    relatedMilestones.length === 0
      ? null
      : relatedMilestones.reduce((sum, milestone) => sum + milestone.progress, 0) /
        relatedMilestones.length;
  const planProgress =
    relatedPlans.length === 0
      ? null
      : (relatedPlans.filter((plan) => plan.status === "完成").length / relatedPlans.length) * 100;
  const masteryProgress =
    relatedKnowledge.length === 0
      ? null
      : relatedKnowledge.reduce((sum, point) => sum + point.masteryScore, 0) /
        relatedKnowledge.length;

  const weightedParts = [
    milestoneProgress === null ? null : { value: milestoneProgress, weight: 0.4 },
    planProgress === null ? null : { value: planProgress, weight: 0.3 },
    masteryProgress === null ? null : { value: masteryProgress, weight: 0.3 },
  ].filter(Boolean) as Array<{ value: number; weight: number }>;

  if (weightedParts.length === 0) {
    return normalized.goals.find((goal) => goal.id === goalId)?.progress ?? 0;
  }

  const totalWeight = weightedParts.reduce((sum, item) => sum + item.weight, 0);
  return clampScore(
    weightedParts.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight,
  );
}

export function buildGoalInsights(state: AppState, baseIso = todayIso()): GoalInsight[] {
  const normalized = normalizeState(state);
  const due = dueReminders(normalized.reviewReminders, baseIso);

  return normalized.goals
    .map((goal) => {
      const relatedNotes = normalized.notes.filter((note) =>
        note.associatedGoalIds.includes(goal.id),
      );
      const relatedKnowledge = normalized.knowledgePoints.filter((point) =>
        point.goalIds.includes(goal.id),
      );
      const relatedKnowledgeIds = new Set(relatedKnowledge.map((point) => point.id));
      const relatedMilestones = normalized.milestones.filter(
        (milestone) => milestone.goalId === goal.id,
      );
      const relatedPlans = normalized.plans.filter((plan) => plan.goalId === goal.id);
      const activePlans = relatedPlans.filter((plan) => plan.status !== "完成");
      const completedPlans = relatedPlans.filter((plan) => plan.status === "完成");
      const overdueMilestones = relatedMilestones.filter(
        (milestone) => milestone.status !== "完成" && milestone.deadline < baseIso,
      );
      const relatedMistakes = normalized.mistakes.filter((mistake) => {
        if (mistake.goalId === goal.id) return true;
        if (mistake.knowledgePointIds.some((id) => relatedKnowledgeIds.has(id))) return true;
        const note = normalized.notes.find((item) => item.id === mistake.noteId);
        return note?.associatedGoalIds.includes(goal.id) ?? false;
      });
      const relatedQuestions = normalized.questions.filter((question) => {
        if (question.goalId === goal.id) return true;
        if (question.knowledgePointIds.some((id) => relatedKnowledgeIds.has(id))) return true;
        const note = normalized.notes.find((item) => item.id === question.noteId);
        return note?.associatedGoalIds.includes(goal.id) ?? false;
      });
      const relatedQuestionIds = new Set(relatedQuestions.map((question) => question.id));
      const relatedAttempts = normalized.answerAttempts.filter((attempt) =>
        relatedQuestionIds.has(attempt.questionId),
      );
      const relatedDue = due.filter((reminder) => {
        if (reminder.goalId === goal.id) return true;
        const note = normalized.notes.find((item) => item.id === reminder.noteId);
        return note?.associatedGoalIds.includes(goal.id) ?? false;
      });
      const lowMasteryNotes = relatedNotes.filter(
        (note) => note.mastery === "未学" || note.mastery === "初学",
      );
      const lowMasteryKnowledge = relatedKnowledge.filter((point) => point.masteryScore < 40);
      const daysLeft = daysUntil(goal.deadline, baseIso);
      const reasons: string[] = [];

      let deadlineUrgency = 0;
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          deadlineUrgency = 40;
          reasons.push("已过截止");
        } else if (daysLeft <= 7) {
          deadlineUrgency = 30;
          reasons.push("7 天内截止");
        } else if (daysLeft <= 30) {
          deadlineUrgency = 15;
          reasons.push("30 天内截止");
        } else if (daysLeft <= 90) {
          deadlineUrgency = 5;
        }
      }

      const weakKnowledgeScore = Math.min(20, lowMasteryNotes.length * 6);
      if (weakKnowledgeScore > 0) reasons.push(`${lowMasteryNotes.length} 篇低掌握笔记`);

      const lowKnowledgeScore = Math.min(25, lowMasteryKnowledge.length * 8);
      if (lowMasteryKnowledge.length > 0) {
        reasons.push(`${lowMasteryKnowledge.length} 个低掌握知识点`);
      }

      const overduePlanCount = activePlans.filter((plan) => plan.dueDate < baseIso).length;
      const overduePlanScore = Math.min(20, overduePlanCount * 10);
      if (overduePlanCount > 0) reasons.push(`${overduePlanCount} 项计划延期`);

      const overdueMilestoneScore = Math.min(25, overdueMilestones.length * 12);
      if (overdueMilestones.length > 0) reasons.push(`${overdueMilestones.length} 个里程碑延期`);

      const dueReviewScore = Math.min(20, relatedDue.length * 5);
      if (relatedDue.length > 0) reasons.push(`${relatedDue.length} 个到期复习`);

      const repeatedMistakeCount = relatedMistakes.filter((mistake) => mistake.repeatedCount > 1).length;
      const mistakeScore = Math.min(
        25,
        relatedMistakes.length * 6 + repeatedMistakeCount * 5,
      );
      if (relatedMistakes.length > 0) reasons.push(`${relatedMistakes.length} 道错题待复盘`);

      const latestTestScore = relatedAttempts.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )[0]?.score;
      const lowTestScore = latestTestScore !== undefined && latestTestScore < 60 ? 12 : 0;
      if (lowTestScore > 0) reasons.push(`最近自测 ${latestTestScore} 分`);

      const activityDates = [
        ...relatedNotes.map((note) => note.updatedAt || note.createdAt),
        ...relatedPlans.map((plan) => plan.createdAt || plan.dueDate),
        ...relatedMilestones.map((milestone) => milestone.updatedAt || milestone.createdAt),
        ...relatedAttempts.map((attempt) => attempt.createdAt),
      ].filter(Boolean);
      const latestActivity = activityDates.sort().at(-1);
      const inactiveDays = daysSince(latestActivity, baseIso);
      const inactivityScore = inactiveDays === null || inactiveDays >= 7 ? 15 : 0;
      if (inactivityScore > 0) reasons.push(inactiveDays === null ? "尚未推进" : `${inactiveDays} 天未推进`);

      if (goal.importance >= 5) reasons.push("核心目标");
      if (goal.importance === 4) reasons.push("重要目标");

      const priorityScore =
        goal.importance * 20 +
        deadlineUrgency +
        weakKnowledgeScore +
        lowKnowledgeScore +
        overduePlanScore +
        overdueMilestoneScore +
        dueReviewScore +
        mistakeScore +
        lowTestScore +
        inactivityScore;

      const planCompletionRate =
        relatedPlans.length === 0
          ? 0
          : Math.round((completedPlans.length / relatedPlans.length) * 100);

      const averageMasteryScore =
        relatedKnowledge.length === 0
          ? relatedNotes.length === 0
            ? 0
            : clampScore(
                relatedNotes.reduce((sum, note) => sum + masteryBaseScore[note.mastery], 0) /
                  relatedNotes.length,
              )
          : clampScore(
              relatedKnowledge.reduce((sum, point) => sum + point.masteryScore, 0) /
                relatedKnowledge.length,
            );
      const averageMastery =
        relatedKnowledge.length === 0 && relatedNotes.length === 0
          ? "未积累"
          : masteryFromScore(averageMasteryScore);
      const systemProgress = estimateGoalProgress(normalized, goal.id);
      const progressGap = Math.abs(goal.progress - systemProgress);

      const risk =
        relatedNotes.length === 0
          ? "还没有关联笔记，目标缺少学习记录。"
          : overdueMilestones.length > 0
            ? "里程碑已经延期，建议先把阶段目标重新拆小。"
            : relatedMistakes.length > 0
              ? "错题仍未复盘，会拉低真实掌握度。"
              : relatedDue.length > 0
                ? "存在到期复习，需要先处理记忆回路。"
                : relatedPlans.length > 0 && planCompletionRate < 50
                  ? "计划完成率偏低，建议收敛任务数量。"
                  : lowMasteryKnowledge.length > 0 || lowMasteryNotes.length > 0
                    ? "低掌握内容偏多，建议安排输出型自测。"
                    : progressGap >= 25
                      ? `手动进度 ${goal.progress}% 与系统估算 ${systemProgress}% 差距较大，建议校准预期。`
                      : goal.progress < 30 && goal.importance >= 4
                        ? "核心目标进度偏低，需要拆出本周动作。"
                        : "节奏正常，继续保持复盘。";

      return {
        goal: { ...goal, priorityScore },
        priorityScore,
        reasons: cleanUnique(reasons).slice(0, 4),
        noteCount: relatedNotes.length,
        knowledgeCount: relatedKnowledge.length,
        milestoneCount: relatedMilestones.length,
        overdueMilestoneCount: overdueMilestones.length,
        dueReviewCount: relatedDue.length,
        mistakeCount: relatedMistakes.length,
        activePlanCount: activePlans.length,
        completedPlanCount: completedPlans.length,
        planCompletionRate,
        systemProgress,
        progressGap,
        averageMastery,
        averageMasteryScore,
        risk,
        daysLeft,
      };
    })
    .sort((a, b) => {
      if (a.goal.status !== b.goal.status) {
        if (a.goal.status === "进行中") return -1;
        if (b.goal.status === "进行中") return 1;
      }
      return b.priorityScore - a.priorityScore;
    });
}

export function inferReviewPriority(note: Note): Importance {
  if (note.importance === "高") return "高";
  if (note.tracks.includes("shared")) return "高";
  if (note.mastery === "未学" || note.mastery === "初学") return "高";
  return note.importance;
}

export function extractConcepts(note: Note) {
  const explicit = note.coreConcepts;
  const titleHints = note.title
    .replace(/[：:]/g, " ")
    .split(/\s+/)
    .filter((item) => item.length >= 2 && item.length <= 24);
  return cleanUnique([...explicit, ...titleHints]).slice(0, 12);
}

export function buildReviewSchedule(note: Note, existing: ReviewReminder[]) {
  const today = todayIso();
  const preserved = existing.filter(
    (reminder) => reminder.noteId !== note.id || reminder.status !== "待复习",
  );
  const pending = reviewIntervals.map((intervalDays) => ({
    id: uid("review"),
    noteId: note.id,
    goalId: note.associatedGoalIds[0],
    conceptName: note.coreConcepts[0],
    dueAt: addDaysIso(today, intervalDays),
    intervalDays,
    status: "待复习" as const,
    createdAt: today,
  }));
  return [...preserved, ...pending];
}

export function upsertKnowledgeFromNote(
  note: Note,
  knowledgePoints: KnowledgePoint[],
  goals: Goal[],
) {
  const concepts = extractConcepts(note);
  const updated = [...knowledgePoints];
  const now = todayIso();
  const inferredGoalIds =
    note.associatedGoalIds.length > 0
      ? note.associatedGoalIds
      : goals
          .filter((goal) => note.tracks.includes(goal.track) || note.tracks.includes("shared"))
          .map((goal) => goal.id);

  concepts.forEach((conceptName) => {
    const index = updated.findIndex(
      (point) => point.name.toLowerCase() === conceptName.toLowerCase(),
    );
    const priority = inferReviewPriority(note);
    if (index >= 0) {
      const point = normalizeKnowledgePoint(updated[index]);
      const nextScore = Math.min(point.masteryScore, masteryBaseScore[note.mastery]);
      updated[index] = {
        ...point,
        noteIds: cleanUnique([...point.noteIds, note.id]),
        goalIds: cleanUnique([...point.goalIds, ...inferredGoalIds]),
        tracks: cleanUnique([...point.tracks, ...note.tracks]) as Track[],
        mastery:
          masteryWeight[note.mastery] < masteryWeight[point.mastery] ? note.mastery : point.mastery,
        masteryScore: nextScore,
        systemMastery: masteryFromScore(nextScore),
        reviewPriority: priority === "高" ? "高" : point.reviewPriority,
        reason: buildKnowledgeReason(note, priority),
        updatedAt: now,
      };
      return;
    }

    updated.push({
      id: uid("kp"),
      name: conceptName,
      noteIds: [note.id],
      goalIds: inferredGoalIds,
      tracks: note.tracks,
      mastery: note.mastery,
      masteryScore: masteryBaseScore[note.mastery],
      evidenceCount: 0,
      systemMastery: masteryFromScore(masteryBaseScore[note.mastery]),
      repeatedMistakeCount: 0,
      reviewPriority: priority,
      reason: buildKnowledgeReason(note, priority),
      updatedAt: now,
    });
  });

  return updated;
}

function buildKnowledgeReason(note: Note, priority: Importance) {
  if (note.tracks.includes("shared")) {
    return "同时服务考研和就业，复习收益高";
  }
  if (priority === "高") {
    return `${note.importance}重要度，当前掌握程度为${note.mastery}`;
  }
  return `来自《${note.title}》`;
}

export function planFromNoteAction(note: Note): StudyPlan | null {
  if (!note.nextAction.trim()) return null;
  const today = todayIso();
  return {
    id: uid("plan"),
    title: note.nextAction.trim(),
    scope: "下周",
    category: note.direction || note.type,
    track: note.tracks.includes("shared") ? "shared" : note.tracks[0],
    dueDate: addDaysIso(today, 7),
    status: "未开始",
    source: "笔记行动",
    noteId: note.id,
    goalId: note.associatedGoalIds[0],
    createdAt: today,
  };
}

export function nextIntervalByScore(score: number, previousInterval: number) {
  if (score <= 2) return 1;
  if (score === 3) return Math.max(3, previousInterval);
  const index = reviewIntervals.findIndex((interval) => interval > previousInterval);
  return index >= 0 ? reviewIntervals[index] : 30;
}

export function createStudyEvent(
  event: Omit<StudyEvent, "id" | "createdAt"> & { createdAt?: string },
): StudyEvent {
  return {
    id: uid("event"),
    type: event.type,
    goalId: event.goalId,
    noteId: event.noteId,
    knowledgePointId: event.knowledgePointId,
    score: event.score,
    title: event.title,
    createdAt: event.createdAt || todayIso(),
  };
}

export interface ResourceImportInput {
  title: string;
  type: ResourceType;
  goalId?: string;
  sourceName?: string;
  fileName?: string;
  contentText: string;
}

export interface LearningTimelineItem {
  id: string;
  date: string;
  type: "计划" | "复习" | "里程碑" | "错题" | "学习路径" | "自测" | "资料";
  title: string;
  goalId?: string;
  sourceId?: string;
  status?: string;
  detail?: string;
}

export function summarizeText(text: string, maxLength = 120) {
  const normalized = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function stripMarkdownSyntax(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(text: string) {
  const normalized = stripMarkdownSyntax(text).toLowerCase();
  const tokens = new Set<string>();
  const matches = normalized.match(/[a-z0-9+#.]{2,}|[\u4e00-\u9fff]{2,}/g) || [];
  matches.forEach((match) => {
    if (/^[\u4e00-\u9fff]+$/.test(match) && match.length > 6) {
      for (let size = 2; size <= 4; size += 1) {
        for (let index = 0; index <= match.length - size; index += 1) {
          tokens.add(match.slice(index, index + size));
        }
      }
      return;
    }
    tokens.add(match);
  });
  return [...tokens].filter((token) => token.length >= 2);
}

export function extractKeywordsFromText(text: string, extra: string[] = [], maxCount = 18) {
  const technicalTerms = text.match(/[A-Z][A-Z0-9+#]{1,}|[A-Za-z]+(?:\.[A-Za-z]+)+/g) || [];
  const headingTerms = text
    .split(/\n+/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length >= 2 && line.length <= 24)
    .slice(0, 8);
  return cleanUnique([...extra, ...technicalTerms, ...headingTerms, ...tokenizeText(text)])
    .filter((keyword) => !/^(的|了|和|是|在|为什么|需要|可以)$/.test(keyword))
    .slice(0, maxCount);
}

const localEmbeddingDimensions = 64;

const semanticAliases: Array<[string, string[]]> = [
  ["不能", ["无法", "不是", "不可以", "做不到"]],
  ["原因", ["为什么", "问题", "根因"]],
  ["两次握手", ["二次握手", "少一次握手", "两次连接确认"]],
  ["三次握手", ["连接建立", "连接确认", "握手过程"]],
  ["历史报文", ["历史连接请求", "旧连接请求", "过期报文", "重复报文"]],
  ["确认", ["验证", "证明", "同步"]],
  ["接收能力", ["收发能力", "接收确认", "客户端接收"]],
  ["初始序列号", ["序列号同步", "ISN", "双方序列号"]],
  ["资源浪费", ["服务端资源", "半连接队列", "无效连接"]],
  ["最左前缀", ["列顺序", "联合索引顺序", "从最左列开始"]],
  ["索引失效", ["无法命中索引", "不走索引", "索引不可用"]],
  ["掌握度", ["掌握分", "熟练度", "学习证据"]],
];

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeVector(vector: number[], dimensions = localEmbeddingDimensions) {
  const normalized = Array.from({ length: dimensions }, (_, index) => {
    const value = Number(vector[index] || 0);
    return Number.isFinite(value) ? value : 0;
  });
  const magnitude = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return normalized;
  return normalized.map((value) => Number((value / magnitude).toFixed(6)));
}

function collectSemanticTokens(text: string) {
  const normalized = stripMarkdownSyntax(text).toLowerCase();
  const tokens = new Set<string>(tokenizeText(normalized));
  const chineseRuns = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  chineseRuns.forEach((run) => {
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= run.length - size; index += 1) {
        tokens.add(run.slice(index, index + size));
      }
    }
  });

  semanticAliases.forEach(([term, aliases]) => {
    const group = [term, ...aliases].map((item) => item.toLowerCase());
    if (group.some((item) => normalized.includes(item))) {
      group.forEach((item) => tokens.add(item));
    }
  });

  return cleanUnique([...tokens]).filter((token) => token.length >= 2);
}

export function buildLocalEmbedding(text: string, dimensions = localEmbeddingDimensions) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = collectSemanticTokens(text);
  tokens.forEach((token) => {
    const hash = hashText(token);
    const index = hash % dimensions;
    const sign = hash & 1 ? 1 : -1;
    const weight = token.length >= 4 ? 1.2 : 1;
    vector[index] += sign * weight;
  });
  return normalizeVector(vector, dimensions);
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index] || 0);
    const rightValue = Number(right[index] || 0);
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function buildAdaptiveLearningPath(
  state: AppState,
  goalId: string,
  options: { startDate?: string; horizonDays?: number } = {},
) {
  const normalized = normalizeState(state);
  const goal = normalized.goals.find((item) => item.id === goalId);
  if (!goal) return null;

  const startDate = options.startDate || todayIso();
  const daysLeft = daysUntil(goal.deadline, startDate);
  const horizonDays = Math.max(
    7,
    Math.min(options.horizonDays || 14, daysLeft === null ? 14 : Math.max(7, daysLeft)),
  );
  const endDate = addDaysIso(startDate, horizonDays - 1);
  const path: LearningPath = {
    id: uid("path"),
    goalId: goal.id,
    title: `${goal.title} ${horizonDays} 天自适应学习路径`,
    startDate,
    endDate,
    status: "草稿",
    createdAt: todayIso(),
    updatedAt: todayIso(),
  };
  const weeklyMinutes = Math.max(3, goal.weeklyHours || 5) * 60;
  const defaultMinutes = Math.max(25, Math.min(90, Math.round(weeklyMinutes / 7)));
  const steps: LearningPathStep[] = [];
  const addStep = (
    step: Omit<
      LearningPathStep,
      "id" | "pathId" | "goalId" | "dueDate" | "status" | "estimatedMinutes"
    > & {
      dueOffset?: number;
      estimatedMinutes?: number;
    },
  ) => {
    if (steps.length >= Math.min(18, horizonDays + 6)) return;
    const dueOffset = step.dueOffset ?? steps.length;
    steps.push({
      id: uid("path_step"),
      pathId: path.id,
      goalId: goal.id,
      milestoneId: step.milestoneId,
      title: step.title,
      actionType: step.actionType,
      sourceId: step.sourceId,
      dueDate: addDaysIso(startDate, Math.min(horizonDays - 1, dueOffset)),
      estimatedMinutes: step.estimatedMinutes || defaultMinutes,
      status: "未开始",
      reasons: step.reasons,
    });
  };

  normalized.resources
    .filter((resource) => !resource.goalId || resource.goalId === goal.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3)
    .forEach((resource, index) =>
      addStep({
        title: `阅读资料并标注重点：${resource.title}`,
        actionType: "读资料",
        sourceId: resource.id,
        dueOffset: index,
        reasons: [
          resource.status === "已解析" ? "资料已解析，可直接进入学习" : `资料状态为${resource.status}`,
          `关联目标「${goal.title}」`,
        ],
      }),
    );

  dueReminders(normalized.reviewReminders, startDate)
    .filter((reminder) => reminder.goalId === goal.id)
    .slice(0, 4)
    .forEach((reminder) => {
      const note = normalized.notes.find((item) => item.id === reminder.noteId);
      addStep({
        title: `复习：${reminder.conceptName || note?.title || "到期内容"}`,
        actionType: "复习",
        sourceId: reminder.id,
        estimatedMinutes: 25,
        reasons: [
          `复习提醒已到期：${reminder.dueAt}`,
          reminder.lastScore !== undefined ? `上次复习得分 ${reminder.lastScore}` : "需要补充复习证据",
        ],
      });
    });

  normalized.knowledgePoints
    .filter((point) => point.goalIds.includes(goal.id) && point.masteryScore < 60)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 5)
    .forEach((point) =>
      addStep({
        title: `专项补强：${point.name}`,
        actionType: "做题",
        sourceId: point.id,
        estimatedMinutes: 45,
        reasons: [
          `系统掌握分 ${point.masteryScore}/100`,
          point.lastTestScore !== undefined ? `最近自测 ${point.lastTestScore} 分` : "尚缺少自测证据",
          point.repeatedMistakeCount ? `重复错题 ${point.repeatedMistakeCount} 次` : "",
        ].filter(Boolean),
      }),
    );

  normalized.mistakes
    .filter((mistake) => mistake.goalId === goal.id && mistake.status === "待复习")
    .sort((a, b) => b.repeatedCount - a.repeatedCount)
    .slice(0, 4)
    .forEach((mistake) =>
      addStep({
        title: `错题复盘：${mistake.title}`,
        actionType: "错题复盘",
        sourceId: mistake.id,
        estimatedMinutes: 35,
        reasons: [`错题重复 ${mistake.repeatedCount} 次`, mistake.reason || "需要补齐错因"],
      }),
    );

  normalized.milestones
    .filter((milestone) => milestone.goalId === goal.id && milestone.status !== "完成")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3)
    .forEach((milestone) =>
      addStep({
        title: `推进里程碑：${milestone.title}`,
        actionType: "写笔记",
        milestoneId: milestone.id,
        sourceId: milestone.id,
        estimatedMinutes: 60,
        reasons: [
          `截止 ${milestone.deadline}`,
          `当前进度 ${milestone.progress}%`,
          milestone.status === "延期" ? "已经延期，需要优先处理" : "",
        ].filter(Boolean),
      }),
    );

  normalized.plans
    .filter((plan) => plan.goalId === goal.id && plan.status !== "完成")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3)
    .forEach((plan) =>
      addStep({
        title: `完成计划：${plan.title}`,
        actionType: plan.source === "自测系统" ? "做题" : "写笔记",
        sourceId: plan.id,
        estimatedMinutes: 45,
        reasons: [`原计划截止 ${plan.dueDate}`, `来源：${plan.source}`],
      }),
    );

  if (steps.length === 0) {
    addStep({
      title: `拆解目标：${goal.title}`,
      actionType: "写笔记",
      estimatedMinutes: 45,
      reasons: ["当前目标缺少可安排的资料、复习、错题和计划，需要先建立学习输入"],
    });
  }

  if (horizonDays >= 7) {
    addStep({
      title: `生成并补充本周复盘：${goal.title}`,
      actionType: "周总结",
      dueOffset: Math.min(horizonDays - 1, 6),
      estimatedMinutes: 30,
      reasons: ["学习路径需要用周总结校准掌握度和下周安排"],
    });
  }

  return { path, steps };
}

export function materializeLearningPathAsPlans(
  path: LearningPath,
  steps: LearningPathStep[],
  goal?: Goal,
): StudyPlan[] {
  return steps.map((step) => ({
    id: uid("plan"),
    title: step.title,
    scope:
      step.dueDate === todayIso()
        ? "今日"
        : step.dueDate <= addDaysIso(todayIso(), 7)
          ? "本周"
          : "下周",
    category: `学习路径 / ${step.actionType}`,
    track: goal?.track || "shared",
    dueDate: step.dueDate,
    status: "未开始",
    source: "学习路径",
    goalId: step.goalId,
    milestoneId: step.milestoneId,
    createdAt: path.createdAt,
  }));
}

export function buildLearningTimeline(state: AppState, baseIso = todayIso()): LearningTimelineItem[] {
  const normalized = normalizeState(state);
  const inRange = (date: string) => date >= addDaysIso(baseIso, -3) && date <= addDaysIso(baseIso, 21);
  const items: LearningTimelineItem[] = [];

  normalized.plans.filter((plan) => inRange(plan.dueDate)).forEach((plan) =>
    items.push({
      id: `timeline_plan_${plan.id}`,
      date: plan.dueDate,
      type: "计划",
      title: plan.title,
      goalId: plan.goalId,
      sourceId: plan.id,
      status: plan.status,
      detail: plan.category,
    }),
  );
  normalized.reviewReminders.filter((reminder) => inRange(reminder.dueAt)).forEach((reminder) =>
    items.push({
      id: `timeline_review_${reminder.id}`,
      date: reminder.dueAt,
      type: "复习",
      title: reminder.conceptName || "复习提醒",
      goalId: reminder.goalId,
      sourceId: reminder.id,
      status: reminder.status,
      detail: `${reminder.intervalDays} 天间隔`,
    }),
  );
  normalized.milestones.filter((milestone) => inRange(milestone.deadline)).forEach((milestone) =>
    items.push({
      id: `timeline_milestone_${milestone.id}`,
      date: milestone.deadline,
      type: "里程碑",
      title: milestone.title,
      goalId: milestone.goalId,
      sourceId: milestone.id,
      status: milestone.status,
      detail: `进度 ${milestone.progress}%`,
    }),
  );
  normalized.mistakes
    .filter((mistake) => mistake.status === "待复习" && inRange(mistake.updatedAt))
    .forEach((mistake) =>
      items.push({
        id: `timeline_mistake_${mistake.id}`,
        date: mistake.updatedAt,
        type: "错题",
        title: mistake.title,
        goalId: mistake.goalId,
        sourceId: mistake.id,
        status: mistake.status,
        detail: `重复 ${mistake.repeatedCount} 次`,
      }),
    );
  normalized.learningPathSteps.filter((step) => inRange(step.dueDate)).forEach((step) =>
    items.push({
      id: `timeline_path_${step.id}`,
      date: step.dueDate,
      type: "学习路径",
      title: step.title,
      goalId: step.goalId,
      sourceId: step.id,
      status: step.status,
      detail: `${step.actionType} · ${step.estimatedMinutes} 分钟`,
    }),
  );
  normalized.resources.filter((resource) => inRange(resource.createdAt)).forEach((resource) =>
    items.push({
      id: `timeline_resource_${resource.id}`,
      date: resource.createdAt,
      type: "资料",
      title: resource.title,
      goalId: resource.goalId,
      sourceId: resource.id,
      status: resource.status,
      detail: resource.type,
    }),
  );

  return items.sort((a, b) => `${a.date}${a.type}`.localeCompare(`${b.date}${b.type}`));
}

export function reviewEvidenceDelta(score: number, mode: "复习" | "自测" | "费曼讲解") {
  let delta = 5;
  if (mode === "自测" && score >= 4) delta += 10;
  if (mode === "费曼讲解") delta += 15;
  if (score <= 2) delta -= 15;
  return delta;
}

export function applyKnowledgeEvidence(
  knowledgePoints: KnowledgePoint[],
  evidence: {
    knowledgePointIds?: string[];
    noteId?: string;
    goalId?: string;
    conceptName?: string;
    delta: number;
    score?: number;
    reviewedAt?: string;
    repeatedMistake?: boolean;
  },
) {
  const ids = new Set(evidence.knowledgePointIds || []);
  const conceptName = evidence.conceptName?.trim().toLowerCase();

  return knowledgePoints.map((rawPoint) => {
    const point = normalizeKnowledgePoint(rawPoint);
    const matched =
      ids.has(point.id) ||
      (evidence.noteId ? point.noteIds.includes(evidence.noteId) : false) ||
      (evidence.goalId ? point.goalIds.includes(evidence.goalId) : false) ||
      (conceptName ? point.name.toLowerCase() === conceptName : false);

    if (!matched) return point;

    const nextScore = clampScore(point.masteryScore + evidence.delta);
    const repeatedMistakeCount =
      (point.repeatedMistakeCount || 0) + (evidence.repeatedMistake ? 1 : 0);
    const reasonParts = [
      point.reason,
      evidence.score !== undefined ? `最近自测 ${evidence.score} 分` : "",
      evidence.repeatedMistake ? "重复错题已扣分" : "",
    ].filter(Boolean);

    return {
      ...point,
      masteryScore: nextScore,
      systemMastery: masteryFromScore(nextScore),
      evidenceCount: point.evidenceCount + 1,
      lastTestScore: evidence.score ?? point.lastTestScore,
      lastReviewedAt: evidence.reviewedAt ?? point.lastReviewedAt,
      repeatedMistakeCount,
      reviewPriority: nextScore < 45 || evidence.repeatedMistake ? "高" : point.reviewPriority,
      reason: cleanUnique(reasonParts).slice(-3).join("；"),
      updatedAt: evidence.reviewedAt || todayIso(),
    };
  });
}

export function generateQuestionsFromNote(
  note: Note,
  knowledgePoints: KnowledgePoint[],
  count = 5,
): Question[] {
  const concepts = extractConcepts(note);
  const linkedPointIds = knowledgePoints
    .filter(
      (point) =>
        point.noteIds.includes(note.id) ||
        concepts.some((concept) => concept.toLowerCase() === point.name.toLowerCase()),
    )
    .map((point) => point.id);
  const basePrompts = cleanUnique([
    ...note.commonQuestions,
    ...concepts.map((concept) => `用自己的话解释「${concept}」，并说明它解决什么问题。`),
    `请把「${note.title}」讲给一个没有背景的人听，并举一个例子。`,
  ]);
  const prompts = basePrompts.length > 0 ? basePrompts : [`请概括「${note.title}」的核心观点。`];
  const types: Question["type"][] = ["简答题", "面试题", "费曼讲解题", "简答题", "面试题"];

  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const prompt = prompts[index % prompts.length];
    const difficulty = Math.min(5, Math.max(1, 2 + (index % 4))) as Question["difficulty"];
    return {
      id: uid("question"),
      goalId: note.associatedGoalIds[0],
      noteId: note.id,
      knowledgePointIds: linkedPointIds,
      type: types[index % types.length],
      question: prompt,
      answer:
        note.summary ||
        note.myUnderstanding ||
        note.content.slice(0, 160) ||
        "需要结合笔记内容，用自己的话说明核心概念、原因和例子。",
      difficulty,
      source: "AI生成",
      createdAt: todayIso(),
    };
  });
}

export function updateKnowledgeAfterQuestionAttempt(
  knowledgePoints: KnowledgePoint[],
  questions: Question[],
  previousAttempts: AnswerAttempt[],
  question: Question,
  attempt: AnswerAttempt,
  repeatedMistake: boolean,
) {
  const relatedPointIds = new Set(question.knowledgePointIds);
  const hadRecentLowScore = previousAttempts
    .filter((previous) => {
      const previousQuestion = questions.find((item) => item.id === previous.questionId);
      if (!previousQuestion) return false;
      return previousQuestion.knowledgePointIds.some((id) => relatedPointIds.has(id));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 1)
    .some((previous) => previous.score < 60);

  let delta = 0;
  if (attempt.score >= 85) delta += 10;
  else if (attempt.score >= 70) delta += 5;
  else if (attempt.score < 60) delta -= 15;
  if (attempt.score < 60 && hadRecentLowScore) delta -= 15;
  if (repeatedMistake) delta -= 20;

  return applyKnowledgeEvidence(knowledgePoints, {
    knowledgePointIds: question.knowledgePointIds,
    noteId: question.noteId,
    goalId: question.goalId,
    delta,
    score: attempt.score,
    reviewedAt: attempt.createdAt,
    repeatedMistake,
  });
}

export function upsertMistakeFromAttempt(
  mistakes: Mistake[],
  question: Question,
  attempt: AnswerAttempt,
) {
  if (attempt.score >= 60) {
    return { mistakes, mistake: null, repeatedMistake: false };
  }

  const existingIndex = mistakes.findIndex((mistake) => mistake.questionId === question.id);
  if (existingIndex >= 0) {
    const existing = normalizeMistake(mistakes[existingIndex]);
    const updated: Mistake = {
      ...existing,
      reason: attempt.feedback || existing.reason,
      repeatedCount: existing.repeatedCount + 1,
      status: "待复习",
      updatedAt: attempt.createdAt,
    };
    return {
      mistakes: mistakes.map((mistake, index) => (index === existingIndex ? updated : mistake)),
      mistake: updated,
      repeatedMistake: true,
    };
  }

  const mistake: Mistake = {
    id: uid("mistake"),
    questionId: question.id,
    goalId: question.goalId,
    noteId: question.noteId,
    knowledgePointIds: question.knowledgePointIds,
    title: question.question,
    reason: attempt.feedback,
    repeatedCount: 1,
    status: "待复习",
    createdAt: attempt.createdAt,
    updatedAt: attempt.createdAt,
  };

  return { mistakes: [mistake, ...mistakes], mistake, repeatedMistake: false };
}

export function buildRecommendations(state: AppState, baseIso = todayIso()): Recommendation[] {
  const normalized = normalizeState(state);
  const previous = new Map(normalized.recommendations.map((item) => [item.id, item]));
  const recommendations: Recommendation[] = [];
  const makeRecommendation = (
    recommendation: Omit<Recommendation, "status" | "createdAt"> & { createdAt?: string },
  ) => {
    const existing = previous.get(recommendation.id);
    const status = existing?.status || "待处理";
    if (status === "忽略" || status === "已完成") return;
    recommendations.push({
      ...recommendation,
      status,
      createdAt: existing?.createdAt || recommendation.createdAt || baseIso,
    });
  };

  dueReminders(normalized.reviewReminders, baseIso)
    .slice(0, 8)
    .forEach((reminder) => {
      const note = normalized.notes.find((item) => item.id === reminder.noteId);
      const goal = normalized.goals.find((item) => item.id === (reminder.goalId || note?.associatedGoalIds[0]));
      makeRecommendation({
        id: `rec_review_${reminder.id}`,
        title: `复习：${reminder.conceptName || note?.title || "到期内容"}`,
        actionType: "复习",
        goalId: goal?.id,
        noteId: note?.id,
        priorityScore: 70 + (goal?.importance || 3) * 8,
        reasons: [
          `复习提醒已到期：${reminder.dueAt}`,
          goal ? `关联目标「${goal.title}」，重要程度 ${goal.importance}` : "暂未关联目标",
          reminder.lastScore !== undefined ? `上次复习得分 ${reminder.lastScore}` : "需要补充学习证据",
        ],
      });
    });

  normalized.knowledgePoints
    .filter((point) => point.masteryScore < 50)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 8)
    .forEach((point) => {
      const goal = normalized.goals.find((item) => point.goalIds.includes(item.id));
      makeRecommendation({
        id: `rec_kp_${point.id}`,
        title: `专项训练：${point.name}`,
        actionType: "做题",
        goalId: goal?.id,
        knowledgePointId: point.id,
        priorityScore: 60 + (goal?.importance || 3) * 8 + (50 - point.masteryScore),
        reasons: [
          `系统掌握分 ${point.masteryScore}/100，建议为「${point.systemMastery || masteryFromScore(point.masteryScore)}」`,
          goal ? `关联目标「${goal.title}」，重要程度 ${goal.importance}` : "暂未关联目标",
          point.lastTestScore !== undefined ? `最近自测 ${point.lastTestScore} 分` : "尚缺少自测证据",
          point.repeatedMistakeCount ? `重复错题 ${point.repeatedMistakeCount} 次` : "",
        ].filter(Boolean),
      });
    });

  normalized.mistakes
    .filter((mistake) => mistake.status === "待复习")
    .slice(0, 8)
    .forEach((mistake) => {
      const goal = normalized.goals.find((item) => item.id === mistake.goalId);
      makeRecommendation({
        id: `rec_mistake_${mistake.id}`,
        title: `复盘错题：${mistake.title}`,
        actionType: "复盘",
        goalId: mistake.goalId,
        noteId: mistake.noteId,
        priorityScore: 75 + mistake.repeatedCount * 10 + (goal?.importance || 3) * 5,
        reasons: [
          `错题重复 ${mistake.repeatedCount} 次`,
          goal ? `关联目标「${goal.title}」` : "需要补全目标关联",
          mistake.reason || "需要分析错误原因",
        ],
      });
    });

  normalized.milestones
    .filter((milestone) => milestone.status !== "完成" && milestone.deadline < baseIso)
    .slice(0, 6)
    .forEach((milestone) => {
      const goal = normalized.goals.find((item) => item.id === milestone.goalId);
      makeRecommendation({
        id: `rec_milestone_${milestone.id}`,
        title: `推进里程碑：${milestone.title}`,
        actionType: "推进计划",
        goalId: milestone.goalId,
        priorityScore: 80 + (goal?.importance || 3) * 8,
        reasons: [
          `里程碑已延期，截止 ${milestone.deadline}`,
          `当前进度 ${milestone.progress}%`,
          goal ? `属于目标「${goal.title}」` : "未找到目标",
        ],
      });
    });

  buildGoalInsights(normalized, baseIso)
    .filter((insight) => insight.progressGap >= 25)
    .slice(0, 4)
    .forEach((insight) => {
      makeRecommendation({
        id: `rec_goal_gap_${insight.goal.id}`,
        title: `校准目标进度：${insight.goal.title}`,
        actionType: "复盘",
        goalId: insight.goal.id,
        priorityScore: 65 + insight.progressGap,
        reasons: [
          `手动进度 ${insight.goal.progress}%`,
          `系统估算 ${insight.systemProgress}%`,
          "建议根据计划完成率、自测分和里程碑重新校准预期",
        ],
      });
    });

  return recommendations
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 20);
}

export interface LearningAnalytics {
  planCompletionRate: number;
  overduePlanRate: number;
  milestoneCompletionRate: number;
  reviewCompletionRate: number;
  averageTestScore: number;
  lowMasteryKnowledgeCount: number;
  repeatedMistakeRate: number;
  stalledGoalCount: number;
  weeklyEvidenceCount: number;
}

export function buildLearningAnalytics(state: AppState, baseIso = todayIso()): LearningAnalytics {
  const normalized = normalizeState(state);
  const activePlans = normalized.plans.filter((plan) => plan.status !== "完成");
  const overduePlans = activePlans.filter((plan) => plan.dueDate < baseIso);
  const completedReviews = normalized.reviewReminders.filter((reminder) => reminder.status === "已完成");
  const completedMilestones = normalized.milestones.filter((milestone) => milestone.status === "完成");
  const repeatedMistakes = normalized.mistakes.filter((mistake) => mistake.repeatedCount > 1);
  const weekStart = getWeekStartIso(new Date(`${baseIso}T00:00:00`));
  const stalledGoalCount = buildGoalInsights(normalized, baseIso).filter((insight) =>
    insight.reasons.some((reason) => reason.includes("天未推进") || reason === "尚未推进"),
  ).length;

  return {
    planCompletionRate: completionRate(normalized.plans),
    overduePlanRate:
      activePlans.length === 0 ? 0 : Math.round((overduePlans.length / activePlans.length) * 100),
    milestoneCompletionRate:
      normalized.milestones.length === 0
        ? 0
        : Math.round((completedMilestones.length / normalized.milestones.length) * 100),
    reviewCompletionRate:
      normalized.reviewReminders.length === 0
        ? 0
        : Math.round((completedReviews.length / normalized.reviewReminders.length) * 100),
    averageTestScore:
      normalized.answerAttempts.length === 0
        ? 0
        : clampScore(
            normalized.answerAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
              normalized.answerAttempts.length,
          ),
    lowMasteryKnowledgeCount: normalized.knowledgePoints.filter((point) => point.masteryScore < 40)
      .length,
    repeatedMistakeRate:
      normalized.mistakes.length === 0
        ? 0
        : Math.round((repeatedMistakes.length / normalized.mistakes.length) * 100),
    stalledGoalCount,
    weeklyEvidenceCount: normalized.studyEvents.filter((event) => event.createdAt >= weekStart)
      .length,
  };
}

export function buildWeeklySummary(state: AppState) {
  const normalized = normalizeState(state);
  const weekStart = getWeekStartIso();
  const dueCount = dueReminders(normalized.reviewReminders).length;
  const completedPlans = normalized.plans.filter((plan) => plan.status === "完成").length;
  const activePlans = normalized.plans.filter((plan) => plan.status !== "完成").length;
  const weakNotes = normalized.notes
    .filter((note) => note.mastery === "未学" || note.mastery === "初学")
    .slice(0, 4)
    .map((note) => note.title);
  const sharedPoints = normalized.knowledgePoints.filter((point) =>
    point.tracks.includes("shared"),
  ).length;
  const goalInsights = buildGoalInsights(normalized).slice(0, 3);
  const pendingMistakes = normalized.mistakes.filter((mistake) => mistake.status === "待复习");
  const repeatedMistakes = pendingMistakes.filter((mistake) => mistake.repeatedCount > 1);
  const overdueMilestones = normalized.milestones.filter(
    (milestone) => milestone.status !== "完成" && milestone.deadline < todayIso(),
  );
  const completedMilestones = normalized.milestones.filter(
    (milestone) => milestone.status === "完成" && milestone.updatedAt >= weekStart,
  );
  const weeklyAttempts = normalized.answerAttempts.filter((attempt) => attempt.createdAt >= weekStart);
  const averageWeeklyScore =
    weeklyAttempts.length === 0
      ? 0
      : clampScore(
          weeklyAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            weeklyAttempts.length,
        );
  const lowScoreAttempts = weeklyAttempts.filter((attempt) => attempt.score < 60);
  const weeklyEvents = normalized.studyEvents.filter((event) => event.createdAt >= weekStart);
  const testedKnowledgePointIds = new Set<string>();
  weeklyAttempts.forEach((attempt) => {
    const question = normalized.questions.find((item) => item.id === attempt.questionId);
    question?.knowledgePointIds.forEach((id) => testedKnowledgePointIds.add(id));
  });
  weeklyEvents.forEach((event) => {
    if (event.knowledgePointId) testedKnowledgePointIds.add(event.knowledgePointId);
  });
  const masteryChangeLines = normalized.knowledgePoints
    .filter(
      (point) =>
        testedKnowledgePointIds.has(point.id) ||
        (point.updatedAt >= weekStart && point.evidenceCount > 0),
    )
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 5)
    .map((point) => {
      const direction =
        point.lastTestScore !== undefined && point.lastTestScore < 60
          ? "下降风险"
          : point.masteryScore >= 70
            ? "提升稳定"
            : "仍需巩固";
      return `${point.name}：${point.masteryScore}/100，系统建议 ${point.systemMastery || masteryFromScore(point.masteryScore)}，${direction}`;
    });
  const goalLines = goalInsights.map((insight, index) => {
    const daysText =
      insight.daysLeft === null
        ? "无截止"
        : insight.daysLeft < 0
          ? `已超 ${Math.abs(insight.daysLeft)} 天`
          : `剩 ${insight.daysLeft} 天`;
    return `${index + 1}. ${insight.goal.title}：优先级 ${insight.priorityScore}，${goalImportanceLabels[insight.goal.importance]}，${daysText}，计划完成率 ${insight.planCompletionRate}%，风险：${insight.risk}`;
  });

  return [
    `本周起始：${weekStart}`,
    `目标 ${normalized.goals.length} 个，笔记 ${normalized.notes.length} 篇，知识点 ${normalized.knowledgePoints.length} 个，其中交叉知识点 ${sharedPoints} 个。`,
    `计划完成 ${completedPlans} 项，仍有 ${activePlans} 项需要推进。`,
    `当前到期复习 ${dueCount} 项。`,
    overdueMilestones.length > 0
      ? `里程碑风险：${overdueMilestones
          .slice(0, 4)
          .map((milestone) => `${milestone.title} 已延期，当前 ${milestone.progress}%`)
          .join("；")}。`
      : completedMilestones.length > 0
        ? `里程碑进展：本周完成 ${completedMilestones.length} 个里程碑。`
        : "里程碑进展：本周没有完成或延期的里程碑记录。",
    weeklyAttempts.length > 0
      ? `自测表现：本周完成 ${weeklyAttempts.length} 次自测，平均 ${averageWeeklyScore} 分，低于 60 分 ${lowScoreAttempts.length} 次。`
      : "自测表现：本周还没有答题记录，建议至少安排一次输出型自测。",
    pendingMistakes.length > 0
      ? `错题风险：待复盘 ${pendingMistakes.length} 道，其中重复错题 ${repeatedMistakes.length} 道；优先处理 ${pendingMistakes
          .slice(0, 3)
          .map((mistake) => `「${mistake.title}」`)
          .join("、")}。`
      : "错题风险：当前没有待复盘错题。",
    masteryChangeLines.length > 0
      ? `掌握分变化：\n${masteryChangeLines.join("\n")}`
      : "掌握分变化：本周还缺少可用于更新掌握分的复习/自测证据。",
    goalLines.length > 0 ? `目标视角：\n${goalLines.join("\n")}` : "还没有目标数据，建议先创建一个核心目标。",
    weakNotes.length > 0
      ? `需要重点补强：${weakNotes.join("、")}。`
      : "本周没有明显低掌握度笔记，可以增加输出型练习。",
  ].join("\n");
}

export function completionRate(plans: StudyPlan[]) {
  if (plans.length === 0) return 0;
  return Math.round((plans.filter((plan) => plan.status === "完成").length / plans.length) * 100);
}

export {
  buildNoteFromResource,
  buildResourceChunks,
  extractResourceConcepts,
  generateQuestionsFromResource,
  inferResourceTypeFromName,
} from "./learning/resources";
export {
  buildAttemptFeedback,
  buildDefaultRubric,
  gradeAnswerWithRubric,
} from "./learning/grading";
export {
  answerKnowledgeQuestion,
  buildSearchDocuments,
  searchKnowledgeBase,
  type KnowledgeAnswer,
  type KnowledgeSearchResult,
} from "./learning/search";
export {
  buildTodayLearningQueue,
  completeTodayLearningTask,
  postponeTodayLearningTask,
  type TodayLearningTask,
  type TodayLearningTaskSourceType,
} from "./learning/todayQueue";
