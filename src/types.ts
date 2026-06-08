export type Track = "kaoyan" | "career" | "shared";
export type NoteType = "课程" | "技术" | "考研" | "项目" | "读书";
export type Mastery = "未学" | "初学" | "理解" | "熟练" | "可讲解";
export type Importance = "低" | "中" | "高";
export type PlanScope = "今日" | "本周" | "下周";
export type PlanStatus = "未开始" | "进行中" | "完成";
export type ReviewStatus = "待复习" | "已完成" | "跳过";
export type ReviewMode = "复习" | "自测" | "费曼讲解";
export type SourceType = "手动" | "笔记行动" | "复习系统" | "AI建议" | "周总结" | "自测系统";
export type GoalType = "template" | "custom";
export type GoalImportance = 1 | 2 | 3 | 4 | 5;
export type GoalStatus = "进行中" | "已完成" | "暂停" | "放弃";
export type MilestoneStatus = "未开始" | "进行中" | "完成" | "延期";
export type QuestionType = "选择题" | "简答题" | "面试题" | "费曼讲解题";
export type QuestionSource = "AI生成" | "手动创建" | "错题转化";
export type MistakeStatus = "待复习" | "已复习";
export type RecommendationAction =
  | "复习"
  | "做题"
  | "写笔记"
  | "推进计划"
  | "复盘"
  | "项目实践";
export type RecommendationStatus = "待处理" | "已接受" | "已完成" | "忽略";
export type StudyEventType =
  | "created_note"
  | "completed_plan"
  | "completed_review"
  | "answered_question"
  | "created_reflection"
  | "updated_goal"
  | "created_milestone"
  | "created_question"
  | "created_mistake";

export interface ReviewRecord {
  id: string;
  date: string;
  mode: ReviewMode;
  result: string;
  score: number;
  nextReviewAt: string;
}

export interface Note {
  id: string;
  title: string;
  type: NoteType;
  direction: string;
  tracks: Track[];
  associatedGoalIds: string[];
  mastery: Mastery;
  importance: Importance;
  summary: string;
  content: string;
  coreConcepts: string[];
  commonQuestions: string[];
  myUnderstanding: string;
  relatedNoteIds: string[];
  reviewRecords: ReviewRecord[];
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  noteIds: string[];
  goalIds: string[];
  tracks: Track[];
  mastery: Mastery;
  masteryScore: number;
  evidenceCount: number;
  systemMastery?: Mastery;
  lastTestScore?: number;
  lastReviewedAt?: string;
  repeatedMistakeCount?: number;
  reviewPriority: Importance;
  reason: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description: string;
  deadline: string;
  status: MilestoneStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlan {
  id: string;
  title: string;
  scope: PlanScope;
  category: string;
  track: Track;
  dueDate: string;
  status: PlanStatus;
  source: SourceType;
  noteId?: string;
  goalId?: string;
  milestoneId?: string;
  createdAt: string;
}

export interface ReviewReminder {
  id: string;
  noteId: string;
  goalId?: string;
  conceptName?: string;
  dueAt: string;
  intervalDays: number;
  status: ReviewStatus;
  createdAt: string;
  lastScore?: number;
}

export interface Reflection {
  id: string;
  weekStart: string;
  goalFocusIds?: string[];
  generatedSummary: string;
  wins: string;
  blockers: string;
  masteryNotes: string;
  nextWeekFocus: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  templateKey?: string;
  domain: string;
  importance: GoalImportance;
  track: Track;
  category: string;
  deadline?: string;
  weeklyHours?: number;
  currentLevel?: string;
  progress: number;
  priorityScore?: number;
  status: GoalStatus;
  description: string;
  linkedKnowledge: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  track: Track;
  techStack: string[];
  difficulty: string;
  learnings: string;
  nextAction: string;
  goalIds?: string[];
  knowledgePointIds?: string[];
  linkedNoteIds: string[];
  createdAt: string;
}

export interface Question {
  id: string;
  goalId?: string;
  noteId?: string;
  knowledgePointIds: string[];
  type: QuestionType;
  question: string;
  answer: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source: QuestionSource;
  createdAt: string;
}

export interface AnswerAttempt {
  id: string;
  questionId: string;
  score: number;
  answerText: string;
  feedback: string;
  createdAt: string;
}

export interface Mistake {
  id: string;
  questionId: string;
  goalId?: string;
  noteId?: string;
  knowledgePointIds: string[];
  title: string;
  reason: string;
  repeatedCount: number;
  status: MistakeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  actionType: RecommendationAction;
  goalId?: string;
  noteId?: string;
  knowledgePointId?: string;
  priorityScore: number;
  reasons: string[];
  status: RecommendationStatus;
  createdAt: string;
}

export interface StudyEvent {
  id: string;
  type: StudyEventType;
  goalId?: string;
  noteId?: string;
  knowledgePointId?: string;
  score?: number;
  title: string;
  createdAt: string;
}

export interface AppState {
  notes: Note[];
  knowledgePoints: KnowledgePoint[];
  milestones: Milestone[];
  plans: StudyPlan[];
  reviewReminders: ReviewReminder[];
  reflections: Reflection[];
  goals: Goal[];
  projects: PortfolioProject[];
  questions: Question[];
  answerAttempts: AnswerAttempt[];
  mistakes: Mistake[];
  recommendations: Recommendation[];
  studyEvents: StudyEvent[];
}
