import type { AppState, SearchDocument } from "../../types";
import {
  buildLocalEmbedding,
  cleanUnique,
  cosineSimilarity,
  extractKeywordsFromText,
  goalImportanceLabels,
  masteryFromScore,
  normalizeState,
  todayIso,
  trackShortLabels,
} from "../learning";

export interface KnowledgeSearchResult {
  document: SearchDocument;
  score: number;
  keywordScore: number;
  semanticScore: number;
  matchedKeywords: string[];
  sourceLabel: string;
}

export interface KnowledgeAnswer {
  answer: string;
  sources: KnowledgeSearchResult[];
}

function sourceTypeLabel(sourceType: SearchDocument["sourceType"]) {
  const labels: Record<SearchDocument["sourceType"], string> = {
    note: "笔记",
    resource: "资料",
    question: "题目",
    mistake: "错题",
    knowledge: "知识点",
    goal: "目标",
    milestone: "里程碑",
    reflection: "复盘",
  };
  return labels[sourceType];
}

function stripMarkdownSyntax(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(text: string) {
  const normalized = stripMarkdownSyntax(text).toLowerCase();
  const tokens = new Set<string>();
  const matches = normalized.match(/[a-z0-9+#.]{2,}|[\u4e00-\u9fff]{2,}/g) || [];
  matches.forEach((match) => {
    if (/^[\u4e00-\u9fff]+$/.test(match) && match.length > 6) {
      for (let size = 2; size <= 4; size += 1) {
        for (let index = 0; index <= match.length - size; index += 1) {
          tokens.add(match.slice(index, index + size));
        }
      }
      return;
    }
    tokens.add(match);
  });
  return [...tokens].filter((token) => token.length >= 2);
}

const semanticAliases: Array<[string, string[]]> = [
  ["不能", ["无法", "不是", "不可以", "做不到"]],
  ["原因", ["为什么", "问题", "根因"]],
  ["两次握手", ["二次握手", "少一次握手", "两次连接确认"]],
  ["三次握手", ["连接建立", "连接确认", "握手过程"]],
  ["历史报文", ["历史连接请求", "旧连接请求", "过期报文", "重复报文"]],
  ["确认", ["验证", "证明", "同步"]],
  ["接收能力", ["收发能力", "接收确认", "客户端接收"]],
  ["初始序列号", ["序列号同步", "ISN", "双方序列号"]],
  ["资源浪费", ["服务端资源", "半连接队列", "无效连接"]],
  ["最左前缀", ["列顺序", "联合索引顺序", "从最左列开始"]],
  ["索引失效", ["无法命中索引", "不走索引", "索引不可用"]],
  ["掌握度", ["掌握分", "熟练度", "学习证据"]],
];

function collectSemanticTokens(text: string) {
  const normalized = stripMarkdownSyntax(text).toLowerCase();
  const tokens = new Set<string>(tokenizeText(normalized));
  const chineseRuns = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  chineseRuns.forEach((run) => {
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= run.length - size; index += 1) {
        tokens.add(run.slice(index, index + size));
      }
    }
  });

  semanticAliases.forEach(([term, aliases]) => {
    const group = [term, ...aliases].map((item) => item.toLowerCase());
    if (group.some((item) => normalized.includes(item))) {
      group.forEach((item) => tokens.add(item));
    }
  });

  return cleanUnique([...tokens]).filter((token) => token.length >= 2);
}

function makeSearchDocument(document: Omit<SearchDocument, "keywords" | "embedding" | "updatedAt"> & {
  keywords?: string[];
  updatedAt?: string;
}): SearchDocument {
  const keywords = extractKeywordsFromText(
    `${document.title}\n${document.content}`,
    document.keywords || [],
  );
  return {
    ...document,
    keywords,
    embedding: buildLocalEmbedding(`${document.title}\n${document.content}\n${keywords.join(" ")}`),
    updatedAt: document.updatedAt || todayIso(),
  };
}

export function buildSearchDocuments(state: AppState): SearchDocument[] {
  const normalized = normalizeState(state);
  const documents: SearchDocument[] = [];
  const addDocument = (document: Omit<SearchDocument, "keywords" | "embedding" | "updatedAt"> & {
    keywords?: string[];
    updatedAt?: string;
  }) => {
    documents.push(makeSearchDocument(document));
  };

  normalized.notes.forEach((note) =>
    addDocument({
      id: `search_note_${note.id}`,
      sourceType: "note",
      sourceId: note.id,
      goalId: note.associatedGoalIds[0],
      title: note.title,
      content: [note.summary, note.content, note.myUnderstanding, note.nextAction].filter(Boolean).join("\n"),
      keywords: [...note.coreConcepts, ...note.commonQuestions],
      updatedAt: note.updatedAt,
    }),
  );

  normalized.resources.forEach((resource) =>
    addDocument({
      id: `search_resource_${resource.id}`,
      sourceType: "resource",
      sourceId: resource.id,
      goalId: resource.goalId,
      title: resource.title,
      content: resource.contentText,
      keywords: [resource.sourceName || "", resource.fileName || "", resource.type],
      updatedAt: resource.updatedAt,
    }),
  );

  normalized.resourceChunks.forEach((chunk) =>
    addDocument({
      id: `search_chunk_${chunk.id}`,
      sourceType: "resource",
      sourceId: chunk.resourceId,
      goalId: chunk.goalId,
      title: chunk.title,
      content: [chunk.summary, chunk.content].filter(Boolean).join("\n"),
      updatedAt: chunk.createdAt,
    }),
  );

  normalized.knowledgePoints.forEach((point) =>
    addDocument({
      id: `search_knowledge_${point.id}`,
      sourceType: "knowledge",
      sourceId: point.id,
      goalId: point.goalIds[0],
      title: point.name,
      content: [
        point.reason,
        `掌握分 ${point.masteryScore}`,
        `系统掌握 ${point.systemMastery || masteryFromScore(point.masteryScore)}`,
        point.lastTestScore !== undefined ? `最近自测 ${point.lastTestScore}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      keywords: [point.mastery, point.reviewPriority],
      updatedAt: point.updatedAt,
    }),
  );

  normalized.questions.forEach((question) =>
    addDocument({
      id: `search_question_${question.id}`,
      sourceType: "question",
      sourceId: question.id,
      goalId: question.goalId,
      title: question.question,
      content: question.answer,
      keywords: [question.type, question.source],
      updatedAt: question.createdAt,
    }),
  );

  normalized.mistakes.forEach((mistake) =>
    addDocument({
      id: `search_mistake_${mistake.id}`,
      sourceType: "mistake",
      sourceId: mistake.id,
      goalId: mistake.goalId,
      title: mistake.title,
      content: mistake.reason,
      keywords: [mistake.status, `重复${mistake.repeatedCount}次`],
      updatedAt: mistake.updatedAt,
    }),
  );

  normalized.goals.forEach((goal) =>
    addDocument({
      id: `search_goal_${goal.id}`,
      sourceType: "goal",
      sourceId: goal.id,
      goalId: goal.id,
      title: goal.title,
      content: [goal.domain, goal.category, goal.description, goal.currentLevel || "", goal.linkedKnowledge.join("、")]
        .filter(Boolean)
        .join("\n"),
      keywords: [goal.status, goalImportanceLabels[goal.importance], trackShortLabels[goal.track]],
      updatedAt: goal.updatedAt || goal.createdAt || todayIso(),
    }),
  );

  normalized.milestones.forEach((milestone) =>
    addDocument({
      id: `search_milestone_${milestone.id}`,
      sourceType: "milestone",
      sourceId: milestone.id,
      goalId: milestone.goalId,
      title: milestone.title,
      content: [milestone.description, `截止 ${milestone.deadline}`, `进度 ${milestone.progress}%`].join("\n"),
      keywords: [milestone.status],
      updatedAt: milestone.updatedAt,
    }),
  );

  normalized.reflections.forEach((reflection) =>
    addDocument({
      id: `search_reflection_${reflection.id}`,
      sourceType: "reflection",
      sourceId: reflection.id,
      goalId: reflection.goalFocusIds?.[0],
      title: `周总结 ${reflection.weekStart}`,
      content: [
        reflection.generatedSummary,
        reflection.wins,
        reflection.blockers,
        reflection.masteryNotes,
        reflection.nextWeekFocus,
      ]
        .filter(Boolean)
        .join("\n"),
      updatedAt: reflection.createdAt,
    }),
  );

  return documents;
}

export function searchKnowledgeBase(
  state: AppState,
  query: string,
  filters: { goalId?: string; sourceTypes?: SearchDocument["sourceType"][] } = {},
): KnowledgeSearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const documents = buildSearchDocuments(state);
  const terms = collectSemanticTokens(trimmedQuery);
  const queryEmbedding = buildLocalEmbedding(trimmedQuery);
  const queryLower = trimmedQuery.toLowerCase();
  return documents
    .filter((document) => (filters.goalId ? document.goalId === filters.goalId : true))
    .filter((document) =>
      filters.sourceTypes?.length ? filters.sourceTypes.includes(document.sourceType) : true,
    )
    .map((document) => {
      const title = document.title.toLowerCase();
      const content = document.content.toLowerCase();
      const keywordText = document.keywords.join(" ").toLowerCase();
      let keywordScore = 0;
      if (title.includes(queryLower)) keywordScore += 80;
      if (content.includes(queryLower)) keywordScore += 45;
      const matchedKeywords = terms.filter((term) => {
        const matched = title.includes(term) || content.includes(term) || keywordText.includes(term);
        if (!matched) return false;
        if (title.includes(term)) keywordScore += 16;
        if (keywordText.includes(term)) keywordScore += 10;
        if (content.includes(term)) keywordScore += 5;
        return true;
      });
      const semanticScore = Math.max(
        0,
        Math.round(cosineSimilarity(queryEmbedding, document.embedding) * 100),
      );
      let score = keywordScore + (semanticScore >= 16 ? Math.round(semanticScore * 0.85) : 0);
      if (document.sourceType === "mistake" || document.sourceType === "knowledge") score += 4;
      if (filters.goalId && document.goalId === filters.goalId) score += 8;
      return {
        document,
        score,
        keywordScore,
        semanticScore,
        matchedKeywords: cleanUnique(matchedKeywords),
        sourceLabel: sourceTypeLabel(document.sourceType),
      };
    })
    .filter((result) => result.keywordScore > 0 || result.semanticScore >= 16)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

function makeSnippet(content: string, query: string, maxLength = 120) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  const queryTerms = tokenizeText(query);
  const lower = compact.toLowerCase();
  const index = queryTerms
    .map((term) => lower.indexOf(term))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0];
  const start = index === undefined ? 0 : Math.max(0, index - 24);
  return `${start > 0 ? "..." : ""}${compact.slice(start, start + maxLength)}...`;
}

export function answerKnowledgeQuestion(state: AppState, question: string): KnowledgeAnswer {
  const sources = searchKnowledgeBase(state, question, {
    sourceTypes: ["note", "resource", "question", "mistake", "knowledge"],
  }).slice(0, 5);
  if (sources.length === 0) {
    return {
      answer: "当前知识库没有召回到足够相关的内容。可以先导入资料、补充笔记，或换一个更具体的关键词再问。",
      sources,
    };
  }

  const sourceLines = sources
    .slice(0, 3)
    .map((result, index) => {
      const snippet = makeSnippet(result.document.content, question, 90);
      return `${index + 1}. ${result.sourceLabel}《${result.document.title}》：${snippet}`;
    });
  const keyTerms = cleanUnique(sources.flatMap((result) => result.matchedKeywords)).slice(0, 8);
  return {
    answer: [
      `根据当前知识库，问题「${question.trim()}」主要关联 ${sources
        .slice(0, 3)
        .map((result) => `${result.sourceLabel}《${result.document.title}》`)
        .join("、")}。`,
      keyTerms.length ? `可优先围绕这些关键词复习：${keyTerms.join("、")}。` : "",
      "建议先阅读排在最前的来源，再把结论补写成自己的解释；如果涉及错题，优先复盘错误原因。",
      "",
      "参考来源：",
      ...sourceLines,
    ]
      .filter(Boolean)
      .join("\n"),
    sources,
  };
}
