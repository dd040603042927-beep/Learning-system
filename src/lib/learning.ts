import type {
  AppState,
  Goal,
  GoalImportance,
  GoalStatus,
  Importance,
  KnowledgePoint,
  Mastery,
  Note,
  ReviewReminder,
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

export const reviewIntervals = [1, 3, 7, 14, 30];

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(baseIso: string, days: number) {
  const date = new Date(`${baseIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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
    knowledgePoints: (Array.isArray(state.knowledgePoints) ? state.knowledgePoints : []).map(
      (point) => ({
        ...point,
        noteIds: Array.isArray(point.noteIds) ? point.noteIds : [],
        goalIds: Array.isArray(point.goalIds) ? point.goalIds : [],
        tracks:
          Array.isArray(point.tracks) && point.tracks.length
            ? point.tracks.map((track) => asTrack(track))
            : ["shared"],
      }),
    ) as KnowledgePoint[],
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
      linkedNoteIds: Array.isArray(project.linkedNoteIds) ? project.linkedNoteIds : [],
    })) as AppState["projects"],
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
  dueReviewCount: number;
  activePlanCount: number;
  completedPlanCount: number;
  planCompletionRate: number;
  averageMastery: string;
  risk: string;
  daysLeft: number | null;
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
      const relatedPlans = normalized.plans.filter((plan) => plan.goalId === goal.id);
      const activePlans = relatedPlans.filter((plan) => plan.status !== "完成");
      const completedPlans = relatedPlans.filter((plan) => plan.status === "完成");
      const relatedDue = due.filter((reminder) => {
        if (reminder.goalId === goal.id) return true;
        const note = normalized.notes.find((item) => item.id === reminder.noteId);
        return note?.associatedGoalIds.includes(goal.id) ?? false;
      });
      const lowMasteryNotes = relatedNotes.filter(
        (note) => note.mastery === "未学" || note.mastery === "初学",
      );
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

      const overduePlanCount = activePlans.filter((plan) => plan.dueDate < baseIso).length;
      const overduePlanScore = Math.min(20, overduePlanCount * 10);
      if (overduePlanCount > 0) reasons.push(`${overduePlanCount} 项计划延期`);

      const dueReviewScore = Math.min(20, relatedDue.length * 5);
      if (relatedDue.length > 0) reasons.push(`${relatedDue.length} 个到期复习`);

      const activityDates = [
        ...relatedNotes.map((note) => note.updatedAt || note.createdAt),
        ...relatedPlans.map((plan) => plan.createdAt || plan.dueDate),
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
        overduePlanScore +
        dueReviewScore +
        inactivityScore;

      const planCompletionRate =
        relatedPlans.length === 0
          ? 0
          : Math.round((completedPlans.length / relatedPlans.length) * 100);

      const masteryAverage =
        relatedNotes.length === 0
          ? null
          : relatedNotes.reduce((sum, note) => sum + masteryWeight[note.mastery], 0) /
            relatedNotes.length;
      const averageMastery =
        masteryAverage === null
          ? "未积累"
          : masteryAverage < 1
            ? "未学"
            : masteryAverage < 2
              ? "初学"
              : masteryAverage < 3
                ? "理解"
                : masteryAverage < 4
                  ? "熟练"
                  : "可讲解";

      const risk =
        relatedNotes.length === 0
          ? "还没有关联笔记，目标缺少学习记录。"
          : relatedDue.length > 0
            ? "存在到期复习，需要先处理记忆回路。"
            : relatedPlans.length > 0 && planCompletionRate < 50
              ? "计划完成率偏低，建议收敛任务数量。"
              : lowMasteryNotes.length > 0
                ? "低掌握笔记偏多，建议安排输出型复习。"
                : goal.progress < 30 && goal.importance >= 4
                  ? "核心目标进度偏低，需要拆出本周动作。"
                  : "节奏正常，继续保持复盘。";

      return {
        goal: { ...goal, priorityScore },
        priorityScore,
        reasons: cleanUnique(reasons).slice(0, 4),
        noteCount: relatedNotes.length,
        knowledgeCount: relatedKnowledge.length,
        dueReviewCount: relatedDue.length,
        activePlanCount: activePlans.length,
        completedPlanCount: completedPlans.length,
        planCompletionRate,
        averageMastery,
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
      const point = updated[index];
      updated[index] = {
        ...point,
        noteIds: cleanUnique([...point.noteIds, note.id]),
        goalIds: cleanUnique([...point.goalIds, ...inferredGoalIds]),
        tracks: cleanUnique([...point.tracks, ...note.tracks]) as Track[],
        mastery:
          masteryWeight[note.mastery] < masteryWeight[point.mastery] ? note.mastery : point.mastery,
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

export function buildWeeklySummary(state: AppState) {
  const weekStart = getWeekStartIso();
  const dueCount = dueReminders(state.reviewReminders).length;
  const completedPlans = state.plans.filter((plan) => plan.status === "完成").length;
  const activePlans = state.plans.filter((plan) => plan.status !== "完成").length;
  const weakNotes = state.notes
    .filter((note) => note.mastery === "未学" || note.mastery === "初学")
    .slice(0, 4)
    .map((note) => note.title);
  const sharedPoints = state.knowledgePoints.filter((point) =>
    point.tracks.includes("shared"),
  ).length;
  const goalInsights = buildGoalInsights(state).slice(0, 3);
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
    `目标 ${state.goals.length} 个，笔记 ${state.notes.length} 篇，知识点 ${state.knowledgePoints.length} 个，其中交叉知识点 ${sharedPoints} 个。`,
    `计划完成 ${completedPlans} 项，仍有 ${activePlans} 项需要推进。`,
    `当前到期复习 ${dueCount} 项。`,
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
