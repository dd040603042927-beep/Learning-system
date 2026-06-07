import type { AppState, Goal, Note, PortfolioProject, StudyPlan } from "../types";
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
      createdAt: today,
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
      linkedNoteIds: ["note_react_hooks", "note_db_index"],
      createdAt: today,
    },
  ];

  return {
    notes,
    knowledgePoints,
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
  };
}
