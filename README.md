# 个人目标驱动学习管理系统 v4

这是一个以“用户自定义目标”为中心的个人学习管理系统。v4 的主题是“资料导入、全文检索与规则召回、自适应学习路径”：系统不只记录笔记和计划，还会把外部学习资料转成笔记、知识点、自测题和复习计划，并从笔记、资料、题目、错题、目标和复盘中检索答案，生成带理由的学习路径。当前版本还没有接入 embedding、向量存储和相似度检索，因此页面与文档统一使用“全文检索与规则召回”表述。

当前版本已经从纯前端 `localStorage` 升级为“前端 + Node 后端 + SQLite”的最小全流程版本，后续可以继续扩展为 MySQL/PostgreSQL。

## 已实现

- 登录注册：注册、登录、退出、当前用户、受保护页面。
- 首次目标初始化：新用户注册后不会默认拥有考研/前端目标，第一次进入必须选择模板或创建至少一个自定义目标。
- 后端 API：Node 原生 HTTP 服务，不依赖 Express，兼容 Node 18。
- SQLite 数据库：通过 Python 标准库 `sqlite3` 访问 SQLite，不需要安装 native npm 数据库驱动。
- 数据表：`users`、`sessions`、`migrations`、`notes`、`resources`、`resourceChunks`、`searchDocuments`、`learningPaths`、`learningPathSteps`、`knowledgePoints`、`milestones`、`plans`、`reviewReminders`、`reflections`、`goals`、`projects`、`questions`、`answerAttempts`、`mistakes`、`recommendations`、`studyEvents`、`rubrics`、`aiGradingResults`、`knowledgeRelations`、`reviewPolicies`、`importJobs`。
- 数据持久化：后端写入 `server/data/learning.sqlite`，每个用户的数据按 `userId` 隔离。
- 笔记库：结构化笔记，保存后生成知识点和复习计划。
- 里程碑系统：目标可以拆成阶段验收，计划可以关联目标和里程碑，目标页同时显示手动进度和系统估算进度。
- 训练中心：整合复习、自测、题库、答题记录和错题本；可以从笔记生成自测题，也可以手动创建题目。
- 错题系统：低分自测会自动进入错题本，错题会关联目标、笔记和知识点，并影响知识点掌握分。
- 掌握度计算：保留手动掌握度，同时新增 `masteryScore`、证据数、最近自测分、最近复习时间和系统建议掌握度。
- 透明推荐：系统根据到期复习、低掌握知识点、错题、延期里程碑和目标进度差异生成推荐，每条推荐都带理由。
- 学习数据分析：复盘分析页展示计划完成率、延期率、复习完成率、里程碑完成率、平均自测分、重复错题率、停滞目标和本周学习证据数。
- 学习计划：新增、编辑、删除、状态更新。
- 复习系统：到期复习、自测分数、下一轮提醒、低分重学计划。
- 周总结：自动生成目标视角的总结草稿，并填写反思字段。
- 我的目标：目标模板/自定义目标、目标方向、1-5 重要程度、截止时间、每周投入、当前基础、状态和进度维护。
- 目标优先级：根据重要程度、截止紧急度、低掌握笔记/知识点、到期复习、错题、延期计划、延期里程碑和停滞时间计算优先级分数。
- 目标关联：笔记、知识点、里程碑、学习计划、复习提醒、自测、错题和周总结都可以关联目标。
- 项目作品集：新增、编辑、删除、技术栈/难点/收获/下一步行动，并展示关联目标和知识点。
- AI 助手：优先请求后端 `/api/ai` 的真实 AI；未配置或请求失败时，前端自动 fallback 到本地目标驱动规则建议。
- 知识库：新增资料导入、资料分段、导入任务记录、全文检索、规则召回问答和来源展示。
- 检索能力边界：当前为关键词全文检索 + 规则召回排序；如果后续升级为真正语义检索，需要增加 embedding 生成、向量存储、相似度检索，以及关键词与向量的混合排序。
- 资料到学习对象链路：导入 Markdown/TXT/网页摘录正文后，自动生成笔记草稿、知识点、自测题和 1/3/7/14/30 天复习提醒；DOCX 会提取 `word/document.xml` 正文，文本型 PDF 会尝试提取文本对象和压缩文本流，扫描版 PDF 后续再接 OCR。
- 搜索中心：搜索范围覆盖笔记、资料、资料分段、知识点、自测题、错题、目标、里程碑和复盘，支持按目标筛选。
- 学习路径：根据目标截止时间、每周投入、导入资料、到期复习、低掌握知识点、错题、延期里程碑和未完成计划生成自适应路径，并可一键转成学习计划。
- 统一时间线：集中展示计划、复习提醒、里程碑、错题复盘、资料导入和学习路径步骤。

## 运行方式

安装依赖：

```bash
npm install
```

构建前端：

```bash
npm run build
```

启动后端 + 前端页面：

```bash
npm run api -- 5175
```

访问：

```text
http://127.0.0.1:5175
```

运行接口测试：

```bash
npm run test:api
```

开发前端时也可以运行：

```bash
npm run dev
```

此时 Vite 在 `5173`，前端会默认请求 `http://127.0.0.1:5175` 的后端 API。

## API 概览

- `POST /api/auth/register`：注册并创建用户学习数据。
- `POST /api/auth/login`：登录并返回 token、当前用户和用户数据。
- `GET /api/auth/me`：读取当前用户和数据。
- `POST /api/auth/logout`：退出登录。
- `GET /api/state`：读取当前用户完整学习数据。
- `PUT /api/state`：保存当前用户完整学习数据。
- `POST /api/ai`：预留真实 AI 接口，未配置时前端使用本地 fallback。
- `GET /api/health`：健康检查。

## AI 配置

后端 `/api/ai` 支持 OpenAI-compatible Chat Completions 接口。没有配置 key 时会返回 503，前端会自动使用本地 AI fallback。

可配置环境变量：

```bash
AI_API_KEY=你的模型服务密钥
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1/chat/completions
```

也兼容：

```bash
OPENAI_API_KEY=你的 OpenAI Key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
```

## 数据库说明

数据库文件：

```text
server/data/learning.sqlite
```

如果旧的 `server/data/learning-db.json` 存在，服务首次创建 SQLite 时会自动迁移到 `learning.sqlite`。

SQLite 表：

- `users` -> 用户表
- `sessions` -> 会话表
- `migrations` -> 迁移记录表
- `notes` -> 笔记表，复合主键 `(id, user_id)`
- `resources` -> 导入资料表，复合主键 `(id, user_id)`
- `resource_chunks` -> 资料分段表，复合主键 `(id, user_id)`
- `search_documents` -> 检索文档表，复合主键 `(id, user_id)`
- `learning_paths` -> 学习路径表，复合主键 `(id, user_id)`
- `learning_path_steps` -> 学习路径步骤表，复合主键 `(id, user_id)`
- `knowledge_points` -> 知识点表，复合主键 `(id, user_id)`
- `milestones` -> 里程碑表，复合主键 `(id, user_id)`
- `plans` -> 计划表，复合主键 `(id, user_id)`
- `review_reminders` -> 复习提醒表，复合主键 `(id, user_id)`
- `reflections` -> 周总结表，复合主键 `(id, user_id)`
- `goals` -> 目标表，复合主键 `(id, user_id)`
- `projects` -> 项目作品表，复合主键 `(id, user_id)`
- `questions` -> 自测题表，复合主键 `(id, user_id)`
- `answer_attempts` -> 答题记录表，复合主键 `(id, user_id)`
- `mistakes` -> 错题表，复合主键 `(id, user_id)`
- `recommendations` -> 学习推荐表，复合主键 `(id, user_id)`
- `study_events` -> 学习事件表，复合主键 `(id, user_id)`
- `rubrics` -> 评分规则表，复合主键 `(id, user_id)`
- `ai_grading_results` -> AI 批改结果表，复合主键 `(id, user_id)`
- `knowledge_relations` -> 知识点关系表，复合主键 `(id, user_id)`
- `review_policies` -> 复习策略表，复合主键 `(id, user_id)`
- `import_jobs` -> 导入任务表，复合主键 `(id, user_id)`

## AI fallback 设计

当前前端调用顺序是：

```text
请求后端 /api/ai
  -> 成功：使用后端 AI 结果
  -> 失败：使用 src/lib/ai.ts 的本地规则版建议
```

因此后续接真实 AI 时，不需要删除本地 AI，只需要在后端 `/api/ai` 中接入模型即可。
