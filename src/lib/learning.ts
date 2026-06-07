import type {
  AppState,
  Goal,
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

  return [
    `本周起始：${weekStart}`,
    `笔记 ${state.notes.length} 篇，知识点 ${state.knowledgePoints.length} 个，其中双路线交叉知识点 ${sharedPoints} 个。`,
    `计划完成 ${completedPlans} 项，仍有 ${activePlans} 项需要推进。`,
    `当前到期复习 ${dueCount} 项。`,
    weakNotes.length > 0
      ? `需要重点补强：${weakNotes.join("、")}。`
      : "本周没有明显低掌握度笔记，可以增加输出型练习。",
  ].join("\n");
}

export function completionRate(plans: StudyPlan[]) {
  if (plans.length === 0) return 0;
  return Math.round((plans.filter((plan) => plan.status === "完成").length / plans.length) * 100);
}
