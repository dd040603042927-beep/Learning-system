# 个人学习系统 v1

这是一个面向“考研 + 就业”双路线的个人学习闭环系统。当前版本已经从纯前端 `localStorage` 升级为“前端 + Node 后端 + SQLite”的最小全流程版本，先把产品闭环跑通，后续可以继续扩展为 MySQL/PostgreSQL。

## 已实现

- 登录注册：注册、登录、退出、当前用户、受保护页面。
- 后端 API：Node 原生 HTTP 服务，不依赖 Express，兼容 Node 18。
- SQLite 数据库：通过 Python 标准库 `sqlite3` 访问 SQLite，不需要安装 native npm 数据库驱动。
- 数据表：`users`、`sessions`、`notes`、`knowledgePoints`、`plans`、`reviewReminders`、`reflections`、`goals`、`projects`。
- 数据持久化：后端写入 `server/data/learning.sqlite`，每个用户的数据按 `userId` 隔离。
- 笔记库：结构化笔记，保存后生成知识点和复习计划。
- 学习计划：新增、编辑、删除、状态更新。
- 复习系统：到期复习、自测分数、下一轮提醒、低分重学计划。
- 周总结：自动生成总结草稿，并填写反思字段。
- 目标管理：新增、编辑、删除、进度维护。
- 项目作品集：新增、编辑、删除、技术栈/难点/收获/下一步行动。
- AI 助手：优先请求后端 `/api/ai` 的真实 AI；未配置或请求失败时，前端自动 fallback 到本地 `runLocalAi`。

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
- `notes` -> 笔记表，复合主键 `(id, user_id)`
- `knowledge_points` -> 知识点表，复合主键 `(id, user_id)`
- `plans` -> 计划表，复合主键 `(id, user_id)`
- `review_reminders` -> 复习提醒表，复合主键 `(id, user_id)`
- `reflections` -> 周总结表，复合主键 `(id, user_id)`
- `goals` -> 目标表，复合主键 `(id, user_id)`
- `projects` -> 项目作品表，复合主键 `(id, user_id)`

## AI fallback 设计

当前前端调用顺序是：

```text
请求后端 /api/ai
  -> 成功：使用后端 AI 结果
  -> 失败：使用 src/lib/ai.ts 的本地规则版建议
```

因此后续接真实 AI 时，不需要删除本地 AI，只需要在后端 `/api/ai` 中接入模型即可。
