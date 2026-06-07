import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Lightbulb,
  LogOut,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Tags,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  Goal,
  GoalImportance,
  Importance,
  Note,
  NoteType,
  PlanScope,
  PlanStatus,
  PortfolioProject,
  ReviewMode,
  ReviewReminder,
  StudyPlan,
  Track,
} from "./types";
import { aiActionLabels, runLocalAi, type AiAction } from "./lib/ai";
import {
  addDaysIso,
  buildGoalInsights,
  buildReviewSchedule,
  buildWeeklySummary,
  cleanUnique,
  completionRate,
  dueReminders,
  getGoalTemplate,
  getWeekStartIso,
  goalImportanceLabels,
  goalStatuses,
  goalTemplates,
  nextIntervalByScore,
  normalizeState,
  planFromNoteAction,
  splitList,
  todayIso,
  trackLabels,
  trackShortLabels,
  uid,
  upcomingReminders,
  upsertKnowledgeFromNote,
} from "./lib/learning";
import { exportState, loadState, resetState, saveState } from "./lib/storage";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  runBackendAi,
  saveRemoteState,
  type AuthPayload,
  type AuthUser,
} from "./lib/api";

type TabKey =
  | "dashboard"
  | "notes"
  | "knowledge"
  | "plans"
  | "reviews"
  | "reflections"
  | "goals"
  | "projects"
  | "ai";

interface GoalDraft {
  title: string;
  templateKey: string;
  domain: string;
  track: Track;
  category: string;
  deadline: string;
  importance: GoalImportance;
  weeklyHours: number;
  currentLevel: string;
  description: string;
}

const tabs: Array<{ key: TabKey; label: string; icon: typeof Gauge }> = [
  { key: "dashboard", label: "总览", icon: Gauge },
  { key: "goals", label: "我的目标", icon: Target },
  { key: "notes", label: "笔记库", icon: NotebookPen },
  { key: "plans", label: "学习计划", icon: CalendarCheck },
  { key: "reviews", label: "复习系统", icon: RotateCcw },
  { key: "reflections", label: "总结反思", icon: FileText },
  { key: "knowledge", label: "知识点", icon: Tags },
  { key: "projects", label: "项目作品集", icon: BriefcaseBusiness },
  { key: "ai", label: "AI 助手", icon: Bot },
];

const noteTypes: NoteType[] = ["课程", "技术", "考研", "项目", "读书"];
const masteries: Note["mastery"][] = ["未学", "初学", "理解", "熟练", "可讲解"];
const importances: Importance[] = ["低", "中", "高"];
const tracks: Track[] = ["kaoyan", "career", "shared"];
const planScopes: PlanScope[] = ["今日", "本周", "下周"];
const planStatuses: PlanStatus[] = ["未开始", "进行中", "完成"];

function createBlankNote(goals: Goal[]): Note {
  const today = todayIso();
  const primaryGoal =
    goals
      .filter((goal) => goal.status === "进行中")
      .sort((a, b) => b.importance - a.importance)[0] ?? goals[0];
  return {
    id: uid("note"),
    title: "新笔记",
    type: "技术",
    direction: primaryGoal?.domain || "自定义学习",
    tracks: primaryGoal ? [primaryGoal.track] : ["shared"],
    associatedGoalIds: primaryGoal ? [primaryGoal.id] : [],
    mastery: "初学",
    importance: "中",
    summary: "",
    content: "",
    coreConcepts: [],
    commonQuestions: [],
    myUnderstanding: "",
    relatedNoteIds: [],
    reviewRecords: [],
    nextAction: "",
    createdAt: today,
    updatedAt: today,
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [selectedNoteId, setSelectedNoteId] = useState(state.notes[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const lastSyncedState = useRef("");
  const selectedNote = useMemo(
    () => state.notes.find((note) => note.id === selectedNoteId),
    [selectedNoteId, state.notes],
  );
  const [draftNote, setDraftNote] = useState<Note>(
    selectedNote ?? createBlankNote(state.goals),
  );
  const [planDraft, setPlanDraft] = useState({
    title: "",
    scope: "今日" as PlanScope,
    category: "技术",
    track: "career" as Track,
    goalId: "",
    dueDate: todayIso(),
  });
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    title: "",
    templateKey: "custom",
    domain: "",
    track: "shared" as Track,
    category: "",
    deadline: addDaysIso(todayIso(), 30),
    importance: 3 as GoalImportance,
    weeklyHours: 5,
    currentLevel: "",
    description: "",
  });
  const [projectDraft, setProjectDraft] = useState({
    title: "",
    track: "career" as Track,
    techStack: "",
    difficulty: "",
    learnings: "",
    nextAction: "",
  });
  const [aiAction, setAiAction] = useState<AiAction>("next");
  const [aiOutput, setAiOutput] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [editingGoalId, setEditingGoalId] = useState("");
  const [editingProjectId, setEditingProjectId] = useState("");

  function applyAuthPayload(payload: AuthPayload) {
    const nextState = normalizeState(payload.state);
    setCurrentUser(payload.user);
    setState(nextState);
    setSelectedNoteId(nextState.notes[0]?.id ?? "");
    setRemoteReady(true);
    lastSyncedState.current = JSON.stringify(nextState);
  }

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((payload) => {
        if (cancelled) return;
        if (payload) {
          const nextState = normalizeState(payload.state);
          setCurrentUser(payload.user);
          setState(nextState);
          setSelectedNoteId(nextState.notes[0]?.id ?? "");
          setRemoteReady(true);
          lastSyncedState.current = JSON.stringify(nextState);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveState(state);
    if (!currentUser || !remoteReady) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSyncedState.current) return;

    setSyncStatus("saving");
    const timer = window.setTimeout(() => {
      saveRemoteState(state)
        .then(() => {
          lastSyncedState.current = serialized;
          setSyncStatus("saved");
        })
        .catch(() => setSyncStatus("error"));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [state, currentUser, remoteReady]);

  useEffect(() => {
    setDraftNote(selectedNote ?? createBlankNote(state.goals));
  }, [selectedNoteId]);

  useEffect(() => {
    if (state.notes.some((note) => note.id === selectedNoteId)) return;
    setSelectedNoteId(state.notes[0]?.id ?? "");
  }, [state.notes, selectedNoteId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const due = useMemo(() => dueReminders(state.reviewReminders), [state.reviewReminders]);
  const upcoming = useMemo(
    () => upcomingReminders(state.reviewReminders),
    [state.reviewReminders],
  );
  const planRate = completionRate(state.plans);
  const goalInsights = useMemo(() => buildGoalInsights(state), [state]);
  const topGoalInsight = goalInsights[0];

  function showNotice(message: string) {
    setNotice(message);
  }

  function getReminderGoalTitle(reminder: ReviewReminder) {
    if (reminder.goalId) {
      const directGoal = state.goals.find((goal) => goal.id === reminder.goalId);
      if (directGoal) return directGoal.title;
    }
    const note = state.notes.find((item) => item.id === reminder.noteId);
    const fallbackGoal = state.goals.find((goal) => note?.associatedGoalIds.includes(goal.id));
    return fallbackGoal?.title;
  }

  async function submitAuth() {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const payload =
        authMode === "login"
          ? await loginUser(authForm.username, authForm.password)
          : await registerUser(authForm.username, authForm.password);
      applyAuthPayload(payload);
      showNotice(authMode === "login" ? "登录成功。" : "注册成功，已创建你的学习数据表。");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "认证失败");
    } finally {
      setAuthSubmitting(false);
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await logoutUser();
    setCurrentUser(null);
    setRemoteReady(false);
    setActiveTab("dashboard");
    setAuthMode("login");
    setAuthForm({ username: "", password: "" });
  }

  function saveDraftNote() {
    const now = todayIso();
    const associatedGoals = state.goals.filter((goal) =>
      draftNote.associatedGoalIds.includes(goal.id),
    );
    const linkedTracks = associatedGoals.map((goal) => goal.track);
    const normalized: Note = {
      ...draftNote,
      title: draftNote.title.trim() || "未命名笔记",
      direction: draftNote.direction.trim(),
      tracks: (cleanUnique([...draftNote.tracks, ...linkedTracks]) as Track[]).length
        ? (cleanUnique([...draftNote.tracks, ...linkedTracks]) as Track[])
        : ["shared"],
      associatedGoalIds: draftNote.associatedGoalIds,
      coreConcepts: cleanUnique(draftNote.coreConcepts),
      commonQuestions: cleanUnique(draftNote.commonQuestions),
      updatedAt: now,
    };

    setState((current) => {
      const exists = current.notes.some((note) => note.id === normalized.id);
      const notes = exists
        ? current.notes.map((note) => (note.id === normalized.id ? normalized : note))
        : [normalized, ...current.notes];
      return {
        ...current,
        notes,
        knowledgePoints: upsertKnowledgeFromNote(
          normalized,
          current.knowledgePoints,
          current.goals,
        ),
        reviewReminders: buildReviewSchedule(normalized, current.reviewReminders),
      };
    });
    setDraftNote(normalized);
    setSelectedNoteId(normalized.id);
    showNotice("已保存笔记，并自动更新知识点与间隔复习计划。");
  }

  function addPlanFromCurrentNote() {
    const plan = planFromNoteAction(draftNote);
    if (!plan) {
      showNotice("请先填写“下一步行动”。");
      return;
    }
    setState((current) => ({ ...current, plans: [plan, ...current.plans] }));
    showNotice("已把下一步行动加入下周计划。");
  }

  function createNewNote() {
    const note = createBlankNote(state.goals);
    setDraftNote(note);
    setSelectedNoteId(note.id);
    setActiveTab("notes");
  }

  function deleteCurrentNote() {
    if (!state.notes.some((note) => note.id === draftNote.id)) return;
    const nextNotes = state.notes.filter((note) => note.id !== draftNote.id);
    setState((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== draftNote.id),
      reviewReminders: current.reviewReminders.filter((reminder) => reminder.noteId !== draftNote.id),
      plans: current.plans.filter((plan) => plan.noteId !== draftNote.id),
      knowledgePoints: current.knowledgePoints
        .map((point) => ({
          ...point,
          noteIds: point.noteIds.filter((noteId) => noteId !== draftNote.id),
        }))
        .filter((point) => point.noteIds.length > 0),
    }));
    setSelectedNoteId(nextNotes[0]?.id ?? "");
    setDraftNote(nextNotes[0] ?? createBlankNote(state.goals));
    showNotice("已删除该笔记及相关待办、复习提醒。");
  }

  function updatePlanStatus(planId: string, status: PlanStatus) {
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.id === planId ? { ...plan, status } : plan)),
    }));
  }

  function updatePlan(planId: string, patch: Partial<StudyPlan>) {
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)),
    }));
  }

  function deletePlan(planId: string) {
    setState((current) => ({
      ...current,
      plans: current.plans.filter((plan) => plan.id !== planId),
    }));
    setEditingPlanId("");
  }

  function addManualPlan() {
    if (!planDraft.title.trim()) {
      showNotice("请填写计划标题。");
      return;
    }
    const selectedGoal = state.goals.find((goal) => goal.id === planDraft.goalId);
    const plan: StudyPlan = {
      id: uid("plan"),
      title: planDraft.title.trim(),
      scope: planDraft.scope,
      category: planDraft.category.trim() || selectedGoal?.category || "学习",
      track: selectedGoal?.track ?? planDraft.track,
      dueDate: planDraft.dueDate,
      status: "未开始",
      source: "手动",
      goalId: selectedGoal?.id,
      createdAt: todayIso(),
    };
    setState((current) => ({ ...current, plans: [plan, ...current.plans] }));
    setPlanDraft({ ...planDraft, title: "" });
    showNotice("已添加学习计划。");
  }

  function completeReview(reminder: ReviewReminder, score: number, mode: ReviewMode) {
    const now = todayIso();
    const nextInterval = nextIntervalByScore(score, reminder.intervalDays);
    const nextReviewAt = addDaysIso(now, nextInterval);
    const note = state.notes.find((item) => item.id === reminder.noteId);
    const record = {
      id: uid("record"),
      date: now,
      mode,
      score,
      result: score >= 4 ? "能讲清楚，进入下一轮间隔复习。" : "掌握不稳，需要补一项重学计划。",
      nextReviewAt,
    };

    setState((current) => {
      const nextReminder: ReviewReminder = {
        id: uid("review"),
        noteId: reminder.noteId,
        goalId: reminder.goalId ?? note?.associatedGoalIds[0],
        conceptName: reminder.conceptName,
        dueAt: nextReviewAt,
        intervalDays: nextInterval,
        status: "待复习",
        createdAt: now,
        lastScore: score,
      };
      const remedialPlan: StudyPlan | null =
        score <= 2 && note
          ? {
              id: uid("plan"),
              title: `重学并讲解：${note.title}`,
              scope: "今日",
              category: note.direction || note.type,
              track: note.tracks.includes("shared") ? "shared" : note.tracks[0],
              dueDate: addDaysIso(now, 1),
              status: "未开始",
              source: "复习系统",
              noteId: note.id,
              goalId: note.associatedGoalIds[0],
              createdAt: now,
            }
          : null;

      return {
        ...current,
        notes: current.notes.map((item) =>
          item.id === reminder.noteId
            ? { ...item, reviewRecords: [record, ...item.reviewRecords] }
            : item,
        ),
        reviewReminders: [
          ...current.reviewReminders.map((item) =>
            item.id === reminder.id
              ? { ...item, status: "已完成" as const, lastScore: score }
              : item,
          ),
          nextReminder,
        ],
        plans: remedialPlan ? [remedialPlan, ...current.plans] : current.plans,
      };
    });
    showNotice(score <= 2 ? "已记录复习结果，并生成重学计划。" : "已完成复习并安排下一轮。");
  }

  function createReflection() {
    const summary = buildWeeklySummary(state);
    const weekStart = getWeekStartIso();
    setState((current) => ({
      ...current,
      reflections: [
        {
          id: uid("reflection"),
          weekStart,
          goalFocusIds: goalInsights.slice(0, 3).map((insight) => insight.goal.id),
          generatedSummary: summary,
          wins: "",
          blockers: "",
          masteryNotes: "",
          nextWeekFocus: "",
          createdAt: todayIso(),
        },
        ...current.reflections,
      ],
    }));
    showNotice("已根据当前数据生成本周总结草稿，请补充反思。");
    setActiveTab("reflections");
  }

  function updateReflection(id: string, field: "wins" | "blockers" | "masteryNotes" | "nextWeekFocus", value: string) {
    setState((current) => ({
      ...current,
      reflections: current.reflections.map((reflection) =>
        reflection.id === id ? { ...reflection, [field]: value } : reflection,
      ),
    }));
  }

  function addGoal() {
    const template = getGoalTemplate(goalDraft.templateKey);
    const title = goalDraft.title.trim() || template.defaultTitle;
    if (!title) {
      showNotice("请填写目标标题。");
      return;
    }
    const now = todayIso();
    const goal: Goal = {
      id: uid("goal"),
      title,
      type: goalDraft.templateKey === "custom" ? "custom" : "template",
      templateKey: goalDraft.templateKey,
      domain: goalDraft.domain.trim() || template.domain,
      importance: goalDraft.importance,
      track: goalDraft.track,
      category: goalDraft.category.trim() || template.defaultCategory || trackLabels[goalDraft.track],
      deadline: goalDraft.deadline,
      weeklyHours: goalDraft.weeklyHours,
      currentLevel: goalDraft.currentLevel.trim(),
      progress: 0,
      status: "进行中",
      description: goalDraft.description.trim(),
      linkedKnowledge: template.suggestions,
      createdAt: now,
      updatedAt: now,
    };
    setState((current) => ({ ...current, goals: [goal, ...current.goals] }));
    setGoalDraft({
      ...goalDraft,
      title: "",
      currentLevel: "",
      description: "",
    });
    showNotice("已添加目标。");
  }

  function updateGoalProgress(goalId: string, progress: number) {
    setState((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress,
              status: progress >= 100 ? "已完成" : goal.status,
              updatedAt: todayIso(),
            }
          : goal,
      ),
    }));
  }

  function updateGoal(goalId: string, patch: Partial<Goal>) {
    setState((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, ...patch, updatedAt: todayIso() } : goal,
      ),
    }));
  }

  function deleteGoal(goalId: string) {
    setState((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== goalId),
      notes: current.notes.map((note) => ({
        ...note,
        associatedGoalIds: note.associatedGoalIds.filter((id) => id !== goalId),
      })),
      knowledgePoints: current.knowledgePoints.map((point) => ({
        ...point,
        goalIds: point.goalIds.filter((id) => id !== goalId),
      })),
      plans: current.plans.map((plan) =>
        plan.goalId === goalId ? { ...plan, goalId: undefined } : plan,
      ),
      reviewReminders: current.reviewReminders.map((reminder) =>
        reminder.goalId === goalId ? { ...reminder, goalId: undefined } : reminder,
      ),
    }));
    setEditingGoalId("");
  }

  function applyGoalTemplate(templateKey: string) {
    const template = getGoalTemplate(templateKey);
    setGoalDraft({
      title: template.defaultTitle,
      templateKey,
      domain: template.domain,
      track: template.track,
      category: template.defaultCategory,
      deadline: goalDraft.deadline,
      importance: template.defaultImportance,
      weeklyHours: template.defaultWeeklyHours,
      currentLevel: "",
      description: "",
    });
  }

  function addProject() {
    if (!projectDraft.title.trim()) {
      showNotice("请填写项目标题。");
      return;
    }
    const project: PortfolioProject = {
      id: uid("project"),
      title: projectDraft.title.trim(),
      track: projectDraft.track,
      techStack: splitList(projectDraft.techStack),
      difficulty: projectDraft.difficulty.trim(),
      learnings: projectDraft.learnings.trim(),
      nextAction: projectDraft.nextAction.trim(),
      linkedNoteIds: [],
      createdAt: todayIso(),
    };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setProjectDraft({
      title: "",
      track: "career",
      techStack: "",
      difficulty: "",
      learnings: "",
      nextAction: "",
    });
    showNotice("已添加项目作品记录。");
  }

  function updateProject(projectId: string, patch: Partial<PortfolioProject>) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch } : project,
      ),
    }));
  }

  function deleteProject(projectId: string) {
    setState((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
    }));
    setEditingProjectId("");
  }

  async function runAi() {
    setAiOutput("后端 AI 接口请求中...");
    try {
      const output = await runBackendAi(aiAction, selectedNote?.id);
      setAiOutput(`${output}\n\n来源：后端 AI 接口`);
    } catch {
      const output = runLocalAi(aiAction, state, selectedNote);
      setAiOutput(`${output}\n\n来源：本地 fallback`);
    }
  }

  function addAiOutputToPlan() {
    const firstLine = aiOutput
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .find(Boolean);
    if (!firstLine) {
      showNotice("先生成 AI 建议。");
      return;
    }
    const plan: StudyPlan = {
      id: uid("plan"),
      title: firstLine,
      scope: "下周",
      category: topGoalInsight?.goal.category || "AI 建议",
      track: topGoalInsight?.goal.track || "shared",
      dueDate: addDaysIso(todayIso(), 7),
      status: "未开始",
      source: "AI建议",
      goalId: topGoalInsight?.goal.id,
      createdAt: todayIso(),
    };
    setState((current) => ({ ...current, plans: [plan, ...current.plans] }));
    showNotice("已把第一条 AI 建议加入下周计划。");
  }

  function importBackup(file: File | null) {
    if (!file) return;
    file.text().then((text) => {
      try {
        setState(normalizeState(JSON.parse(text)));
        showNotice("已导入备份数据。");
      } catch {
        showNotice("导入失败：JSON 格式不正确。");
      }
    });
  }

  function renderDashboard() {
    return (
      <div className="stack">
        <section className="dashboard-grid">
          <MetricCard label="目标" value={state.goals.length} hint="用户自定义学习方向" />
          <MetricCard label="到期复习" value={due.length} hint="今天需要处理" tone="warning" />
          <MetricCard label="计划完成率" value={`${planRate}%`} hint="当前计划池" tone="success" />
          <MetricCard
            label="当前优先"
            value={topGoalInsight ? topGoalInsight.priorityScore : "-"}
            hint={topGoalInsight?.goal.title || "先创建一个核心目标"}
            tone="info"
          />
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">目标驱动闭环</p>
              <h2>从目标到笔记、复习、计划和复盘</h2>
            </div>
            <button className="primary-button" onClick={createNewNote}>
              <Plus size={18} />
              新建笔记
            </button>
          </div>
          <div className="flow-row">
            {["定义目标", "关联笔记", "提取知识点", "生成复习", "计划推进", "目标复盘"].map(
              (step, index) => (
                <div className="flow-step" key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">目标优先级</p>
                <h2>当前最该关注</h2>
              </div>
              <button className="ghost-button" onClick={() => setActiveTab("goals")}>
                查看全部
              </button>
            </div>
            <div className="goal-priority-list">
              {goalInsights.slice(0, 4).map((insight) => (
                <div className="goal-priority-row" key={insight.goal.id}>
                  <div>
                    <strong>{insight.goal.title}</strong>
                    <span>
                      {insight.goal.domain} · {goalImportanceLabels[insight.goal.importance]} ·{" "}
                      {insight.reasons.join("、") || "持续推进"}
                    </span>
                  </div>
                  <b>{insight.priorityScore}</b>
                </div>
              ))}
              {goalInsights.length === 0 && <EmptyState text="还没有目标，先创建一个核心学习目标。" />}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">今日优先</p>
                <h2>到期复习</h2>
              </div>
              <button className="ghost-button" onClick={() => setActiveTab("reviews")}>
                查看全部
              </button>
            </div>
            <div className="card-list">
              {due.slice(0, 4).map((reminder) => (
                <ReviewCard
                  key={reminder.id}
                  reminder={reminder}
                  note={state.notes.find((note) => note.id === reminder.noteId)}
                  goalTitle={getReminderGoalTitle(reminder)}
                  onComplete={completeReview}
                />
              ))}
              {due.length === 0 && <EmptyState text="今天没有到期复习，可以做一次主动输出。" />}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">目标进度分析</p>
              <h2>按目标查看学习投入</h2>
            </div>
            <button className="ghost-button" onClick={createReflection}>
              生成周总结
            </button>
          </div>
          <div className="goal-bars">
            {goalInsights.map((insight) => (
              <div className="goal-bar" key={insight.goal.id}>
                <div>
                  <strong>{insight.goal.title}</strong>
                  <span>
                    {insight.goal.domain} · 笔记 {insight.noteCount} · 到期复习{" "}
                    {insight.dueReviewCount} · {insight.risk}
                  </span>
                </div>
                <div className="progress">
                  <i style={{ width: `${insight.goal.progress}%` }} />
                </div>
                <b>{insight.goal.progress}%</b>
              </div>
            ))}
            {goalInsights.length === 0 && <EmptyState text="暂无目标分析。" />}
          </div>
        </section>
      </div>
    );
  }

  function renderNotes() {
    return (
      <section className="workspace-grid">
        <aside className="panel list-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">笔记库</p>
              <h2>{state.notes.length} 篇</h2>
            </div>
            <button className="icon-button" onClick={createNewNote} title="新建笔记">
              <Plus size={18} />
            </button>
          </div>
          <div className="note-list">
            {state.notes.map((note) => (
              <button
                className={`note-item ${note.id === draftNote.id ? "active" : ""}`}
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
              >
                <strong>{note.title}</strong>
                <span>{note.direction}</span>
                <small>{note.mastery} · {note.importance}重要</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel editor-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">结构化笔记</p>
              <h2>{draftNote.title}</h2>
            </div>
            <div className="button-row">
              <button className="ghost-button danger" onClick={deleteCurrentNote}>
                <Trash2 size={16} />
                删除
              </button>
              <button className="primary-button" onClick={saveDraftNote}>
                <CheckCircle2 size={18} />
                保存并生成复习
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label>
              标题
              <input
                value={draftNote.title}
                onChange={(event) => setDraftNote({ ...draftNote, title: event.target.value })}
              />
            </label>
            <label>
              类型
              <select
                value={draftNote.type}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, type: event.target.value as NoteType })
                }
              >
                {noteTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              所属方向
              <input
                value={draftNote.direction}
                onChange={(event) => setDraftNote({ ...draftNote, direction: event.target.value })}
              />
            </label>
            <label>
              掌握程度
              <select
                value={draftNote.mastery}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, mastery: event.target.value as Note["mastery"] })
                }
              >
                {masteries.map((mastery) => (
                  <option key={mastery}>{mastery}</option>
                ))}
              </select>
            </label>
            <label>
              重要程度
              <select
                value={draftNote.importance}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, importance: event.target.value as Importance })
                }
              >
                {importances.map((importance) => (
                  <option key={importance}>{importance}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="choice-block">
            <span>标签</span>
            <div className="chips">
              {tracks.map((track) => (
                <button
                  className={`chip ${draftNote.tracks.includes(track) ? "selected" : ""}`}
                  key={track}
                  onClick={() => {
                    const exists = draftNote.tracks.includes(track);
                    const next = exists
                      ? draftNote.tracks.filter((item) => item !== track)
                      : [...draftNote.tracks, track];
                    setDraftNote({ ...draftNote, tracks: next.length ? next : [track] });
                  }}
                >
                  {trackLabels[track]}
                </button>
              ))}
            </div>
          </div>

          <div className="choice-block">
            <span>关联目标</span>
            <div className="chips">
              {state.goals.map((goal) => (
                <button
                  className={`chip ${draftNote.associatedGoalIds.includes(goal.id) ? "selected" : ""}`}
                  key={goal.id}
                  onClick={() => {
                    const exists = draftNote.associatedGoalIds.includes(goal.id);
                    setDraftNote({
                      ...draftNote,
                      associatedGoalIds: exists
                        ? draftNote.associatedGoalIds.filter((id) => id !== goal.id)
                        : [...draftNote.associatedGoalIds, goal.id],
                    });
                  }}
                >
                  {goal.title}
                </button>
              ))}
            </div>
          </div>

          <div className="editor-fields">
            <label>
              内容摘要
              <textarea
                value={draftNote.summary}
                onChange={(event) => setDraftNote({ ...draftNote, summary: event.target.value })}
              />
            </label>
            <label>
              核心概念
              <textarea
                value={draftNote.coreConcepts.join("\n")}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, coreConcepts: splitList(event.target.value) })
                }
              />
            </label>
            <label>
              常见问题
              <textarea
                value={draftNote.commonQuestions.join("\n")}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, commonQuestions: splitList(event.target.value) })
                }
              />
            </label>
            <label>
              我的理解
              <textarea
                className="tall"
                value={draftNote.myUnderstanding}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, myUnderstanding: event.target.value })
                }
              />
            </label>
            <label className="wide-field">
              Markdown 内容
              <textarea
                className="tall"
                value={draftNote.content}
                onChange={(event) => setDraftNote({ ...draftNote, content: event.target.value })}
              />
            </label>
            <label className="wide-field">
              下一步行动
              <input
                value={draftNote.nextAction}
                onChange={(event) =>
                  setDraftNote({ ...draftNote, nextAction: event.target.value })
                }
              />
            </label>
          </div>

          <div className="closure-panel">
            <Lightbulb size={18} />
            <div>
              <strong>闭环检查</strong>
              <p>保存笔记会更新知识点和第 1/3/7/14/30 天复习提醒。下一步行动可以直接转入下周计划。</p>
            </div>
            <button className="ghost-button" onClick={addPlanFromCurrentNote}>
              加入下周计划
            </button>
          </div>
        </section>
      </section>
    );
  }

  function renderKnowledge() {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">标签 / 知识点</p>
            <h2>把笔记拆成可复习的知识点</h2>
          </div>
        </div>
        <div className="data-table">
          <div className="table-head">
            <span>知识点</span>
            <span>路线</span>
            <span>掌握</span>
            <span>优先级</span>
            <span>关联目标</span>
            <span>来源笔记</span>
          </div>
          {state.knowledgePoints.map((point) => (
            <div className="table-row" key={point.id}>
              <strong>{point.name}</strong>
              <span>{point.tracks.map((track) => trackShortLabels[track]).join(" / ")}</span>
              <Badge tone="neutral">{point.mastery}</Badge>
              <Badge tone={point.reviewPriority === "高" ? "danger" : "neutral"}>
                {point.reviewPriority}
              </Badge>
              <span>
                {state.goals
                  .filter((goal) => point.goalIds.includes(goal.id))
                  .map((goal) => goal.title)
                  .join("、") || "未关联"}
              </span>
              <span>
                {state.notes
                  .filter((note) => point.noteIds.includes(note.id))
                  .map((note) => note.title)
                  .join("、")}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderPlans() {
    return (
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">学习计划</p>
              <h2>每日 / 每周任务</h2>
            </div>
          </div>
          <div className="inline-form">
            <input
              placeholder="计划标题"
              value={planDraft.title}
              onChange={(event) => setPlanDraft({ ...planDraft, title: event.target.value })}
            />
            <select
              value={planDraft.scope}
              onChange={(event) =>
                setPlanDraft({ ...planDraft, scope: event.target.value as PlanScope })
              }
            >
              {planScopes.map((scope) => (
                <option key={scope}>{scope}</option>
              ))}
            </select>
            <select
              value={planDraft.goalId}
              onChange={(event) => {
                const goal = state.goals.find((item) => item.id === event.target.value);
                setPlanDraft({
                  ...planDraft,
                  goalId: event.target.value,
                  track: goal?.track ?? planDraft.track,
                  category: goal?.category ?? planDraft.category,
                });
              }}
            >
              <option value="">不绑定目标</option>
              {goalInsights.map((insight) => (
                <option key={insight.goal.id} value={insight.goal.id}>
                  {insight.goal.title}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={planDraft.dueDate}
              onChange={(event) => setPlanDraft({ ...planDraft, dueDate: event.target.value })}
            />
            <button className="primary-button" onClick={addManualPlan}>
              <Plus size={18} />
              添加
            </button>
          </div>
        </section>

        <section className="plan-board">
          {planScopes.map((scope) => (
            <div className="panel" key={scope}>
              <h2>{scope}</h2>
              <div className="card-list">
                {state.plans
                  .filter((plan) => plan.scope === scope)
                  .map((plan) => {
                    const linkedGoal = state.goals.find((goal) => goal.id === plan.goalId);
                    return (
                      <div className="task-card" key={plan.id}>
                        {editingPlanId === plan.id ? (
                          <div className="inline-editor">
                            <input
                              value={plan.title}
                              onChange={(event) => updatePlan(plan.id, { title: event.target.value })}
                            />
                            <input
                              value={plan.category}
                              onChange={(event) =>
                                updatePlan(plan.id, { category: event.target.value })
                              }
                            />
                            <div className="compact-edit-row">
                              <select
                                value={plan.scope}
                                onChange={(event) =>
                                  updatePlan(plan.id, { scope: event.target.value as PlanScope })
                                }
                              >
                                {planScopes.map((item) => (
                                  <option key={item}>{item}</option>
                                ))}
                              </select>
                              <select
                                value={plan.goalId ?? ""}
                                onChange={(event) => {
                                  const goal = state.goals.find((item) => item.id === event.target.value);
                                  updatePlan(plan.id, {
                                    goalId: goal?.id,
                                    track: goal?.track ?? plan.track,
                                    category: goal?.category ?? plan.category,
                                  });
                                }}
                              >
                                <option value="">不绑定目标</option>
                                {goalInsights.map((insight) => (
                                  <option key={insight.goal.id} value={insight.goal.id}>
                                    {insight.goal.title}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={plan.dueDate}
                                onChange={(event) =>
                                  updatePlan(plan.id, { dueDate: event.target.value })
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <strong>{plan.title}</strong>
                            <span>
                              {linkedGoal
                                ? `${linkedGoal.title} · ${linkedGoal.domain}`
                                : `${trackShortLabels[plan.track]} · ${plan.category}`}{" "}
                              · {plan.source}
                            </span>
                          </div>
                        )}
                        <small>截止 {plan.dueDate}</small>
                        <div className="card-actions">
                          <select
                            value={plan.status}
                            onChange={(event) =>
                              updatePlanStatus(plan.id, event.target.value as PlanStatus)
                            }
                          >
                            {planStatuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                          <button
                            className="ghost-button"
                            onClick={() =>
                              setEditingPlanId(editingPlanId === plan.id ? "" : plan.id)
                            }
                          >
                            <Pencil size={15} />
                            {editingPlanId === plan.id ? "完成" : "编辑"}
                          </button>
                          <button className="ghost-button danger" onClick={() => deletePlan(plan.id)}>
                            <Trash2 size={15} />
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {state.plans.filter((plan) => plan.scope === scope).length === 0 && (
                  <EmptyState text="暂无计划" />
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  function renderReviews() {
    return (
      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">复习系统</p>
              <h2>今日到期</h2>
            </div>
          </div>
          <div className="card-list">
            {due.map((reminder) => (
              <ReviewCard
                key={reminder.id}
                reminder={reminder}
                note={state.notes.find((note) => note.id === reminder.noteId)}
                goalTitle={getReminderGoalTitle(reminder)}
                onComplete={completeReview}
              />
            ))}
            {due.length === 0 && <EmptyState text="没有到期项。" />}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">间隔重复</p>
              <h2>未来提醒</h2>
            </div>
          </div>
          <div className="timeline">
            {upcoming.slice(0, 12).map((reminder) => {
              const note = state.notes.find((item) => item.id === reminder.noteId);
              return (
                <div className="timeline-item" key={reminder.id}>
                  <span>{reminder.dueAt}</span>
                  <strong>{note?.title ?? "已删除笔记"}</strong>
                  <small>
                    第 {reminder.intervalDays} 天 · {reminder.conceptName || "整篇笔记"} ·{" "}
                    {getReminderGoalTitle(reminder) || "未关联目标"}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function renderReflections() {
    return (
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">总结与反思</p>
              <h2>每周自动总结，手动补反思</h2>
            </div>
            <button className="primary-button" onClick={createReflection}>
              <RefreshCcw size={18} />
              生成本周总结
            </button>
          </div>
        </section>
        {state.reflections.map((reflection) => (
          <section className="panel reflection-card" key={reflection.id}>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">周起始 {reflection.weekStart}</p>
                <h2>学习复盘</h2>
                <span className="muted-line">
                  目标焦点：
                  {state.goals
                    .filter((goal) => reflection.goalFocusIds?.includes(goal.id))
                    .map((goal) => goal.title)
                    .join("、") || "未指定"}
                </span>
              </div>
            </div>
            <pre>{reflection.generatedSummary}</pre>
            <div className="editor-fields">
              <label>
                本周有效收获
                <textarea
                  value={reflection.wins}
                  onChange={(event) => updateReflection(reflection.id, "wins", event.target.value)}
                />
              </label>
              <label>
                卡点 / 没懂的地方
                <textarea
                  value={reflection.blockers}
                  onChange={(event) =>
                    updateReflection(reflection.id, "blockers", event.target.value)
                  }
                />
              </label>
              <label>
                掌握程度判断
                <textarea
                  value={reflection.masteryNotes}
                  onChange={(event) =>
                    updateReflection(reflection.id, "masteryNotes", event.target.value)
                  }
                />
              </label>
              <label>
                下周重点
                <textarea
                  value={reflection.nextWeekFocus}
                  onChange={(event) =>
                    updateReflection(reflection.id, "nextWeekFocus", event.target.value)
                  }
                />
              </label>
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderGoals() {
    const selectedTemplate = getGoalTemplate(goalDraft.templateKey);

    return (
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">目标初始化</p>
              <h2>选择模板，或创建自定义学习目标</h2>
            </div>
          </div>
          <div className="goal-template-grid">
            {goalTemplates.map((template) => (
              <button
                className={`goal-template-card ${goalDraft.templateKey === template.key ? "active" : ""}`}
                key={template.key}
                onClick={() => applyGoalTemplate(template.key)}
              >
                <strong>{template.label}</strong>
                <span>{template.domain}</span>
              </button>
            ))}
          </div>

          <div className="form-grid goal-form-grid">
            <label>
              目标名称
              <input
                placeholder="例如：2027 考研计算机"
                value={goalDraft.title}
                onChange={(event) => setGoalDraft({ ...goalDraft, title: event.target.value })}
              />
            </label>
            <label>
              目标方向
              <input
                placeholder="考研、就业、英语六级、毕业设计..."
                value={goalDraft.domain}
                onChange={(event) => setGoalDraft({ ...goalDraft, domain: event.target.value })}
              />
            </label>
            <label>
              分类结构
              <input
                placeholder="数学 / 英语 / 专业课"
                value={goalDraft.category}
                onChange={(event) => setGoalDraft({ ...goalDraft, category: event.target.value })}
              />
            </label>
            <label>
              截止时间
              <input
                type="date"
                value={goalDraft.deadline}
                onChange={(event) => setGoalDraft({ ...goalDraft, deadline: event.target.value })}
              />
            </label>
            <label>
              重要程度
              <select
                value={goalDraft.importance}
                onChange={(event) =>
                  setGoalDraft({
                    ...goalDraft,
                    importance: Number(event.target.value) as GoalImportance,
                  })
                }
              >
                {([1, 2, 3, 4, 5] as GoalImportance[]).map((importance) => (
                  <option key={importance} value={importance}>
                    {importance} · {goalImportanceLabels[importance]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              每周投入小时
              <input
                type="number"
                min="0"
                value={goalDraft.weeklyHours}
                onChange={(event) =>
                  setGoalDraft({ ...goalDraft, weeklyHours: Number(event.target.value) })
                }
              />
            </label>
            <label className="wide-field">
              当前基础
              <textarea
                placeholder={selectedTemplate.descriptionHint}
                value={goalDraft.currentLevel}
                onChange={(event) =>
                  setGoalDraft({ ...goalDraft, currentLevel: event.target.value })
                }
              />
            </label>
            <label className="wide-field">
              目标说明
              <textarea
                placeholder="写清楚完成标准、阶段产出或需要覆盖的能力范围"
                value={goalDraft.description}
                onChange={(event) =>
                  setGoalDraft({ ...goalDraft, description: event.target.value })
                }
              />
            </label>
          </div>

          <div className="goal-suggestion-row">
            <span>建议初始分类</span>
            <div className="chips compact-chips">
              {(selectedTemplate.suggestions.length
                ? selectedTemplate.suggestions
                : ["笔记", "计划", "复习", "复盘"]
              ).map((item) => (
                <span className="chip static" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <button className="primary-button" onClick={addGoal}>
              <Plus size={18} />
              添加目标
            </button>
          </div>
        </section>

        <section className="goal-grid">
          {goalInsights.map((insight) => {
            const goal = insight.goal;
            const daysText =
              insight.daysLeft === null
                ? "无截止"
                : insight.daysLeft < 0
                  ? `已超 ${Math.abs(insight.daysLeft)} 天`
                  : `剩 ${insight.daysLeft} 天`;
            return (
            <div className="panel goal-card" key={goal.id}>
              <div className="card-title-row">
                <div className="goal-badges">
                  <Badge tone={goal.importance >= 5 ? "danger" : goal.importance >= 4 ? "warning" : "neutral"}>
                    {goalImportanceLabels[goal.importance]}
                  </Badge>
                  <Badge tone={goal.track === "shared" ? "info" : "neutral"}>{goal.domain}</Badge>
                  <Badge tone={goal.status === "进行中" ? "success" : "neutral"}>{goal.status}</Badge>
                </div>
                <div className="card-actions">
                  <button
                    className="ghost-button"
                    onClick={() => setEditingGoalId(editingGoalId === goal.id ? "" : goal.id)}
                  >
                    <Pencil size={15} />
                    {editingGoalId === goal.id ? "完成" : "编辑"}
                  </button>
                  <button className="ghost-button danger" onClick={() => deleteGoal(goal.id)}>
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </div>
              {editingGoalId === goal.id ? (
                <div className="inline-editor">
                  <input
                    value={goal.title}
                    onChange={(event) => updateGoal(goal.id, { title: event.target.value })}
                  />
                  <div className="compact-edit-row">
                    <input
                      value={goal.domain}
                      onChange={(event) => updateGoal(goal.id, { domain: event.target.value })}
                    />
                    <input
                      value={goal.category}
                      onChange={(event) => updateGoal(goal.id, { category: event.target.value })}
                    />
                    <input
                      type="date"
                      value={goal.deadline}
                      onChange={(event) => updateGoal(goal.id, { deadline: event.target.value })}
                    />
                  </div>
                  <div className="compact-edit-row">
                    <select
                      value={goal.importance}
                      onChange={(event) =>
                        updateGoal(goal.id, {
                          importance: Number(event.target.value) as GoalImportance,
                        })
                      }
                    >
                      {([1, 2, 3, 4, 5] as GoalImportance[]).map((importance) => (
                        <option key={importance} value={importance}>
                          {importance} · {goalImportanceLabels[importance]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={goal.status}
                      onChange={(event) =>
                        updateGoal(goal.id, { status: event.target.value as Goal["status"] })
                      }
                    >
                      {goalStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={goal.weeklyHours ?? 0}
                      onChange={(event) =>
                        updateGoal(goal.id, { weeklyHours: Number(event.target.value) })
                      }
                    />
                  </div>
                  <input
                    value={goal.currentLevel ?? ""}
                    onChange={(event) => updateGoal(goal.id, { currentLevel: event.target.value })}
                    placeholder="当前基础"
                  />
                  <textarea
                    value={goal.description}
                    onChange={(event) => updateGoal(goal.id, { description: event.target.value })}
                  />
                </div>
              ) : (
                <>
                  <h2>{goal.title}</h2>
                  <p>{goal.description}</p>
                  <span>{goal.category} · {daysText} · 每周 {goal.weeklyHours ?? 0} 小时</span>
                  {goal.currentLevel && <small className="muted-line">当前基础：{goal.currentLevel}</small>}
                </>
              )}
              <div className="goal-score-row">
                <strong>优先级 {insight.priorityScore}</strong>
                <span>{insight.reasons.join("、") || "按当前节奏推进"}</span>
              </div>
              <div className="progress large">
                <i style={{ width: `${goal.progress}%` }} />
              </div>
              <div className="range-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress}
                  onChange={(event) => updateGoalProgress(goal.id, Number(event.target.value))}
                />
                <b>{goal.progress}%</b>
              </div>
              <div className="mini-stat-grid">
                <span>笔记 <b>{insight.noteCount}</b></span>
                <span>到期 <b>{insight.dueReviewCount}</b></span>
                <span>计划 <b>{insight.planCompletionRate}%</b></span>
                <span>掌握 <b>{insight.averageMastery}</b></span>
              </div>
              <p className="risk-line">{insight.risk}</p>
              <div className="chips compact-chips">
                {goal.linkedKnowledge.map((item) => (
                  <span className="chip static" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            );
          })}
        </section>
      </div>
    );
  }

  function renderProjects() {
    return (
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">项目作品集</p>
              <h2>把学习结果变成作品</h2>
            </div>
          </div>
          <div className="inline-form project-form">
            <input
              placeholder="项目名称"
              value={projectDraft.title}
              onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })}
            />
            <select
              value={projectDraft.track}
              onChange={(event) =>
                setProjectDraft({ ...projectDraft, track: event.target.value as Track })
              }
            >
              {tracks.map((track) => (
                <option key={track} value={track}>
                  {trackLabels[track]}
                </option>
              ))}
            </select>
            <input
              placeholder="技术栈，用逗号分隔"
              value={projectDraft.techStack}
              onChange={(event) =>
                setProjectDraft({ ...projectDraft, techStack: event.target.value })
              }
            />
            <input
              placeholder="下一步行动"
              value={projectDraft.nextAction}
              onChange={(event) =>
                setProjectDraft({ ...projectDraft, nextAction: event.target.value })
              }
            />
            <button className="primary-button" onClick={addProject}>
              <Plus size={18} />
              添加
            </button>
          </div>
          <div className="editor-fields project-extra-fields">
            <label>
              难点
              <textarea
                value={projectDraft.difficulty}
                onChange={(event) =>
                  setProjectDraft({ ...projectDraft, difficulty: event.target.value })
                }
              />
            </label>
            <label>
              收获
              <textarea
                value={projectDraft.learnings}
                onChange={(event) =>
                  setProjectDraft({ ...projectDraft, learnings: event.target.value })
                }
              />
            </label>
          </div>
        </section>

        <section className="project-grid">
          {state.projects.map((project) => (
            <div className="panel project-card" key={project.id}>
              <div className="card-title-row">
                <Badge tone={project.track === "shared" ? "info" : "neutral"}>
                  {trackLabels[project.track]}
                </Badge>
                <div className="card-actions">
                  <button
                    className="ghost-button"
                    onClick={() =>
                      setEditingProjectId(editingProjectId === project.id ? "" : project.id)
                    }
                  >
                    <Pencil size={15} />
                    {editingProjectId === project.id ? "完成" : "编辑"}
                  </button>
                  <button
                    className="ghost-button danger"
                    onClick={() => deleteProject(project.id)}
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </div>
              {editingProjectId === project.id ? (
                <div className="inline-editor">
                  <input
                    value={project.title}
                    onChange={(event) => updateProject(project.id, { title: event.target.value })}
                  />
                  <div className="compact-edit-row">
                    <select
                      value={project.track}
                      onChange={(event) =>
                        updateProject(project.id, { track: event.target.value as Track })
                      }
                    >
                      {tracks.map((track) => (
                        <option key={track} value={track}>
                          {trackLabels[track]}
                        </option>
                      ))}
                    </select>
                    <input
                      value={project.techStack.join("，")}
                      onChange={(event) =>
                        updateProject(project.id, { techStack: splitList(event.target.value) })
                      }
                    />
                  </div>
                  <textarea
                    value={project.difficulty}
                    onChange={(event) =>
                      updateProject(project.id, { difficulty: event.target.value })
                    }
                  />
                  <textarea
                    value={project.learnings}
                    onChange={(event) =>
                      updateProject(project.id, { learnings: event.target.value })
                    }
                  />
                  <input
                    value={project.nextAction}
                    onChange={(event) =>
                      updateProject(project.id, { nextAction: event.target.value })
                    }
                  />
                </div>
              ) : (
                <>
                  <h2>{project.title}</h2>
                  <div className="chips compact-chips">
                    {project.techStack.map((tech) => (
                      <span className="chip static" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                  <dl>
                    <dt>难点</dt>
                    <dd>{project.difficulty || "待补充"}</dd>
                    <dt>收获</dt>
                    <dd>{project.learnings || "待补充"}</dd>
                    <dt>下一步</dt>
                    <dd>{project.nextAction || "待补充"}</dd>
                  </dl>
                </>
              )}
            </div>
          ))}
        </section>
      </div>
    );
  }

  function renderAi() {
    return (
      <section className="two-column ai-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AI 助手</p>
              <h2>第一阶段本地能力</h2>
            </div>
          </div>
          <label>
            动作
            <select value={aiAction} onChange={(event) => setAiAction(event.target.value as AiAction)}>
              {Object.entries(aiActionLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            笔记
            <select value={selectedNoteId} onChange={(event) => setSelectedNoteId(event.target.value)}>
              {state.notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button className="primary-button" onClick={runAi}>
              <Bot size={18} />
              生成
            </button>
            <button className="ghost-button" onClick={addAiOutputToPlan}>
              加入下周计划
            </button>
          </div>
        </div>
        <div className="panel ai-output">
          <pre>{aiOutput || "选择动作后生成内容。AI 接口留在 lib/ai.ts 中，后续可以替换为真实模型调用。"}</pre>
        </div>
      </section>
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "notes":
        return renderNotes();
      case "knowledge":
        return renderKnowledge();
      case "plans":
        return renderPlans();
      case "reviews":
        return renderReviews();
      case "reflections":
        return renderReflections();
      case "goals":
        return renderGoals();
      case "projects":
        return renderProjects();
      case "ai":
        return renderAi();
    }
  }

  if (authLoading) {
    return <LoadingScreen text="正在检查登录状态..." />;
  }

  if (!currentUser) {
    return (
      <AuthScreen
        mode={authMode}
        form={authForm}
        error={authError}
        submitting={authSubmitting}
        onModeChange={setAuthMode}
        onFormChange={setAuthForm}
        onSubmit={submitAuth}
      />
    );
  }

  if (state.goals.length === 0) {
    return (
      <GoalOnboardingScreen
        currentUser={currentUser}
        draft={goalDraft}
        onDraftChange={setGoalDraft}
        onApplyTemplate={applyGoalTemplate}
        onAddGoal={addGoal}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>学</span>
          <div>
            <strong>个人学习系统</strong>
            <small>目标驱动 v2</small>
          </div>
        </div>
        <nav>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-tools">
          <button className="ghost-button" onClick={() => exportState(state)}>
            <Download size={16} />
            导出
          </button>
          <label className="ghost-button file-button">
            <Upload size={16} />
            导入
            <input
              type="file"
              accept="application/json"
              onChange={(event) => importBackup(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className="ghost-button danger"
            onClick={() => {
              setState(resetState());
              showNotice("已恢复示例数据。");
            }}
          >
            <RefreshCwIcon />
            重置
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">今天 {todayIso()}</p>
            <h1>{tabs.find((tab) => tab.key === activeTab)?.label}</h1>
          </div>
          <div className="top-actions">
            <Badge tone="neutral">{currentUser.username}</Badge>
            <Badge tone={syncStatus === "error" ? "danger" : syncStatus === "saving" ? "warning" : "success"}>
              {syncStatus === "saving" ? "同步中" : syncStatus === "error" ? "同步失败" : "已同步"}
            </Badge>
            <Badge tone={due.length > 0 ? "danger" : "success"}>{due.length} 个到期复习</Badge>
            <Badge tone="info">{planRate}% 计划完成率</Badge>
            <button className="ghost-button" onClick={handleLogout}>
              <LogOut size={16} />
              退出
            </button>
          </div>
        </header>
        {renderActiveTab()}
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function ReviewCard({
  reminder,
  note,
  goalTitle,
  onComplete,
}: {
  reminder: ReviewReminder;
  note?: Note;
  goalTitle?: string;
  onComplete: (reminder: ReviewReminder, score: number, mode: ReviewMode) => void;
}) {
  return (
    <div className="review-card">
      <div>
        <strong>{note?.title ?? "已删除笔记"}</strong>
        <span>{reminder.conceptName || "整篇笔记"} · 第 {reminder.intervalDays} 天</span>
        <span>{goalTitle || "未关联目标"}</span>
        <small>到期 {reminder.dueAt}</small>
      </div>
      <div className="review-actions">
        <button onClick={() => onComplete(reminder, 5, "费曼讲解")}>能讲清</button>
        <button onClick={() => onComplete(reminder, 3, "自测")}>基本会</button>
        <button onClick={() => onComplete(reminder, 2, "复习")}>需重学</button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function RefreshCwIcon() {
  return <RefreshCwFallback />;
}

function RefreshCwFallback() {
  return <RefreshCcw size={16} />;
}

export default App;

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand">
          <span>学</span>
          <div>
            <strong>个人学习系统</strong>
            <small>{text}</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalOnboardingScreen({
  currentUser,
  draft,
  onDraftChange,
  onApplyTemplate,
  onAddGoal,
  onLogout,
}: {
  currentUser: AuthUser;
  draft: GoalDraft;
  onDraftChange: (draft: GoalDraft) => void;
  onApplyTemplate: (templateKey: string) => void;
  onAddGoal: () => void;
  onLogout: () => void;
}) {
  const selectedTemplate = getGoalTemplate(draft.templateKey);

  return (
    <div className="onboarding-page">
      <section className="onboarding-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">首次目标初始化</p>
            <h1>先创建一个学习目标</h1>
            <p className="onboarding-copy">
              系统会围绕目标组织笔记、计划、复习、总结和 AI 建议。目标方向可以自由填写，例如英语六级、毕业设计、软考、Java 后端或读书计划。
            </p>
          </div>
          <div className="top-actions">
            <Badge tone="neutral">{currentUser.username}</Badge>
            <button className="ghost-button" onClick={onLogout}>
              <LogOut size={16} />
              退出
            </button>
          </div>
        </div>

        <div className="goal-template-grid">
          {goalTemplates.map((template) => (
            <button
              className={`goal-template-card ${draft.templateKey === template.key ? "active" : ""}`}
              key={template.key}
              onClick={() => onApplyTemplate(template.key)}
            >
              <strong>{template.label}</strong>
              <span>{template.domain}</span>
            </button>
          ))}
        </div>

        <div className="form-grid goal-form-grid">
          <label>
            目标名称
            <input
              autoFocus
              placeholder="例如：英语六级真题刷完"
              value={draft.title}
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            目标方向
            <input
              placeholder="英语六级、毕业设计、软考、Java 后端..."
              value={draft.domain}
              onChange={(event) => onDraftChange({ ...draft, domain: event.target.value })}
            />
          </label>
          <label>
            分类结构
            <input
              placeholder="真题 / 单词 / 听力 / 作文"
              value={draft.category}
              onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}
            />
          </label>
          <label>
            截止时间
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) => onDraftChange({ ...draft, deadline: event.target.value })}
            />
          </label>
          <label>
            重要程度
            <select
              value={draft.importance}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  importance: Number(event.target.value) as GoalImportance,
                })
              }
            >
              {([1, 2, 3, 4, 5] as GoalImportance[]).map((importance) => (
                <option key={importance} value={importance}>
                  {importance} · {goalImportanceLabels[importance]}
                </option>
              ))}
            </select>
          </label>
          <label>
            每周投入小时
            <input
              type="number"
              min="0"
              value={draft.weeklyHours}
              onChange={(event) =>
                onDraftChange({ ...draft, weeklyHours: Number(event.target.value) })
              }
            />
          </label>
          <label className="wide-field">
            当前基础
            <textarea
              placeholder={selectedTemplate.descriptionHint}
              value={draft.currentLevel}
              onChange={(event) => onDraftChange({ ...draft, currentLevel: event.target.value })}
            />
          </label>
          <label className="wide-field">
            目标说明
            <textarea
              placeholder="写清楚完成标准、阶段产出或需要覆盖的能力范围"
              value={draft.description}
              onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            />
          </label>
        </div>

        <div className="goal-suggestion-row">
          <span>建议初始分类</span>
          <div className="chips compact-chips">
            {(selectedTemplate.suggestions.length
              ? selectedTemplate.suggestions
              : ["笔记", "计划", "复习", "复盘"]
            ).map((item) => (
              <span className="chip static" key={item}>
                {item}
              </span>
            ))}
          </div>
          <button className="primary-button" onClick={onAddGoal}>
            <Plus size={18} />
            创建并进入系统
          </button>
        </div>
      </section>
    </div>
  );
}

function AuthScreen({
  mode,
  form,
  error,
  submitting,
  onModeChange,
  onFormChange,
  onSubmit,
}: {
  mode: "login" | "register";
  form: { username: string; password: string };
  error: string;
  submitting: boolean;
  onModeChange: (mode: "login" | "register") => void;
  onFormChange: (form: { username: string; password: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand">
          <span>学</span>
          <div>
            <strong>个人学习系统</strong>
            <small>登录后进入受保护学习工作台</small>
          </div>
        </div>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => onModeChange("login")}>
            登录
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => onModeChange("register")}
          >
            注册
          </button>
        </div>
        <label>
          用户名
          <input
            autoFocus
            value={form.username}
            onChange={(event) => onFormChange({ ...form, username: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={form.password}
            onChange={(event) => onFormChange({ ...form, password: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
          />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="primary-button auth-submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? "处理中..." : mode === "login" ? "登录" : "注册并进入"}
        </button>
      </section>
    </div>
  );
}
