const todayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (baseIso, days) => {
  const date = new Date(`${baseIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function makeSeedState() {
  const today = todayIso();
  const goals = [
    {
      id: "goal_kaoyan_408",
      title: "2027 考研 408 基础能力",
      track: "kaoyan",
      category: "专业课 / 408",
      deadline: "2026-12-20",
      progress: 28,
      status: "进行中",
      description: "系统推进数据结构、计组、操作系统、计算机网络，形成错题和复习闭环。",
      linkedKnowledge: ["数据结构", "操作系统", "计算机网络", "数据库"],
    },
    {
      id: "goal_career_frontend",
      title: "前端就业项目能力",
      track: "career",
      category: "前端 / 项目 / 面试",
      deadline: "2026-10-01",
      progress: 36,
      status: "进行中",
      description: "完成组件化、状态管理、工程化、项目复盘和面试表达训练。",
      linkedKnowledge: ["React", "TypeScript", "组件通信", "项目复盘"],
    },
  ];

  const notes = [
    {
      id: "note_react_hooks",
      title: "React Hooks 入门",
      type: "技术",
      direction: "前端开发",
      tracks: ["career"],
      associatedGoalIds: ["goal_career_frontend"],
      mastery: "初学",
      importance: "高",
      summary: "理解 useState、useEffect 和组件状态的基本使用。",
      content: "Hooks 让函数组件拥有状态和副作用能力。",
      coreConcepts: ["useState", "useEffect", "组件状态"],
      commonQuestions: ["useEffect 的依赖数组为什么重要？"],
      myUnderstanding: "Hooks 的核心是把状态和副作用拆成更小的逻辑单元。",
      relatedNoteIds: [],
      reviewRecords: [],
      nextAction: "完成一个包含新增、筛选、持久化的 TodoList 小项目",
      createdAt: today,
      updatedAt: today,
    },
  ];

  return {
    notes,
    knowledgePoints: [
      {
        id: "kp_react_hooks",
        name: "React Hooks",
        noteIds: ["note_react_hooks"],
        goalIds: ["goal_career_frontend"],
        tracks: ["career"],
        mastery: "初学",
        reviewPriority: "高",
        reason: "前端就业高频基础能力",
        updatedAt: today,
      },
    ],
    plans: [
      {
        id: "plan_todolist",
        title: "完成 TodoList 项目第一版：新增、完成、筛选",
        scope: "本周",
        category: "项目驱动学习",
        track: "career",
        dueDate: addDaysIso(today, 5),
        status: "未开始",
        source: "笔记行动",
        noteId: "note_react_hooks",
        goalId: "goal_career_frontend",
        createdAt: today,
      },
    ],
    reviewReminders: [
      {
        id: "review_react_day1",
        noteId: "note_react_hooks",
        conceptName: "useState",
        dueAt: today,
        intervalDays: 1,
        status: "待复习",
        createdAt: today,
      },
    ],
    reflections: [
      {
        id: uid("reflection"),
        weekStart: today,
        generatedSummary: "已建立第一批学习数据，请补充本周反思和下周重点。",
        wins: "",
        blockers: "",
        masteryNotes: "",
        nextWeekFocus: "",
        createdAt: today,
      },
    ],
    goals,
    projects: [
      {
        id: "project_learning_system",
        title: "个人学习系统",
        track: "shared",
        techStack: ["React", "TypeScript", "Node"],
        difficulty: "把笔记、复习、计划、反思和目标串成闭环。",
        learnings: "先从真实学习流程出发，再补功能。",
        nextAction: "补充后端 API、登录、数据表和 AI 接口封装。",
        linkedNoteIds: ["note_react_hooks"],
        createdAt: today,
      },
    ],
  };
}
