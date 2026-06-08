const actionLabels = {
  summary: "笔记总结",
  concepts: "知识点提取",
  quiz: "生成复习题",
  socratic: "反问式学习",
  next: "下一步建议",
};

function pickNote(state, noteId) {
  if (!noteId) return state.notes?.[0];
  return state.notes?.find((note) => note.id === noteId) || state.notes?.[0];
}

function buildPrompt({ action, state, note }) {
  const actionLabel = actionLabels[action] || action;
  const currentNote = note
    ? [
        `标题：${note.title}`,
        `类型：${note.type}`,
        `方向：${note.direction}`,
        `掌握程度：${note.mastery}`,
        `重要程度：${note.importance}`,
        `摘要：${note.summary}`,
        `核心概念：${note.coreConcepts?.join("、") || ""}`,
        `常见问题：${note.commonQuestions?.join("；") || ""}`,
        `我的理解：${note.myUnderstanding}`,
        `下一步行动：${note.nextAction}`,
        `内容：${note.content}`,
      ].join("\n")
    : "当前没有选中笔记。";

  const context = [
    `笔记数量：${state.notes?.length || 0}`,
    `计划数量：${state.plans?.length || 0}`,
    `目标数量：${state.goals?.length || 0}`,
    `到期/待复习数量：${state.reviewReminders?.filter((item) => item.status === "待复习").length || 0}`,
    `目标：${state.goals?.map((goal) => `${goal.title}(${goal.progress}%)`).join("；") || ""}`,
  ].join("\n");

  return [
    "你是一个严谨的个人学习系统 AI 助手，服务于用户自定义目标驱动学习。",
    "回答必须使用中文，直接给出可执行建议，不要写空泛鼓励。",
    `当前动作：${actionLabel}`,
    "",
    "当前学习上下文：",
    context,
    "",
    "当前笔记：",
    currentNote,
    "",
    "输出要求：",
    action === "quiz"
      ? "生成 5 道复习题，包含简答题、面试题和费曼讲解题。"
      : action === "socratic"
        ? "只提出反问式问题，引导用户自己解释，不直接给完整答案。"
        : action === "next"
          ? "给出 4 条下一步学习任务，按优先级排序，每条都要可执行。"
          : "给出摘要、重点、薄弱点和下一步行动。",
  ].join("\n");
}

export async function runRealAi({ action, state, noteId }) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("未配置 AI_API_KEY 或 OPENAI_API_KEY");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const baseUrl =
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1/chat/completions";

  const note = pickNote(state, noteId);
  const prompt = buildPrompt({ action, state, note });
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "你是学习规划、复习和技术面试训练助手。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "AI 请求失败";
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  const output =
    payload?.choices?.[0]?.message?.content ||
    payload?.output_text ||
    payload?.data?.output ||
    "";

  if (!output.trim()) {
    const error = new Error("AI 返回为空");
    error.statusCode = 502;
    throw error;
  }

  return output.trim();
}
