import { Bot, Search, Upload } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { AppState, ResourceType } from "../types";
import type { KnowledgeSearchResult } from "../lib/learning";

const resourceTypes: ResourceType[] = ["markdown", "txt", "pdf", "web", "docx"];
const resourceTypeLabels: Record<ResourceType, string> = {
  markdown: "Markdown",
  txt: "TXT",
  pdf: "PDF",
  web: "网页摘录",
  docx: "Word",
};

interface ResourceDraft {
  title: string;
  type: ResourceType;
  goalId: string;
  sourceName: string;
  fileName: string;
  contentText: string;
}

interface KnowledgeBasePageProps {
  state: AppState;
  resourceDraft: ResourceDraft;
  setResourceDraft: Dispatch<SetStateAction<ResourceDraft>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  searchGoalId: string;
  setSearchGoalId: Dispatch<SetStateAction<string>>;
  knowledgeQuestion: string;
  setKnowledgeQuestion: Dispatch<SetStateAction<string>>;
  knowledgeAnswer: string;
  searchResults: KnowledgeSearchResult[];
  searchDocumentCount: number;
  onImportResource: () => void;
  onImportResourceFile: (file: File | null) => void;
  onAskKnowledgeBase: () => void;
  onRefreshSearchDocuments: () => void;
}

export function KnowledgeBasePage({
  state,
  resourceDraft,
  setResourceDraft,
  searchQuery,
  setSearchQuery,
  searchGoalId,
  setSearchGoalId,
  knowledgeQuestion,
  setKnowledgeQuestion,
  knowledgeAnswer,
  searchResults,
  searchDocumentCount,
  onImportResource,
  onImportResourceFile,
  onAskKnowledgeBase,
  onRefreshSearchDocuments,
}: KnowledgeBasePageProps) {
  return (
    <div className="stack">
      <section className="dashboard-grid">
        <MetricCard label="资料" value={state.resources.length} hint="已导入学习输入" tone="info" />
        <MetricCard label="资料分段" value={state.resourceChunks.length} hint="可检索内容块" />
        <MetricCard label="向量文档" value={searchDocumentCount} hint="笔记 / 题目 / 资料 / 错题" tone="success" />
        <MetricCard
          label="待解析"
          value={state.resources.filter((resource) => resource.status !== "已解析").length}
          hint="需要补充正文或解析"
          tone="warning"
        />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">资料导入</p>
              <h2>把外部资料变成学习对象</h2>
            </div>
            <button className="primary-button" onClick={onImportResource}>
              <Upload size={18} />
              导入并解析
            </button>
          </div>
          <div className="form-grid">
            <label>
              标题
              <input
                value={resourceDraft.title}
                onChange={(event) => setResourceDraft({ ...resourceDraft, title: event.target.value })}
              />
            </label>
            <label>
              类型
              <select
                value={resourceDraft.type}
                onChange={(event) =>
                  setResourceDraft({ ...resourceDraft, type: event.target.value as ResourceType })
                }
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {resourceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              关联目标
              <select
                value={resourceDraft.goalId}
                onChange={(event) => setResourceDraft({ ...resourceDraft, goalId: event.target.value })}
              >
                <option value="">不绑定目标</option>
                {state.goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              来源
              <input
                value={resourceDraft.sourceName}
                onChange={(event) => setResourceDraft({ ...resourceDraft, sourceName: event.target.value })}
              />
            </label>
          </div>
          <div className="button-row resource-file-row">
            <label className="ghost-button file-button">
              <Upload size={16} />
              选择 Markdown/TXT/PDF/Word
              <input
                type="file"
                accept=".md,.markdown,.txt,.pdf,.docx,text/plain,text/markdown,application/pdf"
                onChange={(event) => onImportResourceFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {resourceDraft.fileName && <Badge tone="neutral">{resourceDraft.fileName}</Badge>}
          </div>
          <label className="wide-field">
            资料正文
            <textarea
              className="tall"
              value={resourceDraft.contentText}
              onChange={(event) => setResourceDraft({ ...resourceDraft, contentText: event.target.value })}
            />
          </label>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">搜索中心</p>
              <h2>关键词 + 语义混合检索</h2>
            </div>
            <button className="ghost-button" onClick={onRefreshSearchDocuments}>
              <Search size={16} />
              刷新索引
            </button>
          </div>
          <div className="inline-form search-form">
            <input
              placeholder="搜索笔记、资料、题目、错题、目标"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <select value={searchGoalId} onChange={(event) => setSearchGoalId(event.target.value)}>
              <option value="">全部目标</option>
              {state.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>
          <label className="wide-field">
            问我的知识库
            <textarea
              value={knowledgeQuestion}
              onChange={(event) => setKnowledgeQuestion(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="primary-button" onClick={onAskKnowledgeBase}>
              <Bot size={18} />
              生成带来源回答
            </button>
          </div>
          <div className="ai-output compact-output">
            <pre>{knowledgeAnswer || "混合检索会优先从笔记、资料、错题、自测题和知识点中匹配来源；没有来源时不会生成肯定答案。"}</pre>
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">检索结果</p>
              <h2>{searchQuery ? `${searchResults.length} 条匹配` : "输入关键词开始搜索"}</h2>
            </div>
          </div>
          <div className="card-list">
            {searchResults.map((result) => (
              <div className="search-result-card" key={result.document.id}>
                <div className="card-title-row">
                  <div>
                    <strong>{result.document.title}</strong>
                    <span>
                      {result.sourceLabel}
                      {result.matchedKeywords.length ? ` · ${result.matchedKeywords.slice(0, 5).join("、")}` : ""}
                    </span>
                  </div>
                  <Badge tone="info">{result.score}</Badge>
                </div>
                <div className="search-score-row">
                  <span>关键词 {result.keywordScore}</span>
                  <span>语义 {result.semanticScore}</span>
                </div>
                <p>{result.document.content.slice(0, 180) || "暂无正文"}</p>
              </div>
            ))}
            {searchQuery && searchResults.length === 0 && <EmptyState text="没有匹配结果。可以换关键词，或先导入资料/补充笔记。" />}
            {!searchQuery && <EmptyState text="搜索范围包含笔记、资料、题目、错题、知识点、目标和复盘。" />}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">资料库</p>
              <h2>{state.resources.length} 份资料</h2>
            </div>
          </div>
          <div className="card-list">
            {state.resources.map((resource) => {
              const goal = state.goals.find((item) => item.id === resource.goalId);
              const chunks = state.resourceChunks.filter((chunk) => chunk.resourceId === resource.id);
              return (
                <div className="resource-card" key={resource.id}>
                  <div className="card-title-row">
                    <div>
                      <strong>{resource.title}</strong>
                      <span>
                        {resourceTypeLabels[resource.type]} · {chunks.length} 个分段
                        {goal ? ` · ${goal.title}` : ""}
                      </span>
                    </div>
                    <Badge tone={resource.status === "已解析" ? "success" : "warning"}>
                      {resource.status}
                    </Badge>
                  </div>
                  <p>{resource.contentText.slice(0, 160) || "暂无正文，等待解析。"}</p>
                </div>
              );
            })}
            {state.resources.length === 0 && <EmptyState text="还没有导入资料。" />}
          </div>
        </div>
      </section>
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

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
