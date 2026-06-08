import type { AppState, Goal, PlanScope, ReviewRecord, ReviewReminder, StudyPlan } from "../../types";
import {
  addDaysIso,
  applyKnowledgeEvidence,
  cleanUnique,
  createStudyEvent,
  dueReminders,
  masteryFromScore,
  nextIntervalByScore,
  normalizeState,
  reviewEvidenceDelta,
  todayIso,
  uid,
} from "../learning";

export type TodayLearningTaskSourceType =
  | "review"
  | "plan"
  | "mistake"
  | "knowledge"
  | "pathStep"
  | "milestone";

export interface TodayLearningTask {
  id: string;
  sourceType: TodayLearningTaskSourceType;
  sourceId: string;
  title: string;
  actionType: "复习" | "做题" | "写笔记" | "错题复盘" | "推进计划" | "读资料" | "周总结";
  goalId?: string;
  noteId?: string;
  dueDate: string;
  priorityScore: number;
  estimatedMinutes: number;
  reasons: string[];
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

function dueScopeFromDate(dueDate: string, baseIso = todayIso()): PlanScope {
  if (dueDate <= baseIso) return "今日";
  return dueDate <= addDaysIso(baseIso, 7) ? "本周" : "下周";
}

function taskUrgencyScore(dueDate: string, baseIso: string) {
  const remaining = daysUntil(dueDate, baseIso);
  if (remaining === null) return 0;
  if (remaining < 0) return 34 + Math.min(30, Math.abs(remaining) * 5);
  if (remaining === 0) return 24;
  if (remaining <= 2) return 12;
  if (remaining <= 7) return 4;
  return 0;
}

function hasFuturePlanForTitle(plans: StudyPlan[], title: string, baseIso: string) {
  const normalizedTitle = title.toLowerCase();
  return plans.some(
    (plan) =>
      plan.status !== "完成" &&
      plan.dueDate > baseIso &&
      plan.title.toLowerCase().includes(normalizedTitle),
  );
}

export function buildTodayLearningQueue(state: AppState, baseIso = todayIso()): TodayLearningTask[] {
  const normalized = normalizeState(state);
  const tasks: TodayLearningTask[] = [];
  const goalsById = new Map(normalized.goals.map((goal) => [goal.id, goal]));
  const notesById = new Map(normalized.notes.map((note) => [note.id, note]));
  const addTask = (task: TodayLearningTask) => {
    if (tasks.some((item) => item.id === task.id)) return;
    tasks.push({
      ...task,
      reasons: cleanUnique(task.reasons.filter(Boolean)),
      priorityScore: Math.max(0, Math.round(task.priorityScore)),
    });
  };

  dueReminders(normalized.reviewReminders, baseIso).forEach((reminder) => {
    const note = notesById.get(reminder.noteId);
    const goal = goalsById.get(reminder.goalId || note?.associatedGoalIds[0] || "");
    const lowScoreBoost = reminder.lastScore !== undefined ? Math.max(0, 4 - reminder.lastScore) * 9 : 6;
    addTask({
      id: `today_review_${reminder.id}`,
      sourceType: "review",
      sourceId: reminder.id,
      title: `复习：${reminder.conceptName || note?.title || "到期内容"}`,
      actionType: "复习",
      goalId: goal?.id,
      noteId: note?.id,
      dueDate: reminder.dueAt,
      priorityScore: 72 + (goal?.importance || 3) * 8 + lowScoreBoost + taskUrgencyScore(reminder.dueAt, baseIso),
      estimatedMinutes: 25,
      reasons: [
        `到期复习：${reminder.dueAt}`,
        goal ? `关联目标「${goal.title}」，重要程度 ${goal.importance}` : "未绑定目标",
        reminder.lastScore !== undefined ? `上次复习 ${reminder.lastScore}/5` : "还缺少复习得分证据",
      ],
    });
  });

  normalized.plans
    .filter((plan) => plan.status !== "完成")
    .filter((plan) => plan.scope === "今日" || plan.dueDate <= baseIso)
    .forEach((plan) => {
      const goal = goalsById.get(plan.goalId || "");
      addTask({
        id: `today_plan_${plan.id}`,
        sourceType: "plan",
        sourceId: plan.id,
        title: plan.title,
        actionType: plan.source === "自测系统" ? "做题" : plan.source === "学习路径" ? "推进计划" : "写笔记",
        goalId: plan.goalId,
        noteId: plan.noteId,
        dueDate: plan.dueDate,
        priorityScore: 58 + (goal?.importance || 3) * 8 + taskUrgencyScore(plan.dueDate, baseIso),
        estimatedMinutes: 45,
        reasons: [
          plan.dueDate < baseIso ? `计划已延期：${plan.dueDate}` : `今日计划：${plan.dueDate}`,
          `来源：${plan.source}`,
          goal ? `关联目标「${goal.title}」，重要程度 ${goal.importance}` : "未绑定目标",
        ],
      });
    });

  normalized.mistakes
    .filter((mistake) => mistake.status === "待复习" && mistake.updatedAt <= baseIso)
    .filter((mistake) => !hasFuturePlanForTitle(normalized.plans, mistake.title.slice(0, 18), baseIso))
    .forEach((mistake) => {
      const goal = goalsById.get(mistake.goalId || "");
      addTask({
        id: `today_mistake_${mistake.id}`,
        sourceType: "mistake",
        sourceId: mistake.id,
        title: `错题复盘：${mistake.title}`,
        actionType: "错题复盘",
        goalId: mistake.goalId,
        noteId: mistake.noteId,
        dueDate: baseIso,
        priorityScore: 76 + mistake.repeatedCount * 12 + (goal?.importance || 3) * 6,
        estimatedMinutes: 35,
        reasons: [
          `低分题自动进入错题本，重复 ${mistake.repeatedCount} 次`,
          mistake.reason || "需要补齐错因",
          goal ? `关联目标「${goal.title}」` : "未绑定目标",
        ],
      });
    });

  normalized.knowledgePoints
    .filter((point) => point.masteryScore < 55)
    .filter((point) => !hasFuturePlanForTitle(normalized.plans, point.name, baseIso))
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 8)
    .forEach((point) => {
      const goal = point.goalIds.map((goalId) => goalsById.get(goalId)).find(Boolean);
      const staleDays = daysSince(point.lastReviewedAt, baseIso);
      addTask({
        id: `today_knowledge_${point.id}`,
        sourceType: "knowledge",
        sourceId: point.id,
        title: `专项训练：${point.name}`,
        actionType: "做题",
        goalId: goal?.id,
        noteId: point.noteIds[0],
        dueDate: baseIso,
        priorityScore:
          60 +
          (55 - point.masteryScore) +
          (goal?.importance || 3) * 7 +
          (point.repeatedMistakeCount || 0) * 10 +
          (staleDays !== null && staleDays > 7 ? 8 : 0),
        estimatedMinutes: 40,
        reasons: [
          `系统掌握分 ${point.masteryScore}/100，建议为「${point.systemMastery || masteryFromScore(point.masteryScore)}」`,
          point.lastTestScore !== undefined ? `最近自测 ${point.lastTestScore} 分` : "缺少最近自测证据",
          point.repeatedMistakeCount ? `重复错题 ${point.repeatedMistakeCount} 次` : "",
          goal ? `关联目标「${goal.title}」，重要程度 ${goal.importance}` : "未绑定目标",
        ],
      });
    });

  const nextStepIds = new Set<string>();
  normalized.learningPaths
    .filter((path) => path.status !== "完成" && path.status !== "暂停")
    .forEach((path) => {
      const nextStep = normalized.learningPathSteps
        .filter((step) => step.pathId === path.id && step.status !== "完成" && step.status !== "跳过")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (nextStep) nextStepIds.add(nextStep.id);
    });

  normalized.learningPathSteps
    .filter((step) => step.status !== "完成" && step.status !== "跳过")
    .filter((step) => step.dueDate <= baseIso || nextStepIds.has(step.id))
    .forEach((step) => {
      const goal = goalsById.get(step.goalId);
      addTask({
        id: `today_path_${step.id}`,
        sourceType: "pathStep",
        sourceId: step.id,
        title: step.title,
        actionType: step.actionType === "读资料" ? "读资料" : step.actionType === "错题复盘" ? "错题复盘" : "推进计划",
        goalId: step.goalId,
        dueDate: step.dueDate,
        priorityScore:
          56 +
          (goal?.importance || 3) * 7 +
          taskUrgencyScore(step.dueDate, baseIso) +
          (nextStepIds.has(step.id) ? 8 : 0),
        estimatedMinutes: step.estimatedMinutes,
        reasons: [
          nextStepIds.has(step.id) ? "学习路径中的下一步" : "",
          step.dueDate <= baseIso ? `路径步骤到期：${step.dueDate}` : `路径步骤排期：${step.dueDate}`,
          ...step.reasons.slice(0, 2),
        ],
      });
    });

  normalized.milestones
    .filter((milestone) => milestone.status !== "完成")
    .filter((milestone) => milestone.deadline <= addDaysIso(baseIso, 3))
    .filter((milestone) => !hasFuturePlanForTitle(normalized.plans, milestone.title, baseIso))
    .forEach((milestone) => {
      const goal = goalsById.get(milestone.goalId);
      addTask({
        id: `today_milestone_${milestone.id}`,
        sourceType: "milestone",
        sourceId: milestone.id,
        title: `推进里程碑：${milestone.title}`,
        actionType: "推进计划",
        goalId: milestone.goalId,
        dueDate: milestone.deadline,
        priorityScore: 54 + (goal?.importance || 3) * 9 + taskUrgencyScore(milestone.deadline, baseIso),
        estimatedMinutes: 50,
        reasons: [
          milestone.deadline < baseIso ? `里程碑已延期：${milestone.deadline}` : `里程碑临近：${milestone.deadline}`,
          `当前进度 ${milestone.progress}%`,
          goal ? `关联目标「${goal.title}」，重要程度 ${goal.importance}` : "未绑定目标",
        ],
      });
    });

  return tasks.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 12);
}

export function completeTodayLearningTask(
  state: AppState,
  task: TodayLearningTask,
  baseIso = todayIso(),
): AppState {
  const normalized = normalizeState(state);
  const event = createStudyEvent({
    type:
      task.sourceType === "review" || task.sourceType === "mistake" || task.sourceType === "knowledge"
        ? "completed_review"
        : task.sourceType === "milestone"
          ? "updated_goal"
          : "completed_plan",
    goalId: task.goalId,
    noteId: task.noteId,
    title: `完成今日任务：${task.title.slice(0, 36)}`,
    createdAt: baseIso,
  });

  if (task.sourceType === "plan") {
    return {
      ...normalized,
      plans: normalized.plans.map((plan) =>
        plan.id === task.sourceId ? { ...plan, status: "完成" as const } : plan,
      ),
      studyEvents: [event, ...normalized.studyEvents],
    };
  }

  if (task.sourceType === "review") {
    const reminder = normalized.reviewReminders.find((item) => item.id === task.sourceId);
    const note = reminder ? normalized.notes.find((item) => item.id === reminder.noteId) : undefined;
    if (!reminder) return normalized;
    const nextInterval = nextIntervalByScore(4, reminder.intervalDays);
    const nextReminder: ReviewReminder = {
      id: uid("review"),
      noteId: reminder.noteId,
      goalId: reminder.goalId ?? note?.associatedGoalIds[0],
      conceptName: reminder.conceptName,
      dueAt: addDaysIso(baseIso, nextInterval),
      intervalDays: nextInterval,
      status: "待复习",
      createdAt: baseIso,
      lastScore: 4,
    };
    const record: ReviewRecord = {
      id: uid("record"),
      date: baseIso,
      mode: "自测",
      score: 4,
      result: "从今日学习驾驶舱一键完成，默认按基本掌握处理。",
      nextReviewAt: nextReminder.dueAt,
    };
    return {
      ...normalized,
      notes: normalized.notes.map((item) =>
        item.id === reminder.noteId ? { ...item, reviewRecords: [record, ...item.reviewRecords] } : item,
      ),
      knowledgePoints: applyKnowledgeEvidence(normalized.knowledgePoints, {
        noteId: reminder.noteId,
        goalId: reminder.goalId ?? note?.associatedGoalIds[0],
        conceptName: reminder.conceptName,
        delta: reviewEvidenceDelta(4, "自测"),
        score: 80,
        reviewedAt: baseIso,
      }),
      reviewReminders: [
        ...normalized.reviewReminders.map((item) =>
          item.id === reminder.id ? { ...item, status: "已完成" as const, lastScore: 4 } : item,
        ),
        nextReminder,
      ],
      studyEvents: [event, ...normalized.studyEvents],
    };
  }

  if (task.sourceType === "mistake") {
    const mistake = normalized.mistakes.find((item) => item.id === task.sourceId);
    return {
      ...normalized,
      mistakes: normalized.mistakes.map((item) =>
        item.id === task.sourceId ? { ...item, status: "已复习" as const, updatedAt: baseIso } : item,
      ),
      knowledgePoints: mistake
        ? applyKnowledgeEvidence(normalized.knowledgePoints, {
            knowledgePointIds: mistake.knowledgePointIds,
            noteId: mistake.noteId,
            goalId: mistake.goalId,
            delta: 8,
            score: 75,
            reviewedAt: baseIso,
          })
        : normalized.knowledgePoints,
      studyEvents: [event, ...normalized.studyEvents],
    };
  }

  if (task.sourceType === "knowledge") {
    return {
      ...normalized,
      knowledgePoints: applyKnowledgeEvidence(normalized.knowledgePoints, {
        knowledgePointIds: [task.sourceId],
        noteId: task.noteId,
        goalId: task.goalId,
        delta: 6,
        score: 75,
        reviewedAt: baseIso,
      }),
      studyEvents: [event, ...normalized.studyEvents],
    };
  }

  if (task.sourceType === "pathStep") {
    return {
      ...normalized,
      learningPathSteps: normalized.learningPathSteps.map((step) =>
        step.id === task.sourceId ? { ...step, status: "完成" as const } : step,
      ),
      studyEvents: [event, ...normalized.studyEvents],
    };
  }

  if (task.sourceType === "milestone") {
    return {
      ...normalized,
      milestones: normalized.milestones.map((milestone) => {
        if (milestone.id !== task.sourceId) return milestone;
        const progress = Math.min(100, milestone.progress + 15);
        return {
          ...milestone,
          progress,
          status: progress >= 100 ? "完成" : "进行中",
          updatedAt: baseIso,
        };
      }),
      studyEvents: [event, ...normalized.studyEvents],
    };
  }

  return normalized;
}

export function postponeTodayLearningTask(
  state: AppState,
  task: TodayLearningTask,
  days = 1,
  baseIso = todayIso(),
): AppState {
  const normalized = normalizeState(state);
  const dueDate = addDaysIso(baseIso, Math.max(1, Math.round(days)));
  if (task.sourceType === "plan") {
    return {
      ...normalized,
      plans: normalized.plans.map((plan) =>
        plan.id === task.sourceId
          ? { ...plan, dueDate, scope: dueScopeFromDate(dueDate, baseIso), status: "未开始" as const }
          : plan,
      ),
    };
  }
  if (task.sourceType === "review") {
    return {
      ...normalized,
      reviewReminders: normalized.reviewReminders.map((reminder) =>
        reminder.id === task.sourceId ? { ...reminder, dueAt: dueDate, status: "待复习" as const } : reminder,
      ),
    };
  }
  if (task.sourceType === "mistake") {
    return {
      ...normalized,
      mistakes: normalized.mistakes.map((mistake) =>
        mistake.id === task.sourceId ? { ...mistake, updatedAt: dueDate } : mistake,
      ),
    };
  }
  if (task.sourceType === "pathStep") {
    return {
      ...normalized,
      learningPathSteps: normalized.learningPathSteps.map((step) =>
        step.id === task.sourceId ? { ...step, dueDate } : step,
      ),
    };
  }

  const goal = normalized.goals.find((item: Goal) => item.id === task.goalId);
  const plan: StudyPlan = {
    id: uid("plan"),
    title: task.title,
    scope: dueScopeFromDate(dueDate, baseIso),
    category: `今日任务 / ${task.actionType}`,
    track: goal?.track || "shared",
    dueDate,
    status: "未开始",
    source: "AI建议",
    goalId: task.goalId,
    noteId: task.noteId,
    milestoneId: task.sourceType === "milestone" ? task.sourceId : undefined,
    createdAt: baseIso,
  };

  return {
    ...normalized,
    plans: [plan, ...normalized.plans],
  };
}
