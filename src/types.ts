export type Track = "kaoyan" | "career" | "shared";
export type NoteType = "课程" | "技术" | "考研" | "项目" | "读书";
export type Mastery = "未学" | "初学" | "理解" | "熟练" | "可讲解";
export type Importance = "低" | "中" | "高";
export type PlanScope = "今日" | "本周" | "下周";
export type PlanStatus = "未开始" | "进行中" | "完成";
export type ReviewStatus = "待复习" | "已完成" | "跳过";
export type ReviewMode = "复习" | "自测" | "费曼讲解";
export type SourceType = "手动" | "笔记行动" | "复习系统" | "AI建议" | "周总结";

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
  reviewPriority: Importance;
  reason: string;
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
  createdAt: string;
}

export interface ReviewReminder {
  id: string;
  noteId: string;
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
  track: Track;
  category: string;
  deadline: string;
  progress: number;
  status: "进行中" | "已完成" | "暂停";
  description: string;
  linkedKnowledge: string[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  track: Track;
  techStack: string[];
  difficulty: string;
  learnings: string;
  nextAction: string;
  linkedNoteIds: string[];
  createdAt: string;
}

export interface AppState {
  notes: Note[];
  knowledgePoints: KnowledgePoint[];
  plans: StudyPlan[];
  reviewReminders: ReviewReminder[];
  reflections: Reflection[];
  goals: Goal[];
  projects: PortfolioProject[];
}
