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
  LibraryBig,
  LogOut,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Route,
  Tags,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  AnswerAttempt,
  AiGradingResult,
  Goal,
  GoalImportance,
  Importance,
  Milestone,
  MilestoneStatus,
  Mistake,
  Note,
  NoteType,
  PlanScope,
  PlanStatus,
  PortfolioProject,
  Question,
  Recommendation,
  Resource,
  ResourceType,
  ReviewMode,
  ReviewReminder,
  Rubric,
  StudyPlan,
  Track,
} from "./types";
import { aiActionLabels, runLocalAi, type AiAction } from "./lib/ai";
import {
  addDaysIso,
  applyKnowledgeEvidence,
  answerKnowledgeQuestion,
  buildAdaptiveLearningPath,
  buildGoalInsights,
  buildLearningAnalytics,
  buildLearningTimeline,
  buildNoteFromResource,
  buildDefaultRubric,
  buildRecommendations,
  buildResourceChunks,
  buildReviewSchedule,
  buildSearchDocuments,
  buildTodayLearningQueue,
  buildWeeklySummary,
  cleanUnique,
  completeTodayLearningTask,
  completionRate,
  createStudyEvent,
  dueReminders,
  generateQuestionsFromResource,
  generateQuestionsFromNote,
  gradeAnswerWithRubric,
  getGoalTemplate,
  getWeekStartIso,
  goalImportanceLabels,
  goalStatuses,
  goalTemplates,
  inferResourceTypeFromName,
  materializeLearningPathAsPlans,
  masteryFromScore,
  nextIntervalByScore,
  normalizeState,
  planFromNoteAction,
  postponeTodayLearningTask,
  reviewEvidenceDelta,
  searchKnowledgeBase,
  splitList,
  todayIso,
  trackLabels,
  trackShortLabels,
  uid,
  updateKnowledgeAfterQuestionAttempt,
  upsertMistakeFromAttempt,
  upcomingReminders,
  upsertKnowledgeFromNote,
  type TodayLearningTask,
} from "./lib/learning";
import { exportState, loadState, resetState, saveState } from "./lib/storage";
import {
  getCurrentUser,
  extractResourceFileText,
  loginUser,
  logoutUser,
  registerUser,
  runBackendAi,
  saveRemoteState,
  type AuthPayload,
  type AuthUser,
} from "./lib/api";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { LearningPathsPage } from "./pages/LearningPathsPage";
import { ReviewsPage } from "./pages/ReviewsPage";

type TabKey =
  | "dashboard"
  | "knowledgeBase"
  | "learningPaths"
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
  { key: "knowledgeBase", label: "知识库", icon: LibraryBig },
  { key: "learningPaths", label: "学习路径", icon: Route },
  { key: "notes", label: "笔记库", icon: NotebookPen },
  { key: "reviews", label: "训练中心", icon: RotateCcw },
  { key: "plans", label: "学习计划", icon: CalendarCheck },
  { key: "reflections", label: "复盘分析", icon: FileText },
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
const milestoneStatuses: MilestoneStatus[] = ["未开始", "进行中", "完成", "延期"];
const questionTypes: Question["type"][] = ["选择题", "简答题", "面试题", "费曼讲解题"];

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
  const [milestoneDraft, setMilestoneDraft] = useState({
    goalId: state.goals[0]?.id ?? "",
    title: "",
    description: "",
    deadline: addDaysIso(todayIso(), 14),
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
  const [questionDraft, setQuestionDraft] = useState({
    noteId: state.notes[0]?.id ?? "",
    goalId: state.goals[0]?.id ?? "",
    type: "简答题" as Question["type"],
    question: "",
    answer: "",
    difficulty: 3 as Question["difficulty"],
  });
  const [resourceDraft, setResourceDraft] = useState({
    title: "",
    type: "markdown" as ResourceType,
    goalId: state.goals[0]?.id ?? "",
    sourceName: "",
    fileName: "",
    contentText: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchGoalId, setSearchGoalId] = useState("");
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("");
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("");
  const [pathGoalId, setPathGoalId] = useState(state.goals[0]?.id ?? "");
  const [pathHorizonDays, setPathHorizonDays] = useState(14);
  const [selectedQuestionId, setSelectedQuestionId] = useState(state.questions[0]?.id ?? "");
  const selectedQuestion = useMemo(
    () => state.questions.find((question) => question.id === selectedQuestionId),
    [selectedQuestionId, state.questions],
  );
  const [answerDrafts, setAnswerDrafts] = useState<
    Record<string, { answerText: string; score: number }>
  >({});
  const [rubricDrafts, setRubricDrafts] = useState<
    Record<string, { criteriaText: string; totalScore: number }>
  >({});
  const [aiAction, setAiAction] = useState<AiAction>("next");
  const [aiOutput, setAiOutput] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [editingGoalId, setEditingGoalId] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState("");
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
    if (state.questions.some((question) => question.id === selectedQuestionId)) return;
    setSelectedQuestionId(state.questions[0]?.id ?? "");
  }, [state.questions, selectedQuestionId]);

  useEffect(() => {
    setQuestionDraft((current) => ({
      ...current,
      noteId: current.noteId || state.notes[0]?.id || "",
      goalId: current.goalId || state.goals[0]?.id || "",
    }));
    setMilestoneDraft((current) => ({
      ...current,
      goalId: current.goalId || state.goals[0]?.id || "",
    }));
    setResourceDraft((current) => ({
      ...current,
      goalId: current.goalId || state.goals[0]?.id || "",
    }));
    setPathGoalId((current) => current || state.goals[0]?.id || "");
  }, [state.notes, state.goals]);

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
  const learningAnalytics = useMemo(() => buildLearningAnalytics(state), [state]);
  const recommendationList = useMemo(() => buildRecommendations(state), [state]);
  const todayQueue = useMemo(() => buildTodayLearningQueue(state), [state]);
  const topGoalInsight = goalInsights[0];
  const searchResults = useMemo(
    () =>
      searchKnowledgeBase(state, searchQuery, {
        goalId: searchGoalId || undefined,
      }).slice(0, 12),
    [state, searchQuery, searchGoalId],
  );
  const searchDocumentCount = useMemo(() => buildSearchDocuments(state).length, [state]);
  const learningTimeline = useMemo(() => buildLearningTimeline(state), [state]);
  const selectedLearningPath = useMemo(
    () =>
      state.learningPaths
        .filter((path) => path.goalId === pathGoalId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? state.learningPaths[0],
    [state.learningPaths, pathGoalId],
  );
  const selectedLearningPathSteps = useMemo(
    () =>
      selectedLearningPath
        ? state.learningPathSteps
            .filter((step) => step.pathId === selectedLearningPath.id)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        : [],
    [selectedLearningPath, state.learningPathSteps],
  );

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
        studyEvents: exists
          ? current.studyEvents
          : [
              createStudyEvent({
                type: "created_note",
                goalId: normalized.associatedGoalIds[0],
                noteId: normalized.id,
                title: `创建笔记：${normalized.title}`,
              }),
              ...current.studyEvents,
            ],
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

  function importResourceAsLearningObjects() {
    const title = resourceDraft.title.trim() || resourceDraft.fileName.trim();
    if (!title) {
      showNotice("请填写资料标题。");
      return;
    }

    const contentText = resourceDraft.contentText.trim();
    const now = todayIso();
    const resource: Resource = {
      id: uid("resource"),
      title,
      type: resourceDraft.type,
      goalId: resourceDraft.goalId || undefined,
      sourceName: resourceDraft.sourceName.trim() || undefined,
      fileName: resourceDraft.fileName.trim() || undefined,
      contentText,
      status: contentText ? "已解析" : "待解析",
      createdAt: now,
      updatedAt: now,
    };
    const rawChunks = contentText ? buildResourceChunks(resource) : [];

    let createdNoteId = "";
    setState((current) => {
      const note = contentText ? buildNoteFromResource(resource, rawChunks, current.goals) : null;
      createdNoteId = note?.id || "";
      const knowledgePoints = note
        ? upsertKnowledgeFromNote(note, current.knowledgePoints, current.goals)
        : current.knowledgePoints;
      const linkedPointIds = note
        ? knowledgePoints
            .filter((point) =>
              note.coreConcepts.some(
                (concept) => concept.toLowerCase() === point.name.toLowerCase(),
              ),
            )
            .map((point) => point.id)
        : [];
      const chunks = rawChunks.map((chunk) => ({
        ...chunk,
        knowledgePointIds: linkedPointIds,
      }));
      const generatedQuestions = note
        ? generateQuestionsFromResource(resource, chunks, knowledgePoints, 4).map((question) => ({
            ...question,
            noteId: note.id,
          }))
        : [];
      const reviewReminders = note
        ? buildReviewSchedule(note, current.reviewReminders)
        : current.reviewReminders;
      const importJob = {
        id: uid("import_job"),
        resourceId: resource.id,
        status: contentText ? ("已完成" as const) : ("等待中" as const),
        step: contentText ? ("生成题目" as const) : ("上传" as const),
        createdAt: now,
        updatedAt: now,
      };
      const nextState = {
        ...current,
        resources: [resource, ...current.resources],
        resourceChunks: [...chunks, ...current.resourceChunks],
        notes: note ? [note, ...current.notes] : current.notes,
        knowledgePoints,
        questions: [...generatedQuestions, ...current.questions],
        reviewReminders,
        importJobs: [importJob, ...current.importJobs],
        studyEvents: [
          createStudyEvent({
            type: "imported_resource",
            goalId: resource.goalId,
            title: `导入资料：${resource.title}`,
          }),
          ...(note
            ? [
                createStudyEvent({
                  type: "created_note" as const,
                  goalId: note.associatedGoalIds[0],
                  noteId: note.id,
                  title: `资料生成笔记：${note.title}`,
                }),
              ]
            : []),
          ...(generatedQuestions.length
            ? [
                createStudyEvent({
                  type: "created_question" as const,
                  goalId: resource.goalId,
                  noteId: note?.id,
                  title: `资料生成 ${generatedQuestions.length} 道自测题：${resource.title}`,
                }),
              ]
            : []),
          ...current.studyEvents,
        ],
      };
      return {
        ...nextState,
        searchDocuments: buildSearchDocuments(nextState),
      };
    });

    if (createdNoteId) {
      setSelectedNoteId(createdNoteId);
    }
    setResourceDraft({
      ...resourceDraft,
      title: "",
      sourceName: "",
      fileName: "",
      contentText: "",
    });
    showNotice(
      contentText
        ? "资料已导入，并自动生成笔记、知识点、自测题和复习计划。"
        : "资料记录已创建，等待后续补充正文或解析。",
    );
  }

  async function importResourceFile(file: File | null) {
    if (!file) return;
    const type = inferResourceTypeFromName(file.name);
    setResourceDraft((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
      type,
      fileName: file.name,
      sourceName: current.sourceName || "本地文件",
    }));
    try {
      if (type === "markdown" || type === "txt") {
        const text = await file.text();
        setResourceDraft((current) => ({
          ...current,
          contentText: text,
        }));
        showNotice("已读取文本内容，可确认导入。");
        return;
      }

      showNotice(type === "pdf" ? "正在解析文本型 PDF..." : "正在解析 Word 正文...");
      const result = await extractResourceFileText(file);
      setResourceDraft((current) => ({
        ...current,
        contentText: result.text,
      }));
      showNotice(
        result.text.trim()
          ? "已提取正文，可确认导入。"
          : "文件正文为空，请手动粘贴资料正文。",
      );
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : "文件解析失败。扫描版 PDF 需要 OCR，可先手动粘贴正文。",
      );
    }
  }

  function askKnowledgeBase() {
    if (!knowledgeQuestion.trim()) {
      showNotice("请填写要问知识库的问题。");
      return;
    }
    const result = answerKnowledgeQuestion(state, knowledgeQuestion);
    setKnowledgeAnswer(result.answer);
  }

  function refreshSearchDocuments() {
    setState((current) => ({
      ...current,
      searchDocuments: buildSearchDocuments(current),
    }));
    showNotice("已刷新搜索文档。");
  }

  function updatePlanStatus(planId: string, status: PlanStatus) {
    setState((current) => {
      const plan = current.plans.find((item) => item.id === planId);
      const shouldRecordCompletion = plan && plan.status !== "完成" && status === "完成";
      return {
        ...current,
        plans: current.plans.map((item) => (item.id === planId ? { ...item, status } : item)),
        studyEvents: shouldRecordCompletion
          ? [
              createStudyEvent({
                type: "completed_plan",
                goalId: plan.goalId,
                noteId: plan.noteId,
                title: `完成计划：${plan.title}`,
              }),
              ...current.studyEvents,
            ]
          : current.studyEvents,
      };
    });
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
        knowledgePoints: applyKnowledgeEvidence(current.knowledgePoints, {
          noteId: reminder.noteId,
          goalId: reminder.goalId ?? note?.associatedGoalIds[0],
          conceptName: reminder.conceptName,
          delta: reviewEvidenceDelta(score, mode),
          score: score * 20,
          reviewedAt: now,
        }),
        reviewReminders: [
          ...current.reviewReminders.map((item) =>
            item.id === reminder.id
              ? { ...item, status: "已完成" as const, lastScore: score }
              : item,
          ),
          nextReminder,
        ],
        plans: remedialPlan ? [remedialPlan, ...current.plans] : current.plans,
        studyEvents: [
          createStudyEvent({
            type: "completed_review",
            goalId: reminder.goalId ?? note?.associatedGoalIds[0],
            noteId: reminder.noteId,
            score: score * 20,
            title: `完成${mode}：${note?.title ?? reminder.conceptName ?? "复习项"}`,
          }),
          ...current.studyEvents,
        ],
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
      studyEvents: [
        createStudyEvent({
          type: "created_reflection",
          goalId: goalInsights[0]?.goal.id,
          title: `生成周总结：${weekStart}`,
        }),
        ...current.studyEvents,
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
    setState((current) => ({
      ...current,
      goals: [goal, ...current.goals],
      studyEvents: [
        createStudyEvent({
          type: "updated_goal",
          goalId: goal.id,
          title: `创建目标：${goal.title}`,
        }),
        ...current.studyEvents,
      ],
    }));
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
      milestones: current.milestones.filter((milestone) => milestone.goalId !== goalId),
      plans: current.plans.map((plan) =>
        plan.goalId === goalId ? { ...plan, goalId: undefined } : plan,
      ),
      reviewReminders: current.reviewReminders.map((reminder) =>
        reminder.goalId === goalId ? { ...reminder, goalId: undefined } : reminder,
      ),
      questions: current.questions.map((question) =>
        question.goalId === goalId ? { ...question, goalId: undefined } : question,
      ),
      mistakes: current.mistakes.map((mistake) =>
        mistake.goalId === goalId ? { ...mistake, goalId: undefined } : mistake,
      ),
      recommendations: current.recommendations.filter(
        (recommendation) => recommendation.goalId !== goalId,
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

  function addMilestone() {
    const selectedGoal = state.goals.find((goal) => goal.id === milestoneDraft.goalId);
    if (!selectedGoal || !milestoneDraft.title.trim()) {
      showNotice("请选择目标并填写里程碑标题。");
      return;
    }
    const now = todayIso();
    const milestone: Milestone = {
      id: uid("milestone"),
      goalId: selectedGoal.id,
      title: milestoneDraft.title.trim(),
      description: milestoneDraft.description.trim(),
      deadline: milestoneDraft.deadline,
      status: "未开始",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    setState((current) => ({
      ...current,
      milestones: [milestone, ...current.milestones],
      studyEvents: [
        createStudyEvent({
          type: "created_milestone",
          goalId: selectedGoal.id,
          title: `创建里程碑：${milestone.title}`,
        }),
        ...current.studyEvents,
      ],
    }));
    setMilestoneDraft({
      ...milestoneDraft,
      title: "",
      description: "",
      deadline: addDaysIso(todayIso(), 14),
    });
    showNotice("已添加目标里程碑。");
  }

  function updateMilestone(milestoneId: string, patch: Partial<Milestone>) {
    setState((current) => ({
      ...current,
      milestones: current.milestones.map((milestone) => {
        if (milestone.id !== milestoneId) return milestone;
        const nextProgress =
          patch.status === "完成" && patch.progress === undefined
            ? 100
            : patch.progress !== undefined
              ? Math.min(100, Math.max(0, Math.round(patch.progress)))
              : milestone.progress;
        return {
          ...milestone,
          ...patch,
          progress: nextProgress,
          updatedAt: todayIso(),
        };
      }),
    }));
  }

  function deleteMilestone(milestoneId: string) {
    setState((current) => ({
      ...current,
      milestones: current.milestones.filter((milestone) => milestone.id !== milestoneId),
      plans: current.plans.map((plan) =>
        plan.milestoneId === milestoneId ? { ...plan, milestoneId: undefined } : plan,
      ),
    }));
    setEditingMilestoneId("");
  }

  function generateQuestionsForSelectedNote() {
    const note = state.notes.find((item) => item.id === questionDraft.noteId) ?? selectedNote;
    if (!note) {
      showNotice("请先选择一篇笔记。");
      return;
    }
    const questions = generateQuestionsFromNote(note, state.knowledgePoints, 5);
    setState((current) => ({
      ...current,
      questions: [...questions, ...current.questions],
      studyEvents: [
        createStudyEvent({
          type: "created_question",
          goalId: note.associatedGoalIds[0],
          noteId: note.id,
          title: `从笔记生成 5 道自测题：${note.title}`,
        }),
        ...current.studyEvents,
      ],
    }));
    setSelectedQuestionId(questions[0]?.id ?? selectedQuestionId);
    setActiveTab("reviews");
    showNotice("已根据笔记生成 5 道自测题。");
  }

  function addManualQuestion() {
    const questionText = questionDraft.question.trim();
    if (!questionText) {
      showNotice("请填写题干。");
      return;
    }
    const note = state.notes.find((item) => item.id === questionDraft.noteId);
    const goalId = questionDraft.goalId || note?.associatedGoalIds[0];
    const knowledgePointIds = state.knowledgePoints
      .filter(
        (point) =>
          (note ? point.noteIds.includes(note.id) : false) ||
          (goalId ? point.goalIds.includes(goalId) : false),
      )
      .map((point) => point.id);
    const question: Question = {
      id: uid("question"),
      goalId,
      noteId: note?.id,
      knowledgePointIds,
      type: questionDraft.type,
      question: questionText,
      answer: questionDraft.answer.trim(),
      difficulty: questionDraft.difficulty,
      source: "手动创建",
      createdAt: todayIso(),
    };
    setState((current) => ({
      ...current,
      questions: [question, ...current.questions],
      studyEvents: [
        createStudyEvent({
          type: "created_question",
          goalId,
          noteId: note?.id,
          title: `手动创建自测题：${question.question.slice(0, 24)}`,
        }),
        ...current.studyEvents,
      ],
    }));
    setSelectedQuestionId(question.id);
    setQuestionDraft({ ...questionDraft, question: "", answer: "" });
    showNotice("已添加自测题。");
  }

  function makeRubricFromDraft(question: Question, existing?: Rubric): Rubric {
    const defaultRubric = existing ?? buildDefaultRubric(question);
    const draft = rubricDrafts[question.id];
    return {
      ...defaultRubric,
      id: existing?.id || defaultRubric.id,
      criteria: splitList(draft?.criteriaText || defaultRubric.criteria.join("\n")),
      totalScore: Math.max(1, Math.round(draft?.totalScore || defaultRubric.totalScore || 100)),
    };
  }

  function ensureRubricDraft(question: Question) {
    const existing = state.rubrics.find((rubric) => rubric.questionId === question.id);
    const rubric = existing ?? buildDefaultRubric(question);
    setRubricDrafts((current) => ({
      ...current,
      [question.id]: {
        criteriaText: rubric.criteria.join("\n"),
        totalScore: rubric.totalScore,
      },
    }));
  }

  function saveQuestionRubric(question: Question) {
    const existing = state.rubrics.find((rubric) => rubric.questionId === question.id);
    const rubric = makeRubricFromDraft(question, existing);
    if (rubric.criteria.length === 0) {
      showNotice("请至少填写一条评分规则。");
      return;
    }
    setState((current) => {
      const currentExisting = current.rubrics.find((item) => item.questionId === question.id);
      const nextRubric = { ...rubric, id: currentExisting?.id || rubric.id };
      return {
        ...current,
        rubrics: currentExisting
          ? current.rubrics.map((item) => (item.id === currentExisting.id ? nextRubric : item))
          : [nextRubric, ...current.rubrics],
      };
    });
    showNotice("已保存评分规则。");
  }

  function deleteQuestion(questionId: string) {
    setState((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.id !== questionId),
      answerAttempts: current.answerAttempts.filter((attempt) => attempt.questionId !== questionId),
      mistakes: current.mistakes.filter((mistake) => mistake.questionId !== questionId),
      rubrics: current.rubrics.filter((rubric) => rubric.questionId !== questionId),
      aiGradingResults: current.aiGradingResults.filter(
        (result) => result.questionId !== questionId,
      ),
    }));
  }

  function submitQuestionAttempt(question: Question) {
    const draft = answerDrafts[question.id] ?? { answerText: "", score: 60 };
    const existingRubric = state.rubrics.find((rubric) => rubric.questionId === question.id);
    const rubric = makeRubricFromDraft(question, existingRubric);
    const grading = gradeAnswerWithRubric(question, rubric, draft.answerText);
    const score = grading.score;
    const feedback = [grading.misconception, grading.deductions[0], grading.nextAction]
      .filter(Boolean)
      .join(" ");
    const attempt: AnswerAttempt = {
      id: uid("attempt"),
      questionId: question.id,
      score,
      answerText: draft.answerText.trim(),
      feedback,
      createdAt: todayIso(),
    };
    const gradingResult: AiGradingResult = {
      id: uid("grading"),
      attemptId: attempt.id,
      questionId: question.id,
      score,
      strengths: grading.strengths,
      deductions: grading.deductions,
      missingPoints: grading.missingPoints,
      misconception: grading.misconception,
      improvedAnswer: grading.improvedAnswer,
      nextAction: grading.nextAction,
      createdAt: attempt.createdAt,
    };

    setState((current) => {
      const currentRubric = current.rubrics.find((item) => item.questionId === question.id);
      const rubrics = currentRubric
        ? current.rubrics.map((item) =>
            item.id === currentRubric.id ? { ...rubric, id: currentRubric.id } : item,
          )
        : [{ ...rubric, id: rubric.id }, ...current.rubrics];
      const mistakeResult = upsertMistakeFromAttempt(current.mistakes, question, attempt);
      const knowledgePoints = updateKnowledgeAfterQuestionAttempt(
        current.knowledgePoints,
        current.questions,
        current.answerAttempts,
        question,
        attempt,
        mistakeResult.repeatedMistake,
      );
      const remedialReminder: ReviewReminder | null =
        mistakeResult.mistake && question.noteId
          ? {
              id: uid("review"),
              noteId: question.noteId,
              goalId: question.goalId,
              conceptName: question.question.slice(0, 18),
              dueAt: addDaysIso(todayIso(), 1),
              intervalDays: 1,
              status: "待复习",
              createdAt: todayIso(),
              lastScore: Math.round(score / 20),
            }
          : null;

      return {
        ...current,
        rubrics,
        aiGradingResults: [gradingResult, ...current.aiGradingResults],
        answerAttempts: [attempt, ...current.answerAttempts],
        mistakes: mistakeResult.mistakes,
        knowledgePoints,
        reviewReminders: remedialReminder
          ? [remedialReminder, ...current.reviewReminders]
          : current.reviewReminders,
        studyEvents: [
          createStudyEvent({
            type: "answered_question",
            goalId: question.goalId,
            noteId: question.noteId,
            score,
            title: `完成自测：${question.question.slice(0, 24)}，得分 ${score}`,
          }),
          ...(mistakeResult.mistake
            ? [
                createStudyEvent({
                  type: "created_mistake" as const,
                  goalId: question.goalId,
                  noteId: question.noteId,
                  score,
                  title: `错题入本：${question.question.slice(0, 24)}`,
                }),
              ]
            : []),
          ...current.studyEvents,
        ],
      };
    });
    setAnswerDrafts((current) => ({ ...current, [question.id]: { answerText: "", score: 80 } }));
    showNotice(score < 60 ? "已自动批改，低分题已进入错题本。" : "已自动批改并更新掌握度。");
  }

  function markMistakeReviewed(mistake: Mistake) {
    setState((current) => ({
      ...current,
      mistakes: current.mistakes.map((item) =>
        item.id === mistake.id ? { ...item, status: "已复习", updatedAt: todayIso() } : item,
      ),
      knowledgePoints: applyKnowledgeEvidence(current.knowledgePoints, {
        knowledgePointIds: mistake.knowledgePointIds,
        noteId: mistake.noteId,
        goalId: mistake.goalId,
        delta: 5,
        reviewedAt: todayIso(),
      }),
      studyEvents: [
        createStudyEvent({
          type: "completed_review",
          goalId: mistake.goalId,
          noteId: mistake.noteId,
          title: `复盘错题：${mistake.title.slice(0, 24)}`,
        }),
        ...current.studyEvents,
      ],
    }));
    showNotice("已标记错题复盘，并小幅提升关联知识点掌握分。");
  }

  function refreshRecommendations() {
    setState((current) => ({
      ...current,
      recommendations: buildRecommendations(current),
    }));
    showNotice("已根据掌握度、错题、复习和里程碑刷新推荐。");
  }

  function updateRecommendationStatus(recommendation: Recommendation, status: Recommendation["status"]) {
    setState((current) => {
      const recommendations = buildRecommendations(current).map((item) =>
        item.id === recommendation.id ? { ...item, status } : item,
      );
      const acceptedPlan: StudyPlan | null =
        status === "已接受"
          ? {
              id: uid("plan"),
              title: recommendation.title,
              scope: "今日",
              category: recommendation.actionType,
              track:
                current.goals.find((goal) => goal.id === recommendation.goalId)?.track ??
                "shared",
              dueDate: todayIso(),
              status: "未开始",
              source: "AI建议",
              goalId: recommendation.goalId,
              noteId: recommendation.noteId,
              createdAt: todayIso(),
            }
          : null;

      return {
        ...current,
        recommendations,
        plans: acceptedPlan ? [acceptedPlan, ...current.plans] : current.plans,
      };
    });
    showNotice(status === "已接受" ? "已接受推荐，并转成今日计划。" : "已更新推荐状态。");
  }

  function startTodayTask(task: TodayLearningTask) {
    if (task.sourceType === "review" || task.sourceType === "mistake" || task.sourceType === "knowledge") {
      setActiveTab("reviews");
      if (task.noteId) setSelectedNoteId(task.noteId);
      return;
    }
    if (task.sourceType === "plan" || task.sourceType === "milestone") {
      setActiveTab(task.sourceType === "milestone" ? "goals" : "plans");
      return;
    }
    if (task.sourceType === "pathStep") {
      setActiveTab("learningPaths");
    }
  }

  function completeTodayTask(task: TodayLearningTask) {
    setState((current) => completeTodayLearningTask(current, task));
    showNotice("已完成今日任务，并写入学习时间线。");
  }

  function postponeTodayTask(task: TodayLearningTask) {
    setState((current) => postponeTodayLearningTask(current, task, 1));
    showNotice("已推迟到明天。");
  }

  function generateAdaptiveLearningPath() {
    if (!pathGoalId) {
      showNotice("请先选择目标。");
      return;
    }
    setState((current) => {
      const result = buildAdaptiveLearningPath(current, pathGoalId, {
        horizonDays: pathHorizonDays,
      });
      if (!result) return current;
      return {
        ...current,
        learningPaths: [result.path, ...current.learningPaths],
        learningPathSteps: [...result.steps, ...current.learningPathSteps],
        studyEvents: [
          createStudyEvent({
            type: "generated_learning_path",
            goalId: pathGoalId,
            title: `生成学习路径：${result.path.title}`,
          }),
          ...current.studyEvents,
        ],
      };
    });
    showNotice("已根据目标、资料、复习、错题和掌握分生成学习路径。");
    setActiveTab("learningPaths");
  }

  function updateLearningPathStepStatus(
    stepId: string,
    status: "未开始" | "进行中" | "完成" | "跳过",
  ) {
    setState((current) => ({
      ...current,
      learningPathSteps: current.learningPathSteps.map((step) =>
        step.id === stepId ? { ...step, status } : step,
      ),
      studyEvents:
        status === "完成"
          ? [
              createStudyEvent({
                type: "completed_plan",
                goalId: current.learningPathSteps.find((step) => step.id === stepId)?.goalId,
                title: `完成路径步骤：${
                  current.learningPathSteps.find((step) => step.id === stepId)?.title || "学习步骤"
                }`,
              }),
              ...current.studyEvents,
            ]
          : current.studyEvents,
    }));
  }

  function materializeSelectedPathToPlans() {
    if (!selectedLearningPath || selectedLearningPathSteps.length === 0) {
      showNotice("请先生成学习路径。");
      return;
    }
    const goal = state.goals.find((item) => item.id === selectedLearningPath.goalId);
    const plans = materializeLearningPathAsPlans(
      selectedLearningPath,
      selectedLearningPathSteps.filter((step) => step.status !== "完成"),
      goal,
    );
    setState((current) => ({
      ...current,
      plans: [...plans, ...current.plans],
      learningPaths: current.learningPaths.map((path) =>
        path.id === selectedLearningPath.id
          ? { ...path, status: "执行中", updatedAt: todayIso() }
          : path,
      ),
    }));
    showNotice(`已把 ${plans.length} 个路径步骤转成学习计划。`);
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
          <MetricCard label="资料" value={state.resources.length} hint="外部学习输入" tone="info" />
          <MetricCard label="学习路径" value={state.learningPaths.length} hint="自动规划路线" tone="success" />
          <MetricCard label="到期复习" value={due.length} hint="今天需要处理" tone="warning" />
          <MetricCard label="平均自测分" value={`${learningAnalytics.averageTestScore || "-"}分`} hint="输出型证据" tone="info" />
          <MetricCard label="低掌握知识点" value={learningAnalytics.lowMasteryKnowledgeCount} hint="系统计算掌握分低于 40" tone="warning" />
          <MetricCard label="错题" value={state.mistakes.filter((mistake) => mistake.status === "待复习").length} hint="待复盘题目" tone="warning" />
          <MetricCard label="本周证据" value={learningAnalytics.weeklyEvidenceCount} hint="学习事件数量" tone="success" />
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
              <h2>从资料导入到检索问答、学习路径和计划</h2>
            </div>
            <button className="primary-button" onClick={() => setActiveTab("knowledgeBase")}>
              <Upload size={18} />
              导入资料
            </button>
          </div>
          <div className="flow-row">
            {["资料导入", "自动分段", "知识入库", "检索问答", "学习路径", "自动计划"].map(
              (step, index) => (
                <div className="flow-step" key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">每日学习驾驶舱</p>
              <h2>今天该学什么</h2>
            </div>
            <Badge tone={todayQueue.length ? "info" : "success"}>
              {todayQueue.length ? `${todayQueue.length} 个推荐动作` : "今日已清空"}
            </Badge>
          </div>
          <div className="today-task-list">
            {todayQueue.slice(0, 6).map((task, index) => (
              <TodayTaskCard
                key={task.id}
                task={task}
                rank={index + 1}
                onStart={startTodayTask}
                onComplete={completeTodayTask}
                onPostpone={postponeTodayTask}
              />
            ))}
            {todayQueue.length === 0 && (
              <EmptyState text="今天没有待处理任务。可以主动生成学习路径，或从训练中心做一次输出型自测。" />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">透明推荐</p>
              <h2>系统建议必须说明原因</h2>
            </div>
            <button className="ghost-button" onClick={refreshRecommendations}>
              刷新推荐
            </button>
          </div>
          <div className="recommendation-list">
            {recommendationList.slice(0, 4).map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onStatusChange={updateRecommendationStatus}
              />
            ))}
            {recommendationList.length === 0 && <EmptyState text="暂无推荐。完成复习、自测或里程碑后会生成理由。" />}
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
                    {insight.goal.domain} · 里程碑 {insight.milestoneCount} · 笔记{" "}
                    {insight.noteCount} · 错题 {insight.mistakeCount} · {insight.risk}
                  </span>
                </div>
                <div className="progress dual-progress">
                  <i style={{ width: `${insight.goal.progress}%` }} />
                  <em style={{ width: `${insight.systemProgress}%` }} />
                </div>
                <b>{insight.goal.progress}%/{insight.systemProgress}%</b>
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
            <button className="primary-button" onClick={generateQuestionsForSelectedNote}>
              生成自测题
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
        <div className="data-table knowledge-table">
          <div className="table-head">
            <span>知识点</span>
            <span>路线</span>
            <span>手动掌握</span>
            <span>系统掌握</span>
            <span>证据</span>
            <span>优先级</span>
            <span>关联目标</span>
            <span>来源笔记</span>
          </div>
          {state.knowledgePoints.map((point) => (
            <div className="table-row" key={point.id}>
              <strong>{point.name}</strong>
              <span>{point.tracks.map((track) => trackShortLabels[track]).join(" / ")}</span>
              <Badge tone="neutral">{point.mastery}</Badge>
              <span>
                <b>{point.masteryScore}</b> · {point.systemMastery || masteryFromScore(point.masteryScore)}
              </span>
              <span>
                {point.evidenceCount} 条
                {point.lastTestScore !== undefined ? ` · 自测 ${point.lastTestScore}` : ""}
              </span>
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
        <section className="dashboard-grid">
          <MetricCard
            label="计划完成率"
            value={`${learningAnalytics.planCompletionRate}%`}
            hint="全部学习计划"
            tone="success"
          />
          <MetricCard
            label="计划延期率"
            value={`${learningAnalytics.overduePlanRate}%`}
            hint="未完成且已过截止"
            tone="warning"
          />
          <MetricCard
            label="复习完成率"
            value={`${learningAnalytics.reviewCompletionRate}%`}
            hint="历史提醒处理情况"
            tone="info"
          />
          <MetricCard
            label="里程碑完成率"
            value={`${learningAnalytics.milestoneCompletionRate}%`}
            hint="阶段目标验收"
            tone="success"
          />
          <MetricCard
            label="平均自测分"
            value={`${learningAnalytics.averageTestScore || "-"}分`}
            hint="题目输出表现"
            tone="info"
          />
          <MetricCard
            label="重复错题率"
            value={`${learningAnalytics.repeatedMistakeRate}%`}
            hint="重复出错占比"
            tone="warning"
          />
          <MetricCard
            label="停滞目标"
            value={learningAnalytics.stalledGoalCount}
            hint="7 天未推进或无证据"
            tone="warning"
          />
          <MetricCard
            label="本周证据"
            value={learningAnalytics.weeklyEvidenceCount}
            hint="study_events"
            tone="success"
          />
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

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">里程碑</p>
              <h2>把大目标拆成阶段验收</h2>
            </div>
          </div>
          <div className="inline-form milestone-form">
            <select
              value={milestoneDraft.goalId}
              onChange={(event) =>
                setMilestoneDraft({ ...milestoneDraft, goalId: event.target.value })
              }
            >
              {goalInsights.map((insight) => (
                <option key={insight.goal.id} value={insight.goal.id}>
                  {insight.goal.title}
                </option>
              ))}
            </select>
            <input
              placeholder="里程碑标题"
              value={milestoneDraft.title}
              onChange={(event) =>
                setMilestoneDraft({ ...milestoneDraft, title: event.target.value })
              }
            />
            <input
              type="date"
              value={milestoneDraft.deadline}
              onChange={(event) =>
                setMilestoneDraft({ ...milestoneDraft, deadline: event.target.value })
              }
            />
            <button className="primary-button" onClick={addMilestone}>
              <Plus size={18} />
              添加里程碑
            </button>
          </div>
          <label className="single-extra-field">
            里程碑说明
            <textarea
              value={milestoneDraft.description}
              onChange={(event) =>
                setMilestoneDraft({ ...milestoneDraft, description: event.target.value })
              }
            />
          </label>
        </section>

        <section className="goal-grid">
          {goalInsights.map((insight) => {
            const goal = insight.goal;
            const goalMilestones = state.milestones.filter(
              (milestone) => milestone.goalId === goal.id,
            );
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
              <div className="goal-score-row">
                <strong>真实进度诊断</strong>
                <span>
                  手动 {goal.progress}% · 系统估算 {insight.systemProgress}% · 差异{" "}
                  {insight.progressGap}%
                </span>
              </div>
              <div className="progress large dual-progress">
                <i style={{ width: `${goal.progress}%` }} />
                <em style={{ width: `${insight.systemProgress}%` }} />
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
                <span>里程碑 <b>{insight.milestoneCount}</b></span>
                <span>计划 <b>{insight.planCompletionRate}%</b></span>
                <span>掌握 <b>{insight.averageMasteryScore}</b></span>
              </div>
              <div className="milestone-list">
                {goalMilestones.map((milestone) => (
                  <div className="milestone-item" key={milestone.id}>
                    {editingMilestoneId === milestone.id ? (
                      <div className="inline-editor">
                        <input
                          value={milestone.title}
                          onChange={(event) =>
                            updateMilestone(milestone.id, { title: event.target.value })
                          }
                        />
                        <textarea
                          value={milestone.description}
                          onChange={(event) =>
                            updateMilestone(milestone.id, { description: event.target.value })
                          }
                        />
                        <div className="compact-edit-row">
                          <input
                            type="date"
                            value={milestone.deadline}
                            onChange={(event) =>
                              updateMilestone(milestone.id, { deadline: event.target.value })
                            }
                          />
                          <select
                            value={milestone.status}
                            onChange={(event) =>
                              updateMilestone(milestone.id, {
                                status: event.target.value as MilestoneStatus,
                              })
                            }
                          >
                            {milestoneStatuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={milestone.progress}
                            onChange={(event) =>
                              updateMilestone(milestone.id, {
                                progress: Number(event.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="card-title-row">
                          <strong>{milestone.title}</strong>
                          <Badge
                            tone={
                              milestone.status === "完成"
                                ? "success"
                                : milestone.status === "延期"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {milestone.status}
                          </Badge>
                        </div>
                        <small>{milestone.description || "未填写说明"}</small>
                        <span>截止 {milestone.deadline} · 进度 {milestone.progress}%</span>
                        <div className="progress">
                          <i style={{ width: `${milestone.progress}%` }} />
                        </div>
                      </>
                    )}
                    <div className="card-actions">
                      <button
                        className="ghost-button"
                        onClick={() =>
                          setEditingMilestoneId(
                            editingMilestoneId === milestone.id ? "" : milestone.id,
                          )
                        }
                      >
                        <Pencil size={15} />
                        {editingMilestoneId === milestone.id ? "完成" : "编辑"}
                      </button>
                      <button
                        className="ghost-button danger"
                        onClick={() => deleteMilestone(milestone.id)}
                      >
                        <Trash2 size={15} />
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                {goalMilestones.length === 0 && <EmptyState text="还没有里程碑。" />}
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
                  <div className="goal-badges">
                    {(project.goalIds || []).map((goalId) => {
                      const goal = state.goals.find((item) => item.id === goalId);
                      return goal ? (
                        <Badge tone="info" key={goal.id}>
                          {goal.title}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <div className="chips compact-chips">
                    {project.techStack.map((tech) => (
                      <span className="chip static" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                  {(project.knowledgePointIds || []).length > 0 && (
                    <div className="chips compact-chips">
                      {(project.knowledgePointIds || []).map((pointId) => {
                        const point = state.knowledgePoints.find((item) => item.id === pointId);
                        return point ? (
                          <span className="chip static" key={point.id}>
                            {point.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
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
      case "knowledgeBase":
        return (
          <KnowledgeBasePage
            state={state}
            resourceDraft={resourceDraft}
            setResourceDraft={setResourceDraft}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchGoalId={searchGoalId}
            setSearchGoalId={setSearchGoalId}
            knowledgeQuestion={knowledgeQuestion}
            setKnowledgeQuestion={setKnowledgeQuestion}
            knowledgeAnswer={knowledgeAnswer}
            searchResults={searchResults}
            searchDocumentCount={searchDocumentCount}
            onImportResource={importResourceAsLearningObjects}
            onImportResourceFile={importResourceFile}
            onAskKnowledgeBase={askKnowledgeBase}
            onRefreshSearchDocuments={refreshSearchDocuments}
          />
        );
      case "learningPaths":
        return (
          <LearningPathsPage
            state={state}
            pathGoalId={pathGoalId}
            setPathGoalId={setPathGoalId}
            pathHorizonDays={pathHorizonDays}
            setPathHorizonDays={setPathHorizonDays}
            selectedLearningPath={selectedLearningPath}
            selectedLearningPathSteps={selectedLearningPathSteps}
            learningTimeline={learningTimeline}
            onGeneratePath={generateAdaptiveLearningPath}
            onMaterializePath={materializeSelectedPathToPlans}
            onUpdateStepStatus={updateLearningPathStepStatus}
          />
        );
      case "notes":
        return renderNotes();
      case "knowledge":
        return renderKnowledge();
      case "plans":
        return renderPlans();
      case "reviews":
        return (
          <ReviewsPage
            state={state}
            due={due}
            upcoming={upcoming}
            questionTypes={questionTypes}
            questionDraft={questionDraft}
            setQuestionDraft={setQuestionDraft}
            selectedQuestion={selectedQuestion}
            selectedQuestionId={selectedQuestionId}
            setSelectedQuestionId={setSelectedQuestionId}
            setSelectedNoteId={setSelectedNoteId}
            answerDrafts={answerDrafts}
            setAnswerDrafts={setAnswerDrafts}
            rubricDrafts={rubricDrafts}
            setRubricDrafts={setRubricDrafts}
            onGenerateQuestionsForSelectedNote={generateQuestionsForSelectedNote}
            onAddManualQuestion={addManualQuestion}
            onDeleteQuestion={deleteQuestion}
            onEnsureRubricDraft={ensureRubricDraft}
            onSaveQuestionRubric={saveQuestionRubric}
            onSubmitQuestionAttempt={submitQuestionAttempt}
            onMarkMistakeReviewed={markMistakeReviewed}
            onCompleteReview={completeReview}
            getReminderGoalTitle={getReminderGoalTitle}
          />
        );
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
            <small>智能训练知识库 v5</small>
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

function RecommendationCard({
  recommendation,
  onStatusChange,
}: {
  recommendation: Recommendation;
  onStatusChange: (recommendation: Recommendation, status: Recommendation["status"]) => void;
}) {
  return (
    <div className="recommendation-card">
      <div className="card-title-row">
        <div>
          <Badge tone="info">{recommendation.actionType}</Badge>
          <strong>{recommendation.title}</strong>
        </div>
        <b>{recommendation.priorityScore}</b>
      </div>
      <ul>
        {recommendation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <div className="card-actions">
        <button className="ghost-button" onClick={() => onStatusChange(recommendation, "已接受")}>
          接受
        </button>
        <button className="ghost-button" onClick={() => onStatusChange(recommendation, "已完成")}>
          完成
        </button>
        <button className="ghost-button danger" onClick={() => onStatusChange(recommendation, "忽略")}>
          忽略
        </button>
      </div>
    </div>
  );
}

function TodayTaskCard({
  task,
  rank,
  onStart,
  onComplete,
  onPostpone,
}: {
  task: TodayLearningTask;
  rank: number;
  onStart: (task: TodayLearningTask) => void;
  onComplete: (task: TodayLearningTask) => void;
  onPostpone: (task: TodayLearningTask) => void;
}) {
  return (
    <div className="today-task-card">
      <div className="today-task-rank">{rank}</div>
      <div className="today-task-main">
        <div className="card-title-row">
          <div>
            <Badge tone={task.priorityScore >= 110 ? "danger" : task.priorityScore >= 90 ? "warning" : "info"}>
              {task.actionType}
            </Badge>
            <strong>{task.title}</strong>
          </div>
          <b>{task.priorityScore}</b>
        </div>
        <ul>
          {task.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="today-task-meta">
          <span>{task.dueDate}</span>
          <span>{task.estimatedMinutes} 分钟</span>
        </div>
      </div>
      <div className="today-task-actions">
        <button className="ghost-button" onClick={() => onStart(task)}>
          开始
        </button>
        <button className="primary-button" onClick={() => onComplete(task)}>
          完成
        </button>
        <button className="ghost-button" onClick={() => onPostpone(task)}>
          推迟
        </button>
      </div>
    </div>
  );
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
