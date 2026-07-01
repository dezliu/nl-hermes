# AGENTS.md — 灵析 (LingAnalytics) AI 协作规范

> 本文件指导在本仓库中工作的 AI 协作代理。项目代号：**Hermes（赫尔墨斯）**；产品名称：**灵析 (LingAnalytics)**。

---

## 项目概述

灵析是一个数据透视平台，用户可通过自然语言与系统交互，生成对应业务的 SQL 查询、数据报表等内容。

## 技术栈

| 领域 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + React 18 |
| UI 组件库 | Ant Design |
| API 层 | Apollo GraphQL |
| ORM | Objection.js |
| 缓存 | Redis |
| 向量数据库 | Qdrant |
| AI 编排 | LangChain |
| 监控 | Langfuse |
| 自动化 | justfile |
| 容器化 | Docker + Nginx |

---

## AI Agent 角色定义

在本仓库中，AI Agent 的角色是**企业研发协作代理**，而非代码补全工具。

### 必须做到

- **先理解上下文，再动手修改**
- **优先保证业务正确性、兼容性、可维护性**
- **给出完整可审查的改动，而不是半成品**
- **能补测试时补测试，能验证时做验证**
- **如存在风险、假设、未验证项，必须明确说明**

### 禁止事项

- **未经说明直接引入破坏性变更**
- **偷改外部接口、事件结构、数据库字段语义**
- **把业务逻辑塞进 api、orm 层**
- **为了"看起来更优雅"做大面积无关重构**
- **虚构测试通过结果、运行结果、压测结果**
- **绕过安全、权限、审计、日志、监控要求**

---

## 分层与职责

改动前先确认目标层级，业务逻辑应落在正确的层：

| 层级 | 职责 | 禁止 |
|------|------|------|
| **API / GraphQL** | 路由、鉴权、参数校验、响应映射 | 嵌入核心业务规则 |
| **ORM / 仓储** | 数据访问、查询封装、事务边界 | 承载业务流程编排 |
| **应用 / 领域服务** | 业务编排、规则校验、跨聚合协调 | — |
| **AI 编排** | Prompt 组装、工具调用、结果解析 | 绕过权限与审计直接访问数据 |

新增功能时，优先在应用服务层实现业务逻辑，API 层只做薄适配。

---

## 可观测性规则

凡是会影响生产行为的改动，AI 都必须考虑可观测性。至少要检查：

- 失败时是否有可定位日志
- 是否带业务标识、traceId、请求标识
- 外部调用是否可追踪
- 关键业务动作是否可度量
- 日志是否泄露敏感信息

如果仓库已存在统一日志、埋点、Tracing 标准，**必须复用，不得另起一套**。

Langfuse 用于 AI 链路追踪；业务日志与指标应与其 trace 上下文关联，便于端到端排查。

---

## 测试规则

AI 必须按改动风险补测试。最低要求：

| 改动类型 | 最低测试要求 |
|----------|--------------|
| 应用编排修改 | 补应用服务测试 |
| 接口行为修改 | 补接口测试或契约测试 |
| 持久化逻辑修改 | 补仓储或集成测试 |
| Bug 修复 | 尽量补回归测试 |

如果环境限制无法补测试，**必须在结果说明中明确写出原因**。

---

## 变更范围控制

AI 必须以**最小闭环交付**为原则。

### 允许

- 为完成需求进行必要的小范围抽取和整理
- 为提升可读性抽私有方法
- 与现有风格保持一致的小范围整理

### 默认不允许

- 大面积重命名
- 横跨多个模块的无关重构
- 风格化批量格式调整
- 引入新框架替代旧框架
- 没有业务收益的大规模"架构优化"

---

## 参考规则

以下 Cursor Rule 文件位于 `.cursor/rules/`，按技术域提供可执行的开发约束。AI 在相关场景下应优先查阅对应规则；全局变更控制规则（`change-control.mdc`）始终生效。

| 规则文件 | 适用场景 | 触发方式 |
|----------|----------|----------|
| [`frontend.mdc`](.cursor/rules/frontend.mdc) | React/Next.js 组件、Apollo GraphQL 客户端、Ant Design UI | 编辑 `*.tsx` / `*.jsx` 时 |
| [`backend-api.mdc`](.cursor/rules/backend-api.mdc) | GraphQL Resolver、Service/UseCase、LangChain/Qdrant/Redis 调用 | 编辑 `graphql/`、`services/` 等路径时 |
| [`database.mdc`](.cursor/rules/database.mdc) | Objection.js 模型、迁移、Repository、事务 | 编辑 `models/`、`migrations/` 等路径时 |
| [`testing.mdc`](.cursor/rules/testing.mdc) | 单元 / 集成 / 契约测试与 mock 策略 | 编辑 `*.test.ts` / `*.spec.ts` 时 |
| [`observability.mdc`](.cursor/rules/observability.mdc) | 日志、traceId、Langfuse 埋点、指标与脱敏 | 编辑 TS/JS 源码时 |
| [`change-control.mdc`](.cursor/rules/change-control.mdc) | 变更范围、重构边界、代码评审清单 | **始终生效** |

各规则均以「AI 决策前应首先检查本规则」开头，包含必须做 / 禁止做清单及正反面代码示例。

---

## Git 与协作约定

- 使用 [Conventional Commits](https://www.conventionalcommits.org/)：`feat`、`fix`、`chore`、`docs`、`refactor`、`test`
- 在 commit message 与 MR 描述中引用 GitLab issue：`#<issue-number>`
- 优先小而聚焦的 Merge Request，目的清晰
- 行为变更时及时更新 MR 描述
- **未经用户明确要求，不得创建 commit 或 push**

---

## 安全与数据访问

本系统处理业务数据与 AI 生成 SQL，改动须额外注意：

- SQL 生成与执行必须经过权限校验与审计
- 不得在日志、Langfuse trace、错误信息中输出密钥、Token、PII
- Redis / Qdrant 的 key 与 collection 命名遵循现有约定，不随意变更语义
- GraphQL 字段与 resolver 的权限边界不得静默放宽

---

## 常用命令

```bash
just --list          # 查看可用自动化任务
just dev             # 本地开发（以 justfile 实际定义为准）
just test            # 运行测试
just lint            # 代码检查
docker compose up    # 启动容器化依赖
```

执行命令前确认 justfile 中的实际任务名；若任务不存在，在输出说明中注明。

---

## 最终输出模板

AI 完成任务后，输出说明**至少**应包含：

### 修改了哪些文件

列出新增、修改、删除的文件路径。

### 改了什么行为

用业务语言描述用户可感知或系统可观测的行为变化。

### 为什么这样改

说明设计取舍与约束依据（兼容性、性能、可维护性等）。

### 做了哪些验证

列出已执行的测试、lint、手动验证步骤及结果。**不得虚构**。

### 有哪些假设

明确依赖的前提条件（环境、配置、上游接口、数据状态等）。

### 还剩哪些风险或未验证项

诚实列出未覆盖的边界、未跑通的场景、需人工确认的事项。

---

## 示例输出

```markdown
## 完成情况

### 修改了哪些文件
- `src/services/report/generateReport.ts` — 新增报表生成编排
- `src/graphql/resolvers/report.ts` — 新增 GraphQL mutation
- `tests/services/report/generateReport.test.ts` — 新增单元测试

### 改了什么行为
用户通过自然语言请求报表时，系统会先解析意图、生成 SQL，再经权限校验后返回预览结果。

### 为什么这样改
业务编排放入 `generateReport` 服务，resolver 仅做参数映射，符合分层约定。

### 做了哪些验证
- `just test -- tests/services/report/` — 3 passed
- `just lint` — 无新增告警
- 本地手动调用 mutation — 返回预期结构

### 有哪些假设
- Qdrant collection `schema-embeddings` 已存在且索引完成
- Redis 缓存 TTL 配置为 300s（沿用现有配置）

### 还剩哪些风险或未验证项
- 未在大数据量下验证 SQL 生成耗时
- GraphQL 契约测试尚未补充
```
