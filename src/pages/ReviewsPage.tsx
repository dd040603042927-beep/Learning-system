import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  AppState,
  Mistake,
  Note,
  Question,
  ReviewMode,
  ReviewReminder,
  Rubric,
} from "../types";
import { buildDefaultRubric } from "../lib/learning";

interface QuestionDraft {
  noteId: string;
  goalId: string;
  type: Question["type"];
  question: string;
  answer: string;
  difficulty: Question["difficulty"];
}

interface ReviewsPageProps {
  state: AppState;
  due: ReviewReminder[];
  upcoming: ReviewReminder[];
  questionTypes: Question["type"][];
  questionDraft: QuestionDraft;
  setQuestionDraft: Dispatch<SetStateAction<QuestionDraft>>;
  selectedQuestion?: Question;
  selectedQuestionId: string;
  setSelectedQuestionId: Dispatch<SetStateAction<string>>;
  setSelectedNoteId: Dispatch<SetStateAction<string>>;
  answerDrafts: Record<string, { answerText: string; score: number }>;
  setAnswerDrafts: Dispatch<SetStateAction<Record<string, { answerText: string; score: number }>>>;
  rubricDrafts: Record<string, { criteriaText: string; totalScore: number }>;
  setRubricDrafts: Dispatch<SetStateAction<Record<string, { criteriaText: string; totalScore: number }>>>;
  onGenerateQuestionsForSelectedNote: () => void;
  onAddManualQuestion: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onEnsureRubricDraft: (question: Question) => void;
  onSaveQuestionRubric: (question: Question) => void;
  onSubmitQuestionAttempt: (question: Question) => void;
  onMarkMistakeReviewed: (mistake: Mistake) => void;
  onCompleteReview: (reminder: ReviewReminder, score: number, mode: ReviewMode) => void;
  getReminderGoalTitle: (reminder: ReviewReminder) => string | undefined;
}

export function ReviewsPage({
  state,
  due,
  upcoming,
  questionTypes,
  questionDraft,
  setQuestionDraft,
  selectedQuestion,
  selectedQuestionId,
  setSelectedQuestionId,
  setSelectedNoteId,
  answerDrafts,
  setAnswerDrafts,
  rubricDrafts,
  setRubricDrafts,
  onGenerateQuestionsForSelectedNote,
  onAddManualQuestion,
  onDeleteQuestion,
  onEnsureRubricDraft,
  onSaveQuestionRubric,
  onSubmitQuestionAttempt,
  onMarkMistakeReviewed,
  onCompleteReview,
  getReminderGoalTitle,
}: ReviewsPageProps) {
  const currentQuestion = selectedQuestion ?? state.questions[0];
  const currentAnswerDraft =
    currentQuestion && answerDrafts[currentQuestion.id]
      ? answerDrafts[currentQuestion.id]
      : { answerText: "", score: 80 };
  const currentRubric = currentQuestion
    ? state.rubrics.find((rubric) => rubric.questionId === currentQuestion.id) ??
      buildDefaultRubric(currentQuestion)
    : null;
  const currentRubricDraft =
    currentQuestion && rubricDrafts[currentQuestion.id]
      ? rubricDrafts[currentQuestion.id]
      : {
          criteriaText: currentRubric?.criteria.join("\n") || "",
          totalScore: currentRubric?.totalScore || 100,
        };
  const latestGrading =
    currentQuestion &&
    state.aiGradingResults
      .filter((result) => result.questionId === currentQuestion.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="stack">
      <section className="dashboard-grid">
        <MetricCard label="题库" value={state.questions.length} hint="自测与训练题" tone="info" />
        <MetricCard label="答题记录" value={state.answerAttempts.length} hint="输出证据" tone="success" />
        <MetricCard
          label="待复盘错题"
          value={state.mistakes.filter((mistake) => mistake.status === "待复习").length}
          hint="影响掌握分"
          tone="warning"
        />
        <MetricCard label="到期复习" value={due.length} hint="间隔重复" tone="warning" />
      </section>

      <section className="two-column training-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">复习</p>
              <h2>今日到期</h2>
            </div>
          </div>
          <div className="card-list">
            {due.map((reminder) => (
              <ReviewCard
                key={reminder.id}
                reminder={reminder}
                note={state.notes.find((note) => note.id === reminder.noteId)}
                goalTitle={getReminderGoalTitle(reminder)}
                onComplete={onCompleteReview}
              />
            ))}
            {due.length === 0 && <EmptyState text="没有到期项。" />}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">生成题目</p>
              <h2>从笔记进入自测</h2>
            </div>
            <button className="primary-button" onClick={onGenerateQuestionsForSelectedNote}>
              生成 5 题
            </button>
          </div>
          <div className="form-grid compact-form">
            <label>
              关联笔记
              <select
                value={questionDraft.noteId}
                onChange={(event) => {
                  const note = state.notes.find((item) => item.id === event.target.value);
                  setQuestionDraft({
                    ...questionDraft,
                    noteId: event.target.value,
                    goalId: note?.associatedGoalIds[0] ?? questionDraft.goalId,
                  });
                  setSelectedNoteId(event.target.value);
                }}
              >
                {state.notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              类型
              <select
                value={questionDraft.type}
                onChange={(event) =>
                  setQuestionDraft({ ...questionDraft, type: event.target.value as Question["type"] })
                }
              >
                {questionTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="wide-field">
              手动题干
              <textarea
                value={questionDraft.question}
                onChange={(event) =>
                  setQuestionDraft({ ...questionDraft, question: event.target.value })
                }
              />
            </label>
            <label className="wide-field">
              参考答案
              <textarea
                value={questionDraft.answer}
                onChange={(event) =>
                  setQuestionDraft({ ...questionDraft, answer: event.target.value })
                }
              />
            </label>
          </div>
          <button className="ghost-button" onClick={onAddManualQuestion}>
            <Plus size={16} />
            添加手动题
          </button>
        </div>
      </section>

      <section className="two-column training-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">自测中心</p>
              <h2>题目训练</h2>
            </div>
          </div>
          <div className="question-list">
            {state.questions.map((question) => {
              const goal = state.goals.find((item) => item.id === question.goalId);
              const note = state.notes.find((item) => item.id === question.noteId);
              const attempts = state.answerAttempts.filter(
                (attempt) => attempt.questionId === question.id,
              );
              return (
                <button
                  className={`question-item ${currentQuestion?.id === question.id ? "active" : ""}`}
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                >
                  <strong>{question.question}</strong>
                  <span>
                    {question.type} · 难度 {question.difficulty} ·{" "}
                    {goal?.title || note?.title || "未关联"}
                  </span>
                  <small>
                    {attempts.length > 0
                      ? `最近得分 ${attempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].score}`
                      : "尚未作答"}
                  </small>
                </button>
              );
            })}
            {state.questions.length === 0 && <EmptyState text="还没有题目，可先从笔记生成 5 道自测题。" />}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">答题</p>
              <h2>{currentQuestion ? "提交一次自测" : "暂无题目"}</h2>
            </div>
            {currentQuestion && (
              <button className="ghost-button danger" onClick={() => onDeleteQuestion(currentQuestion.id)}>
                <Trash2 size={15} />
                删除题目
              </button>
            )}
          </div>
          {currentQuestion ? (
            <div className="answer-panel">
              <div className="question-stem">
                <Badge tone="info">{currentQuestion.type}</Badge>
                <strong>{currentQuestion.question}</strong>
                <span>
                  难度 {currentQuestion.difficulty} · 来源 {currentQuestion.source}
                </span>
              </div>
              <label>
                我的答案
                <textarea
                  className="tall"
                  value={currentAnswerDraft.answerText}
                  onChange={(event) =>
                    setAnswerDrafts((current) => ({
                      ...current,
                      [currentQuestion.id]: {
                        ...currentAnswerDraft,
                        answerText: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <details className="answer-reference">
                <summary>查看参考答案</summary>
                <p>{currentQuestion.answer || "暂无参考答案。"}</p>
              </details>
              <details className="answer-reference rubric-editor" open>
                <summary>评分规则</summary>
                <div className="rubric-tools">
                  <label>
                    总分
                    <input
                      type="number"
                      min={1}
                      value={currentRubricDraft.totalScore}
                      onChange={(event) =>
                        setRubricDrafts((current) => ({
                          ...current,
                          [currentQuestion.id]: {
                            ...currentRubricDraft,
                            totalScore: Number(event.target.value) || 100,
                          },
                        }))
                      }
                    />
                  </label>
                  <div className="button-row">
                    <button className="ghost-button" onClick={() => onEnsureRubricDraft(currentQuestion)}>
                      生成默认规则
                    </button>
                    <button className="primary-button" onClick={() => onSaveQuestionRubric(currentQuestion)}>
                      保存规则
                    </button>
                  </div>
                </div>
                <textarea
                  value={currentRubricDraft.criteriaText}
                  onChange={(event) =>
                    setRubricDrafts((current) => ({
                      ...current,
                      [currentQuestion.id]: {
                        ...currentRubricDraft,
                        criteriaText: event.target.value,
                      },
                    }))
                  }
                />
              </details>
              <button className="primary-button" onClick={() => onSubmitQuestionAttempt(currentQuestion)}>
                <CheckCircle2 size={18} />
                自动批改并更新掌握度
              </button>
              {latestGrading && (
                <div className="grading-result-card">
                  <div className="card-title-row">
                    <div>
                      <strong>最近批改结果</strong>
                      <span>{latestGrading.createdAt}</span>
                    </div>
                    <Badge tone={latestGrading.score < 60 ? "danger" : latestGrading.score >= 85 ? "success" : "info"}>
                      {latestGrading.score} 分
                    </Badge>
                  </div>
                  <dl>
                    <dt>优点</dt>
                    <dd>{latestGrading.strengths.join("；") || "暂无明显得分点"}</dd>
                    <dt>扣分原因</dt>
                    <dd>{latestGrading.deductions.join("；") || latestGrading.misconception}</dd>
                    <dt>遗漏知识点</dt>
                    <dd>{latestGrading.missingPoints.join("；") || "无明显遗漏"}</dd>
                    <dt>改进版答案</dt>
                    <dd>{latestGrading.improvedAnswer || "暂无"}</dd>
                    <dt>改进建议</dt>
                    <dd>{latestGrading.nextAction}</dd>
                  </dl>
                </div>
              )}
              <div className="timeline">
                {state.answerAttempts
                  .filter((attempt) => attempt.questionId === currentQuestion.id)
                  .slice(0, 3)
                  .map((attempt) => (
                    <div className="timeline-item" key={attempt.id}>
                      <span>{attempt.createdAt}</span>
                      <strong>{attempt.score} 分</strong>
                      <small>{attempt.feedback}</small>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <EmptyState text="请选择一道题。" />
          )}
        </div>
      </section>

      <section className="two-column training-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">错题本</p>
              <h2>低分题进入复盘</h2>
            </div>
          </div>
          <div className="card-list">
            {state.mistakes.map((mistake) => {
              const question = state.questions.find((item) => item.id === mistake.questionId);
              const goal = state.goals.find((item) => item.id === mistake.goalId);
              return (
                <div className="task-card mistake-card" key={mistake.id}>
                  <div className="card-title-row">
                    <Badge tone={mistake.status === "待复习" ? "danger" : "success"}>
                      {mistake.status}
                    </Badge>
                    <span>重复 {mistake.repeatedCount} 次</span>
                  </div>
                  <strong>{mistake.title}</strong>
                  <span>{goal?.title || "未关联目标"}</span>
                  <small>{mistake.reason || question?.answer || "需要补充错误原因。"}</small>
                  <div className="card-actions">
                    <button className="ghost-button" onClick={() => onMarkMistakeReviewed(mistake)}>
                      标记已复盘
                    </button>
                  </div>
                </div>
              );
            })}
            {state.mistakes.length === 0 && <EmptyState text="没有错题。低分自测会自动进入这里。" />}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">间隔重复</p>
              <h2>未来提醒</h2>
            </div>
          </div>
          <div className="timeline">
            {upcoming.slice(0, 12).map((reminder) => {
              const note = state.notes.find((item) => item.id === reminder.noteId);
              return (
                <div className="timeline-item" key={reminder.id}>
                  <span>{reminder.dueAt}</span>
                  <strong>{note?.title ?? "已删除笔记"}</strong>
                  <small>
                    第 {reminder.intervalDays} 天 · {reminder.conceptName || "整篇笔记"} ·{" "}
                    {getReminderGoalTitle(reminder) || "未关联目标"}
                  </small>
                </div>
              );
            })}
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

function ReviewCard({
  reminder,
  note,
  goalTitle,
  onComplete,
}: {
  reminder: ReviewReminder;
  note?: Note;
  goalTitle?: string;
  onComplete: (reminder: ReviewReminder, score: number, mode: ReviewMode) => void;
}) {
  return (
    <div className="review-card">
      <div>
        <strong>{note?.title ?? "已删除笔记"}</strong>
        <span>{reminder.conceptName || "整篇笔记"} · 第 {reminder.intervalDays} 天</span>
        <span>{goalTitle || "未关联目标"}</span>
        <small>到期 {reminder.dueAt}</small>
      </div>
      <div className="review-actions">
        <button onClick={() => onComplete(reminder, 5, "费曼讲解")}>能讲清</button>
        <button onClick={() => onComplete(reminder, 3, "自测")}>基本会</button>
        <button onClick={() => onComplete(reminder, 2, "复习")}>需重学</button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
