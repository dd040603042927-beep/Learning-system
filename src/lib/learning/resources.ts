import type { Goal, KnowledgePoint, Note, Question, Resource, ResourceChunk, ResourceType } from "../../types";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function cleanUnique(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function extractKeywordsFromText(text: string, extra: string[] = [], maxCount = 18) {
  const technicalTerms = text.match(/[A-Z][A-Z0-9+#]{1,}|[A-Za-z]+(?:\.[A-Za-z]+)+/g) || [];
  const headingTerms = text
    .split(/\n+/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length >= 2 && line.length <= 24)
    .slice(0, 8);
  return cleanUnique([...extra, ...technicalTerms, ...headingTerms, ...tokenizeText(text)])
    .filter((keyword) => !/^(的|了|和|是|在|为什么|需要|可以)$/.test(keyword))
    .slice(0, maxCount);
}

export function inferResourceTypeFromName(fileName: string): ResourceType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return "txt";
}

export function summarizeText(text: string, maxLength = 120) {
  const normalized = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

export function extractResourceConcepts(contentText: string, title = "") {
  const headings = contentText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^#{1,4}\s+/.test(line) || /^[一二三四五六七八九十\d]+[.、]\s*/.test(line))
    .map((line) => line.replace(/^#{1,4}\s+/, "").replace(/^[一二三四五六七八九十\d]+[.、]\s*/, "").trim())
    .filter((line) => line.length >= 2 && line.length <= 18);
  const keywords = extractKeywordsFromText(`${title}\n${contentText}`, [], 24).filter(
    (keyword) => keyword.length >= 2 && keyword.length <= 18,
  );
  return cleanUnique([...headings, ...keywords]).slice(0, 10);
}

export function buildResourceChunks(resource: Resource, maxChunkLength = 720): ResourceChunk[] {
  const now = todayIso();
  const paragraphs = resource.contentText
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|(?=^#{1,4}\s+)/m)
    .map((part) => part.trim())
    .filter(Boolean);
  const sourceParts = paragraphs.length ? paragraphs : [resource.contentText.trim()].filter(Boolean);
  const grouped: string[] = [];
  let buffer = "";

  sourceParts.forEach((part) => {
    if (!buffer) {
      buffer = part;
      return;
    }
    if (`${buffer}\n\n${part}`.length > maxChunkLength) {
      grouped.push(buffer);
      buffer = part;
      return;
    }
    buffer = `${buffer}\n\n${part}`;
  });
  if (buffer) grouped.push(buffer);

  return grouped.map((content, index) => {
    const firstLine =
      content
        .split(/\n+/)
        .map((line) => line.replace(/^#{1,4}\s+/, "").trim())
        .find(Boolean) || `${resource.title} 分段 ${index + 1}`;
    return {
      id: uid("chunk"),
      resourceId: resource.id,
      goalId: resource.goalId,
      title: firstLine.slice(0, 40),
      content,
      orderIndex: index,
      summary: summarizeText(content, 120),
      knowledgePointIds: [],
      createdAt: now,
    };
  });
}

export function buildNoteFromResource(
  resource: Resource,
  chunks: ResourceChunk[],
  goals: Goal[],
): Note {
  const goal = goals.find((item) => item.id === resource.goalId);
  const concepts = extractResourceConcepts(resource.contentText, resource.title);
  const today = todayIso();
  return {
    id: uid("note"),
    title: resource.title,
    type: goal?.domain.includes("考研") ? "考研" : resource.type === "web" ? "读书" : "技术",
    direction: goal?.domain || resource.sourceName || "资料导入",
    tracks: goal ? [goal.track] : ["shared"],
    associatedGoalIds: goal ? [goal.id] : [],
    mastery: "初学",
    importance: goal?.importance && goal.importance >= 4 ? "高" : "中",
    summary: summarizeText(chunks.map((chunk) => chunk.summary || chunk.content).join(" "), 180),
    content: chunks.map((chunk) => `## ${chunk.title}\n${chunk.content}`).join("\n\n"),
    coreConcepts: concepts,
    commonQuestions: concepts.slice(0, 4).map((concept) => `用自己的话解释「${concept}」，它解决什么问题？`),
    myUnderstanding: "",
    relatedNoteIds: [],
    reviewRecords: [],
    nextAction: concepts[0] ? `围绕「${concepts[0]}」完成一次自测和费曼讲解` : "整理资料要点并完成一次自测",
    createdAt: today,
    updatedAt: today,
  };
}

export function generateQuestionsFromResource(
  resource: Resource,
  chunks: ResourceChunk[],
  knowledgePoints: KnowledgePoint[],
  count = 4,
): Question[] {
  const concepts = extractResourceConcepts(resource.contentText, resource.title);
  const relatedPointIds = knowledgePoints
    .filter((point) =>
      concepts.some((concept) => concept.toLowerCase() === point.name.toLowerCase()),
    )
    .map((point) => point.id);
  const prompts = cleanUnique([
    ...concepts.map((concept) => `为什么「${concept}」是「${resource.title}」里的关键知识点？`),
    ...chunks.slice(0, 3).map((chunk) => `请概括「${chunk.title}」的核心内容，并举一个应用场景。`),
    `请把「${resource.title}」讲给一个没有背景的人听。`,
  ]);

  return prompts.slice(0, Math.max(1, count)).map((prompt, index) => ({
    id: uid("question"),
    goalId: resource.goalId,
    knowledgePointIds: relatedPointIds,
    type: index % 3 === 2 ? "费曼讲解题" : "简答题",
    question: prompt,
    answer:
      chunks[index % Math.max(1, chunks.length)]?.summary ||
      summarizeText(resource.contentText, 160) ||
      "需要结合导入资料回答关键概念、原因、例子和易错点。",
    difficulty: Math.min(5, Math.max(2, 2 + index)) as Question["difficulty"],
    source: "AI生成",
    createdAt: todayIso(),
  }));
}
