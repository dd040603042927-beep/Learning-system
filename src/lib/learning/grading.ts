import type { AiGradingResult, Question, Rubric } from "../../types";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
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

export function buildAttemptFeedback(question: Question, score: number, answerText: string) {
  const normalizedScore = clampScore(score);
  const answerLength = answerText.trim().length;
  if (normalizedScore >= 85) {
    return `掌握较稳。你已经能覆盖「${question.type}」的核心要求，可以安排下一轮间隔复习。`;
  }
  if (normalizedScore >= 70) {
    return "基本正确，但建议补充关键原因、边界条件或例子，避免只背结论。";
  }
  if (answerLength < 20) {
    return "回答过短，证据不足。建议补充定义、原因、例子和容易混淆点。";
  }
  return "本题未达标，建议回到关联笔记重学，并把错误原因写进错题本。";
}

function normalizeCriterionText(value: string) {
  return value.replace(/^\d+[.、]\s*/, "").trim();
}

export function buildDefaultRubric(question: Question): Rubric {
  const concepts = extractKeywordsFromText(`${question.question}\n${question.answer}`, [], 10)
    .filter((keyword) => keyword.length >= 2 && keyword.length <= 20)
    .slice(0, 5);
  const criteria = cleanUnique([
    question.answer ? "覆盖参考答案中的核心结论" : "回答题干中的核心问题",
    ...concepts.map((concept) => `说明「${concept}」的含义或作用`),
    "补充关键原因、边界条件或例子",
    question.type === "费曼讲解题" ? "能用通俗语言讲清楚并举例" : "",
  ].filter(Boolean)).slice(0, 6);

  return {
    id: uid("rubric"),
    questionId: question.id,
    criteria: criteria.length ? criteria : ["覆盖核心结论", "说明原因", "给出例子"],
    totalScore: 100,
  };
}

function criterionMatched(answerText: string, criterion: string, referenceAnswer: string) {
  const answerTokens = new Set(tokenizeText(answerText));
  const criterionKeywords = extractKeywordsFromText(criterion, [], 8);
  const referenceKeywords = extractKeywordsFromText(referenceAnswer, [], 14);
  const expectedKeywords = cleanUnique([...criterionKeywords, ...referenceKeywords]).slice(0, 12);
  if (expectedKeywords.length === 0) return answerText.trim().length >= 20;
  const matched = expectedKeywords.filter((keyword) => answerTokens.has(keyword.toLowerCase()));
  return matched.length >= Math.max(1, Math.ceil(Math.min(expectedKeywords.length, 5) * 0.35));
}

function buildImprovedAnswer(question: Question, missingPoints: string[]) {
  const base = question.answer.trim()
    ? `核心答案：${question.answer.trim()}`
    : `先直接回答题干「${question.question.trim()}」。`;
  const missing = missingPoints.length
    ? `还需要补充：${missingPoints.slice(0, 4).join("；")}。`
    : "得分点已经覆盖较完整，可以补一个例子或边界条件让表达更稳。";
  const example =
    question.type === "费曼讲解题"
      ? "最后用通俗比喻讲一遍，并补一个容易出错的反例。"
      : "最后补一个具体例子、适用条件或容易混淆点。";
  return [base, missing, example].join("\n");
}

export function gradeAnswerWithRubric(
  question: Question,
  rubric: Rubric,
  answerText: string,
): Omit<AiGradingResult, "id" | "attemptId" | "createdAt"> {
  const criteria = rubric.criteria.map(normalizeCriterionText).filter(Boolean);
  const totalScore = Math.max(1, rubric.totalScore || 100);
  if (!answerText.trim()) {
    return {
      questionId: question.id,
      score: 0,
      strengths: [],
      deductions: ["扣 100 分：未提交答案，无法覆盖任何评分规则。"],
      missingPoints: criteria.length ? criteria : ["未提交答案"],
      misconception: "没有作答，无法形成掌握证据。",
      improvedAnswer: buildImprovedAnswer(question, criteria.length ? criteria : ["未提交答案"]),
      nextAction: "先阅读参考答案和关联笔记，再用自己的话完整回答一次。",
    };
  }

  const scoredCriteria = criteria.length ? criteria : buildDefaultRubric(question).criteria;
  const matchedCriteria = scoredCriteria.filter((criterion) =>
    criterionMatched(answerText, criterion, question.answer),
  );
  const missingPoints = scoredCriteria.filter((criterion) => !matchedCriteria.includes(criterion));
  const lengthBonus = answerText.trim().length >= 80 ? 8 : answerText.trim().length >= 35 ? 4 : 0;
  const referenceTokens = new Set(tokenizeText(question.answer));
  const answerTokens = new Set(tokenizeText(answerText));
  const referenceMatched = [...referenceTokens].filter((token) => answerTokens.has(token));
  const coverageBonus =
    referenceTokens.size === 0
      ? 0
      : Math.min(12, Math.round((referenceMatched.length / referenceTokens.size) * 12));
  const baseScore = Math.round((matchedCriteria.length / scoredCriteria.length) * totalScore);
  const score = clampScore((baseScore / totalScore) * 100 + lengthBonus + coverageBonus);
  const pointValue = Math.max(1, Math.round(100 / scoredCriteria.length));
  const deductions = missingPoints
    .slice(0, 6)
    .map((criterion) => `扣约 ${pointValue} 分：遗漏「${criterion}」。`);
  if (answerText.trim().length < 35 && score < 70) {
    deductions.push("扣表达完整性分：答案过短，缺少定义、原因、例子或边界条件。");
  }
  if (coverageBonus < 4 && question.answer.trim()) {
    deductions.push("扣参考答案覆盖分：与参考答案关键词重合较少，需要回到资料核对核心表述。");
  }
  const strengths = matchedCriteria.length
    ? matchedCriteria.slice(0, 4).map((criterion) => `已覆盖：${criterion}`)
    : ["能看出已尝试作答，但关键得分点覆盖不足"];
  const misconception =
    score >= 85
      ? "主要得分点覆盖较完整。"
      : missingPoints[0]
        ? `主要缺口：${missingPoints[0]}。`
        : "答案有一定覆盖，但还需要补充原因、边界条件或例子。";
  const nextAction =
    score >= 85
      ? "安排下一轮间隔复习，并尝试换一种例子讲解。"
      : score >= 60
        ? "补齐遗漏得分点后，再做一次费曼讲解。"
        : "回到关联笔记重学，把遗漏点写进错题复盘，并明天再次自测。";

  return {
    questionId: question.id,
    score,
    strengths,
    deductions,
    missingPoints,
    misconception,
    improvedAnswer: buildImprovedAnswer(question, missingPoints),
    nextAction,
  };
}
