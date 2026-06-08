import type {
  AnswerAttempt,
  AppState,
  Goal,
  ImportJob,
  LearningPath,
  LearningPathStep,
  Milestone,
  Mistake,
  Note,
  PortfolioProject,
  Question,
  Recommendation,
  Resource,
  ResourceChunk,
  ReviewPolicy,
  StudyEvent,
  StudyPlan,
} from "../types";
import {
  addDaysIso,
  buildReviewSchedule,
  todayIso,
  uid,
  upsertKnowledgeFromNote,
} from "../lib/learning";

export function makeSeedState(): AppState {
  const today = todayIso();

  const goals: Goal[] = [
    {
      id: "goal_kaoyan_408",
      title: "2027 考研 408 基础能力",
      type: "template",
      templateKey: "kaoyan",
      domain: "考研",
      importance: 5,
      track: "kaoyan",
      category: "专业课 / 408",
      deadline: "2026-12-20",
      weeklyHours: 25,
      currentLevel: "数学一般，408 初学，英语需要持续复习。",
      progress: 28,
      status: "进行中",
      description: "系统推进数据结构、计组、操作系统、计算机网络，形成错题和复习闭环。",
      linkedKnowledge: ["数据结构", "操作系统", "计算机网络", "数据库"],
      createdAt: today,
      updatedAt: today,
    },
    {
      id: "goal_career_frontend",
      title: "前端就业项目能力",
      type: "template",
      templateKey: "career",
      domain: "就业",
      importance: 4,
      track: "career",
      category: "前端 / 项目 / 面试",
      deadline: "2026-10-01",
      weeklyHours: 14,
      currentLevel: "已掌握基础语法，需要通过项目提高工程化和表达能力。",
      progress: 36,
      status: "进行中",
      description: "完成组件化、状态管理、工程化、项目复盘和面试表达训练。",
      linkedKnowledge: ["React", "TypeScript", "组件通信", "项目复盘"],
      createdAt: today,
      updatedAt: today,
    },
    {
      id: "goal_shared_backend",
      title: "后端与计算机基础交叉能力",
      type: "custom",
      templateKey: "custom",
      domain: "Java 后端",
      importance: 4,
      track: "shared",
      category: "后端 / 八股 / 408",
      deadline: "2026-11-15",
      weeklyHours: 10,
      currentLevel: "网络和数据库有基础，需要沉淀为面试题和考点解释。",
      progress: 22,
      status: "进行中",
      description: "把网络、操作系统、数据库知识同时沉淀为考研复习点和面试高频点。",
      linkedKnowledge: ["TCP", "数据库索引", "进程线程", "缓存"],
      createdAt: today,
      updatedAt: today,
    },
  ];

  const notes: Note[] = [
    {
      id: "note_react_hooks",
      title: "React Hooks 入门",
      type: "技术",
      direction: "前端开发",
      tracks: ["career"],
      associatedGoalIds: ["goal_career_frontend"],
      mastery: "初学",
      importance: "高",
      summary: "理解 useState、useEffect 和组件状态的基本使用，开始从函数组件角度组织交互逻辑。",
      content:
        "Hooks 让函数组件拥有状态和副作用能力。useState 管理局部状态，useEffect 处理副作用、请求和订阅。需要注意依赖数组，否则容易产生重复执行或闭包问题。",
      coreConcepts: ["useState", "useEffect", "组件状态", "依赖数组"],
      commonQuestions: ["useEffect 的依赖数组为什么重要？", "状态更新为什么不是立即同步的？"],
      myUnderstanding:
        "Hooks 的核心不是把类组件语法换掉，而是用状态和副作用把组件行为拆成更小的逻辑单元。",
      relatedNoteIds: [],
      reviewRecords: [],
      nextAction: "完成一个包含新增、筛选、持久化的 TodoList 小项目",
      createdAt: today,
      updatedAt: today,
    },
    {
      id: "note_tcp_handshake",
      title: "TCP 三次握手",
      type: "考研",
      direction: "计算机网络 / 后端开发",
      tracks: ["shared"],
      associatedGoalIds: ["goal_kaoyan_408", "goal_shared_backend"],
      mastery: "理解",
      importance: "高",
      summary: "三次握手用于确认双方收发能力，并同步初始序列号，是 408 和面试常见高频点。",
      content:
        "客户端发送 SYN，服务端返回 SYN+ACK，客户端再发送 ACK。两次握手无法可靠确认客户端接收能力，也容易让历史连接请求造成资源浪费。",
      coreConcepts: ["SYN", "ACK", "初始序列号", "半连接队列"],
      commonQuestions: ["为什么不是两次握手？", "SYN Flood 攻击和半连接队列有什么关系？"],
      myUnderstanding:
        "三次握手本质是在不可靠网络中建立双方对连接状态和序列号的一致认知。",
      relatedNoteIds: [],
      reviewRecords: [],
      nextAction: "画出 TCP 三次握手与四次挥手对比图，并用自己的话讲一遍",
      createdAt: today,
      updatedAt: today,
    },
    {
      id: "note_db_index",
      title: "数据库索引",
      type: "技术",
      direction: "数据库 / 后端开发",
      tracks: ["shared"],
      associatedGoalIds: ["goal_shared_backend"],
      mastery: "初学",
      importance: "高",
      summary: "索引用空间和维护成本换查询效率，重点理解 B+ 树、联合索引和最左前缀原则。",
      content:
        "索引能减少扫描数据量，但会增加写入维护成本。联合索引需要关注列顺序、区分度和查询条件。面试中常结合执行计划、回表、覆盖索引一起考。",
      coreConcepts: ["B+ 树", "联合索引", "最左前缀", "覆盖索引", "回表"],
      commonQuestions: ["为什么数据库常用 B+ 树？", "联合索引什么时候会失效？"],
      myUnderstanding:
        "索引不是越多越好，关键是让高频查询用更少的 IO 找到目标数据。",
      relatedNoteIds: [],
      reviewRecords: [],
      nextAction: "用一张表设计三个查询场景，解释该建什么索引以及原因",
      createdAt: today,
      updatedAt: today,
    },
  ];

  let knowledgePoints: AppState["knowledgePoints"] = [];
  let reviewReminders: AppState["reviewReminders"] = [];
  notes.forEach((note) => {
    knowledgePoints = upsertKnowledgeFromNote(note, knowledgePoints, goals);
    reviewReminders = buildReviewSchedule(note, reviewReminders);
  });
  reviewReminders = reviewReminders.map((reminder, index) =>
    index < 2 ? { ...reminder, dueAt: today } : reminder,
  );
  knowledgePoints = knowledgePoints.map((point) =>
    point.name === "联合索引" || point.name === "最左前缀" || point.name === "B+ 树"
      ? {
          ...point,
          masteryScore: 32,
          evidenceCount: 2,
          systemMastery: "初学",
          lastTestScore: 45,
          lastReviewedAt: addDaysIso(today, -10),
          repeatedMistakeCount: point.name === "联合索引" ? 1 : 0,
          reviewPriority: "高",
          reason: "最近自测低分，且关联错题",
        }
      : point,
  );

  const dbIndexPointIds = knowledgePoints
    .filter((point) => ["B+ 树", "联合索引", "最左前缀"].includes(point.name))
    .map((point) => point.id);
  const tcpPointIds = knowledgePoints
    .filter((point) => ["SYN", "ACK", "初始序列号"].includes(point.name))
    .map((point) => point.id);

  const resources: Resource[] = [
    {
      id: "resource_tcp_courseware",
      title: "计算机网络 TCP 连接管理资料",
      type: "markdown",
      goalId: "goal_shared_backend",
      sourceName: "课程资料摘录",
      fileName: "tcp-connection.md",
      contentText:
        "# TCP 连接管理\n\nTCP 建立连接需要三次握手。客户端发送 SYN，服务端返回 SYN+ACK，客户端再发送 ACK，用于确认双方收发能力并同步初始序列号。\n\n## 两次握手的问题\n两次握手无法确认客户端接收能力，历史连接请求可能让服务端误以为新连接已经建立，从而浪费半连接队列等资源。\n\n## 相关考点\nSYN、ACK、初始序列号、半连接队列、SYN Flood、四次挥手和 TIME_WAIT 都经常一起考。",
      status: "已解析",
      createdAt: today,
      updatedAt: today,
    },
  ];

  const resourceChunks: ResourceChunk[] = [
    {
      id: "chunk_tcp_handshake",
      resourceId: "resource_tcp_courseware",
      goalId: "goal_shared_backend",
      title: "TCP 三次握手",
      content:
        "TCP 建立连接需要三次握手。客户端发送 SYN，服务端返回 SYN+ACK，客户端再发送 ACK，用于确认双方收发能力并同步初始序列号。",
      orderIndex: 0,
      summary: "三次握手确认双方收发能力并同步初始序列号。",
      knowledgePointIds: tcpPointIds,
      createdAt: today,
    },
    {
      id: "chunk_tcp_two_handshake",
      resourceId: "resource_tcp_courseware",
      goalId: "goal_shared_backend",
      title: "两次握手的问题",
      content:
        "两次握手无法确认客户端接收能力，历史连接请求可能让服务端误以为新连接已经建立，从而浪费半连接队列等资源。",
      orderIndex: 1,
      summary: "两次握手无法可靠确认客户端接收能力，也可能带来旧连接资源浪费。",
      knowledgePointIds: tcpPointIds,
      createdAt: today,
    },
  ];

  const milestones: Milestone[] = [
    {
      id: "milestone_408_data_structure_round1",
      goalId: "goal_kaoyan_408",
      title: "数据结构第一轮",
      description: "完成线性表、栈队列、树、图和排序基础笔记，并配套自测。",
      deadline: addDaysIso(today, -6),
      status: "延期",
      progress: 35,
      createdAt: addDaysIso(today, -18),
      updatedAt: today,
    },
    {
      id: "milestone_frontend_training",
      goalId: "goal_career_frontend",
      title: "前端项目训练闭环",
      description: "完成 TodoList 第一版，沉淀组件状态、持久化和项目复盘。",
      deadline: addDaysIso(today, 14),
      status: "进行中",
      progress: 42,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: "milestone_backend_database",
      goalId: "goal_shared_backend",
      title: "数据库索引专项",
      description: "用自测和错题把 B+ 树、联合索引、回表、覆盖索引讲清楚。",
      deadline: addDaysIso(today, 7),
      status: "进行中",
      progress: 28,
      createdAt: today,
      updatedAt: today,
    },
  ];

  const plans: StudyPlan[] = [
    {
      id: "plan_review_react",
      title: "复习 React Hooks，并写出 useEffect 依赖数组示例",
      scope: "今日",
      category: "前端开发",
      track: "career",
      dueDate: today,
      status: "进行中",
      source: "复习系统",
      noteId: "note_react_hooks",
      goalId: "goal_career_frontend",
      createdAt: today,
    },
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
      milestoneId: "milestone_frontend_training",
      createdAt: today,
    },
    {
      id: "plan_db_index_training",
      title: "完成数据库索引 5 题自测并复盘错题",
      scope: "今日",
      category: "后端 / 数据库",
      track: "shared",
      dueDate: today,
      status: "未开始",
      source: "自测系统",
      noteId: "note_db_index",
      goalId: "goal_shared_backend",
      milestoneId: "milestone_backend_database",
      createdAt: today,
    },
  ];

  const questions: Question[] = [
    {
      id: "question_db_left_prefix",
      goalId: "goal_shared_backend",
      noteId: "note_db_index",
      knowledgePointIds: dbIndexPointIds,
      type: "面试题",
      question: "联合索引为什么要遵守最左前缀原则？请结合一个查询例子说明。",
      answer: "联合索引按照列顺序组织，查询需要从索引最左列开始匹配，才能有效利用有序结构缩小扫描范围。",
      difficulty: 4,
      source: "AI生成",
      createdAt: today,
    },
    {
      id: "question_tcp_two_handshake",
      goalId: "goal_shared_backend",
      noteId: "note_tcp_handshake",
      knowledgePointIds: tcpPointIds,
      type: "简答题",
      question: "为什么 TCP 建立连接不能只用两次握手？",
      answer: "两次握手无法确认客户端接收能力，也无法可靠同步双方初始序列号，历史连接请求还可能造成服务端资源浪费。",
      difficulty: 3,
      source: "AI生成",
      createdAt: today,
    },
  ];

  const answerAttempts: AnswerAttempt[] = [
    {
      id: "attempt_db_left_prefix_low",
      questionId: "question_db_left_prefix",
      score: 45,
      answerText: "联合索引要按顺序用，不然索引会失效。",
      feedback: "回答过浅。你没有解释联合索引的有序组织方式，也没有用查询条件说明为什么必须从最左列开始匹配。",
      createdAt: today,
    },
  ];

  const mistakes: Mistake[] = [
    {
      id: "mistake_db_left_prefix",
      questionId: "question_db_left_prefix",
      goalId: "goal_shared_backend",
      noteId: "note_db_index",
      knowledgePointIds: dbIndexPointIds,
      title: "联合索引为什么要遵守最左前缀原则？",
      reason: "回答停留在结论，没有说明 B+ 树索引的列顺序和查询条件如何匹配。",
      repeatedCount: 1,
      status: "待复习",
      createdAt: today,
      updatedAt: today,
    },
  ];

  const projects: PortfolioProject[] = [
    {
      id: "project_learning_system",
      title: "个人学习系统",
      track: "shared",
      techStack: ["React", "TypeScript", "本地存储", "间隔重复"],
      difficulty: "把笔记、复习、计划、反思和目标串成闭环，而不是只做静态列表。",
      learnings: "先从真实学习流程出发，再补功能；每个知识点都要能转化为复习和行动。",
      nextAction: "补充后端 API、登录、全文搜索和 AI 接口封装。",
      goalIds: ["goal_career_frontend", "goal_shared_backend"],
      knowledgePointIds: knowledgePoints
        .filter((point) => ["React Hooks", "组件状态", "联合索引"].includes(point.name))
        .map((point) => point.id),
      linkedNoteIds: ["note_react_hooks", "note_db_index"],
      createdAt: today,
    },
  ];

  const recommendations: Recommendation[] = [
    {
      id: "rec_seed_db_index",
      title: "专项训练：数据库索引",
      actionType: "做题",
      goalId: "goal_shared_backend",
      noteId: "note_db_index",
      knowledgePointId: dbIndexPointIds[0],
      priorityScore: 112,
      reasons: [
        "关联目标「后端与计算机基础交叉能力」，重要程度 4",
        "最近一次自测 45 分",
        "已经 10 天未复习",
        "出现在 1 道错题中",
      ],
      status: "待处理",
      createdAt: today,
    },
  ];

  const learningPaths: LearningPath[] = [
    {
      id: "path_backend_week",
      goalId: "goal_shared_backend",
      title: "后端与计算机基础 7 天自适应学习路径",
      startDate: today,
      endDate: addDaysIso(today, 6),
      status: "执行中",
      createdAt: today,
      updatedAt: today,
    },
  ];

  const learningPathSteps: LearningPathStep[] = [
    {
      id: "path_step_tcp_resource",
      pathId: "path_backend_week",
      goalId: "goal_shared_backend",
      title: "阅读资料并标注重点：计算机网络 TCP 连接管理资料",
      actionType: "读资料",
      sourceId: "resource_tcp_courseware",
      dueDate: today,
      estimatedMinutes: 45,
      status: "未开始",
      reasons: ["资料已解析，可直接进入学习", "关联目标「后端与计算机基础交叉能力」"],
    },
    {
      id: "path_step_db_mistake",
      pathId: "path_backend_week",
      goalId: "goal_shared_backend",
      title: "错题复盘：联合索引为什么要遵守最左前缀原则？",
      actionType: "错题复盘",
      sourceId: "mistake_db_left_prefix",
      dueDate: addDaysIso(today, 1),
      estimatedMinutes: 35,
      status: "未开始",
      reasons: ["错题重复 1 次", "回答停留在结论，需要解释索引结构"],
    },
    {
      id: "path_step_weekly_review",
      pathId: "path_backend_week",
      goalId: "goal_shared_backend",
      title: "生成并补充本周复盘：后端与计算机基础交叉能力",
      actionType: "周总结",
      dueDate: addDaysIso(today, 6),
      estimatedMinutes: 30,
      status: "未开始",
      reasons: ["用周总结校准掌握度和下周安排"],
    },
  ];

  const importJobs: ImportJob[] = [
    {
      id: "import_job_tcp_courseware",
      resourceId: "resource_tcp_courseware",
      status: "已完成",
      step: "生成题目",
      createdAt: today,
      updatedAt: today,
    },
  ];

  const reviewPolicies: ReviewPolicy[] = [
    {
      id: "review_policy_default",
      name: "默认自适应复习策略",
      baseIntervals: [1, 3, 7, 14, 30],
      lowScoreInterval: 1,
      highScoreMultiplier: 1.5,
    },
  ];

  const studyEvents: StudyEvent[] = [
    {
      id: "event_seed_attempt",
      type: "answered_question",
      goalId: "goal_shared_backend",
      noteId: "note_db_index",
      score: 45,
      title: "完成数据库索引自测，得分 45",
      createdAt: today,
    },
    {
      id: "event_seed_mistake",
      type: "created_mistake",
      goalId: "goal_shared_backend",
      noteId: "note_db_index",
      title: "联合索引最左前缀错题进入错题本",
      createdAt: today,
    },
  ];

  return {
    notes,
    resources,
    resourceChunks,
    searchDocuments: [],
    learningPaths,
    learningPathSteps,
    knowledgePoints,
    milestones,
    plans,
    reviewReminders,
    reflections: [
      {
        id: uid("reflection"),
        weekStart: today,
        goalFocusIds: ["goal_kaoyan_408", "goal_career_frontend"],
        generatedSummary:
          "本周系统中已有前端、网络、数据库三个方向的学习记录。双路线知识点需要优先复习，项目实践要跟上笔记沉淀。",
        wins: "完成第一批结构化笔记，明确了 React、TCP、数据库索引的下一步行动。",
        blockers: "项目记录较少，部分知识还停留在理解层，需要通过讲解和代码验证。",
        masteryNotes: "React Hooks 与数据库索引仍是初学状态，TCP 三次握手可以开始做费曼讲解。",
        nextWeekFocus: "完成 TodoList 小项目；复习 TCP 和数据库索引；每周至少一次技术复盘。",
        createdAt: today,
      },
    ],
    goals,
    projects,
    questions,
    answerAttempts,
    mistakes,
    recommendations,
    studyEvents,
    rubrics: [],
    aiGradingResults: [],
    knowledgeRelations: [],
    reviewPolicies,
    importJobs,
  };
}
