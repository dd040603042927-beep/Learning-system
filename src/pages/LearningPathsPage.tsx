import { Route } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { AppState, LearningPath, LearningPathStep } from "../types";
import type { LearningTimelineItem } from "../lib/learning";

interface LearningPathsPageProps {
  state: AppState;
  pathGoalId: string;
  setPathGoalId: Dispatch<SetStateAction<string>>;
  pathHorizonDays: number;
  setPathHorizonDays: Dispatch<SetStateAction<number>>;
  selectedLearningPath?: LearningPath;
  selectedLearningPathSteps: LearningPathStep[];
  learningTimeline: LearningTimelineItem[];
  onGeneratePath: () => void;
  onMaterializePath: () => void;
  onUpdateStepStatus: (
    stepId: string,
    status: "未开始" | "进行中" | "完成" | "跳过",
  ) => void;
}

export function LearningPathsPage({
  state,
  pathGoalId,
  setPathGoalId,
  pathHorizonDays,
  setPathHorizonDays,
  selectedLearningPath,
  selectedLearningPathSteps,
  learningTimeline,
  onGeneratePath,
  onMaterializePath,
  onUpdateStepStatus,
}: LearningPathsPageProps) {
  const pathGoal = state.goals.find((goal) => goal.id === pathGoalId);
  const timelineByDate = learningTimeline.reduce<Record<string, LearningTimelineItem[]>>(
    (groups, item) => {
      groups[item.date] = groups[item.date] ? [...groups[item.date], item] : [item];
      return groups;
    },
    {},
  );

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">自适应学习路径</p>
            <h2>按目标、资料、掌握分和错题自动排顺序</h2>
          </div>
        </div>
        <div className="inline-form path-form">
          <select value={pathGoalId} onChange={(event) => setPathGoalId(event.target.value)}>
            {state.goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={7}
            max={30}
            value={pathHorizonDays}
            onChange={(event) => setPathHorizonDays(Number(event.target.value) || 14)}
          />
          <button className="primary-button" onClick={onGeneratePath}>
            <Route size={18} />
            生成路径
          </button>
          <button className="ghost-button" onClick={onMaterializePath}>
            转成计划
          </button>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">当前路径</p>
              <h2>{selectedLearningPath?.title || pathGoal?.title || "暂无路径"}</h2>
            </div>
            {selectedLearningPath && <Badge tone="info">{selectedLearningPath.status}</Badge>}
          </div>
          <div className="card-list">
            {selectedLearningPathSteps.map((step) => (
              <div className="path-step-card" key={step.id}>
                <div className="card-title-row">
                  <div>
                    <strong>{step.title}</strong>
                    <span>
                      {step.dueDate} · {step.actionType} · {step.estimatedMinutes} 分钟
                    </span>
                  </div>
                  <select
                    value={step.status}
                    onChange={(event) =>
                      onUpdateStepStatus(
                        step.id,
                        event.target.value as "未开始" | "进行中" | "完成" | "跳过",
                      )
                    }
                  >
                    {["未开始", "进行中", "完成", "跳过"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <ul>
                  {step.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
            {selectedLearningPathSteps.length === 0 && <EmptyState text="还没有学习路径，选择目标后生成。" />}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">统一时间线</p>
              <h2>计划、复习、错题、资料和路径步骤</h2>
            </div>
          </div>
          <div className="timeline">
            {Object.entries(timelineByDate)
              .slice(0, 14)
              .map(([date, items]) => (
                <div className="timeline-day" key={date}>
                  <strong>{date}</strong>
                  {items.map((item) => (
                    <div className="timeline-item" key={item.id}>
                      <Badge tone={item.type === "复习" || item.type === "错题" ? "warning" : "neutral"}>
                        {item.type}
                      </Badge>
                      <div>
                        <span>{item.title}</span>
                        <small>
                          {item.status || "待处理"}
                          {item.detail ? ` · ${item.detail}` : ""}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            {learningTimeline.length === 0 && <EmptyState text="暂无时间线事件。" />}
          </div>
        </div>
      </section>
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
