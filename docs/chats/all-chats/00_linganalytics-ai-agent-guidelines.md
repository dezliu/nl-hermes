# LingAnalytics AI agent guidelines

- **ID**: `17a45c6d-4a5e-4177-be7a-d42970911324`
- **创建时间**: 2026-07-01 14:38
- **模式**: agent
- **Agentic**: True

---

## 用户

/create-skill 你是一位资深的技术文档工程师，正在为一个名为“灵析 (LingAnalytics)”的数据透视平台编写核心开发规范。请根据以下项目信息和规范要求，在项目根目录下创建一份专业的 `AGENTS.md` 文件，用于指导 AI 协作代理的行为。

项目概述：本项目旨在创建一个数据透视平台，用户可以通过自然语言与系统交互，生成对应业务的 SQL 查询、数据报表等内容。项目代号为：Hermes（赫尔墨斯），产品名称为：灵析 (LingAnalytics)。

技术栈：
- **前端框架**：Next.js 14 + React 18
- **UI 组件库**：Ant Design
- **API 层**：Apollo GraphQL
- **ORM**：Objection.js
- **缓存**：Redis
- **向量数据库**：Qdrant
- **AI 编排框架**：langchain
- **监控**：Langfuse
- **自动化**：justfile
- **容器化**：Docker + Nginx

## AI Agent 角色定义

在本仓库中，AI Agent 的角色是“企业研发协作代理”，而非“代码补全工具”。AI 必须做到以下几点：

- **先理解上下文，再动手修改**
- **优先保证业务正确性、兼容性、可维护性**
- **给出完整可审查的改动，而不是半成品**
- **能补测试时补测试，能验证时做验证**
- **如存在风险、假设、未验证项，必须明确说明**

AI 禁止做以下事情：

- **未经说明直接引入破坏性变更**
- **偷改外部接口、事件结构、数据库字段语义**
- **把业务逻辑塞进 api、orm 层**
- **为了“看起来更优雅”做大面积无关重构**
- **虚构测试通过结果、运行结果、压测结果**
- **绕过安全、权限、审计、日志、监控要求**

## 可观测性规则

凡是会影响生产行为的改动，AI 都必须考虑可观测性。至少要检查：

- 失败时是否有可定位日志
- 是否带业务标识、traceId、请求标识
- 外部调用是否可追踪
- 关键业务动作是否可度量
- 日志是否泄露敏感信息

如果仓库已存在统一日志、埋点、Tracing 标准，必须复用，不得另起一套。

## 测试规则

AI 必须按改动风险补测试。最低要求：

- **应用编排修改**：补应用服务测试
- **接口行为修改**：补接口测试或契约测试
- **持久化逻辑修改**：补仓储或集成测试
- **Bug 修复**：尽量补回归测试

如果环境限制无法补测试，必须在结果说明中明确写出原因。

## 变更范围控制

AI 必须以“最小闭环交付”为原则。

**允许：**
- 为完成需求进行必要的小范围抽取和整理
- 为提升可读性抽私有方法
- 与现有风格保持一致的小范围整理

**默认不允许：**
- 大面积重命名
- 横跨多个模块的无关重构
- 风格化批量格式调整
- 引入新框架替代旧框架
- 没有业务收益的大规模“架构优化”

## 最终输出模板

AI 完成任务后，输出说明至少应包含：

- **修改了哪些文件**
- **改了什么行为**
- **为什么这样改**
- **做了哪些验证**
- **有哪些假设**
- **还剩哪些风险或未验证项**

## 助手

<details>
<summary>Thinking</summary>

正在为灵析 (LingAnalytics) 项目根目录创建 AGENTS.md 文件。
</details>

正在查看项目结构与现有规范，以便创建专业的 `AGENTS.md`。

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"AGENTS.md\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"AGENTS.md\"}",
  "result": "{\"directories\":[{}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"**/.cursor/**/*\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"**/.cursor/**/*\"}",
  "result": "{\"directories\":[{}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"**/README*\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"**/README*\"}",
  "result": "{\"directories\":[{}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"ls -la /Users/dezliu/Documents/mine/repo/nl-hermes\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"ls\",\"args\":[{\"type\":\"word\",\"value\":\"-la\"},{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}],\"fullText\":\"ls -la /Users/dezliu/Documents/mine/repo/nl-hermes\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"List project root directory contents\"}",
  "result": "{\"output\":\"drwxr-xr-x dezliu staff 128 B Wed Jul  1 14:38:44 2026 .\\ndrwxr-xr-x dezliu staff 512 B Wed Jul  1 14:06:48 2026 ..\\ndrwxr-xr-x dezliu staff  64 B Wed Jul  1 14:38:44 2026 .cursor\\ndrwxr-xr-x dezliu staff 288 B Wed Jul  1 14:09:01 2026 .git\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"**/*\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"**/*\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"files\":[{\"relPath\":\".git/HEAD\"},{\"relPath\":\".git/config\"},{\"relPath\":\".git/hooks/push-to-checkout.sample\"},{\"relPath\":\".git/hooks/update.sample\"},{\"relPath\":\".git/hooks/pre-push.sample\"},{\"relPath\":\".git/hooks/pre-applypatch.sample\"},{\"relPath\":\".git/hooks/pre-merge-commit.sample\"},{\"relPath\":\".git/hooks/post-update.sample\"},{\"relPath\":\".git/hooks/prepare-commit-msg.sample\"},{\"relPath\":\".git/hooks/pre-receive.sample\"},{\"relPath\":\".git/hooks/fsmonitor-watchman.sample\"},{\"relPath\":\".git/hooks/applypatch-msg.sample\"},{\"relPath\":\".git/hooks/pre-commit.sample\"},{\"relPath\":\".git/hooks/sendemail-validate.sample\"},{\"relPath\":\".git/hooks/pre-rebase.sample\"},{\"relPath\":\".git/hooks/commit-msg.sample\"},{\"relPath\":\".git/description\"},{\"relPath\":\".git/info/exclude\"}],\"totalFiles\":18}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/.cursor/skills-cursor/create-rule/SKILL.md\",\"limit\":80}",
  "params": "{\"targetFile\":\"/Users/dezliu/.cursor/skills-cursor/create-rule/SKILL.md\",\"limit\":80,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/.cursor/skills-cursor/create-rule/SKILL.md\"}",
  "result": "{\"contents\":\"---\\nname: create-rule\\ndescription: >-\\n  Create Cursor rules for persistent AI guidance. Use when you want to create a\\n  rule, add coding standards, set up project conventions, configure\\n  file-specific patterns, create RULE.md files, or asks about .cursor/rules/ or\\n  AGENTS.md.\\n---\\n# Creating Cursor Rules\\n\\nCreate project rules in `.cursor/rules/` to provide persistent context for the AI agent.\\n\\n## Gather Requirements\\n\\nBefore creating a rule, determine:\\n\\n1. **Purpose**: What should this rule enforce or teach?\\n2. **Scope**: Should it always apply, or only for specific files?\\n3. **File patterns**: If file-specific, which glob patterns?\\n\\n### Inferring from Context\\n\\nIf you have previous conversation context, infer rules from what was discussed. You can create multiple rules if the conversation covers distinct topics or patterns. Don't ask redundant questions if the context already provides the answers.\\n\\n### Required Questions\\n\\nIf the user hasn't specified scope, ask:\\n- \\\"Should this rule always apply, or only when working with specific files?\\\"\\n\\nIf they mentioned specific files and haven't provided concrete patterns, ask:\\n- \\\"Which file patterns should this rule apply to?\\\" (e.g., `**/*.ts`, `backend/**/*.py`)\\n\\nIt's very important that we get clarity on the file patterns.\\n\\nUse the AskQuestion tool when available to gather this efficiently.\\n\\n---\\n\\n## Rule File Format\\n\\nRules are `.mdc` files in `.cursor/rules/` with YAML frontmatter:\\n\\n```\\n.cursor/rules/\\n  typescript-standards.mdc\\n  react-patterns.mdc\\n  api-conventions.mdc\\n```\\n\\n### File Structure\\n\\n```markdown\\n---\\ndescription: Brief description of what this rule does\\nglobs: **/*.ts  # File pattern for file-specific rules\\nalwaysApply: false  # Set to true if rule should always apply\\n---\\n\\n# Rule Title\\n\\nYour rule content here...\\n```\\n\\n### Frontmatter Fields\\n\\n| Field | Type | Description |\\n|-------|------|-------------|\\n| `description` | string | What the rule does (shown in rule picker) |\\n| `globs` | string | File pattern - rule applies when matching files are open |\\n| `alwaysApply` | boolean | If true, applies to every session |\\n\\n---\\n\\n## Rule Configurations\\n\\n### Always Apply\\n\\nFor universal standards that should apply to every conversation:\\n\\n```yaml\",\"totalLinesInFile\":165}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/.cursor/skills-cursor/create-rule/SKILL.md\",\"offset\":80}",
  "params": "{\"targetFile\":\"/Users/dezliu/.cursor/skills-cursor/create-rule/SKILL.md\",\"offset\":80,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/.cursor/skills-cursor/create-rule/SKILL.md\"}",
  "result": "{\"contents\":\"```yaml\\n---\\ndescription: Core coding standards for the project\\nalwaysApply: true\\n---\\n```\\n\\n### Apply to Specific Files\\n\\nFor rules that apply when working with certain file types:\\n\\n```yaml\\n---\\ndescription: TypeScript conventions for this project\\nglobs: **/*.ts\\nalwaysApply: false\\n---\\n```\\n\\n---\\n\\n## Best Practices\\n\\n### Keep Rules Concise\\n\\n- **Under 50 lines**: Rules should be concise and to the point\\n- **One concern per rule**: Split large rules into focused pieces\\n- **Actionable**: Write like clear internal docs\\n- **Concrete examples**: Ideally provide concrete examples of how to fix issues\\n\\n---\\n\\n## Example Rules\\n\\n### TypeScript Standards\\n\\n```markdown\\n---\\ndescription: TypeScript coding standards\\nglobs: **/*.ts\\nalwaysApply: false\\n---\\n\\n# Error Handling\\n\\n\\\\`\\\\`\\\\`typescript\\n// ❌ BAD\\ntry {\\n  await fetchData();\\n} catch (e) {}\\n\\n// ✅ GOOD\\ntry {\\n  await fetchData();\\n} catch (e) {\\n  logger.error('Failed to fetch', { error: e });\\n  throw new DataFetchError('Unable to retrieve data', { cause: e });\\n}\\n\\\\`\\\\`\\\\`\\n```\\n\\n### React Patterns\\n\\n```markdown\\n---\\ndescription: React component patterns\\nglobs: **/*.tsx\\nalwaysApply: false\\n---\\n\\n# React Patterns\\n\\n- Use functional components\\n- Extract custom hooks for reusable logic\\n- Colocate styles with components\\n```\\n\\n---\\n\\n## Checklist\\n\\n- [ ] File is `.mdc` format in `.cursor/rules/`\\n- [ ] Frontmatter configured correctly\\n- [ ] Content under 500 lines\\n- [ ] Includes concrete examples\\n\",\"totalLinesInFile\":165}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

用户需要的是 AGENTS.md 文件，而非 skill。

我将直接在项目根目录创建 AGENTS.md。该文件会完整保留用户提供的所有规范内容，并结合项目技术栈补充架构指引。我会以专业文档工程师的视角进行结构化组织，确保格式严谨、条理清晰。

我将 AGENTS.md 拆分为七个核心章节：项目概述、技术栈、AI 角色定义、可观测性规则、测试规则、变更范围控制与最终输出模板。同时会补充数据透视平台特有的架构分层指引，避免业务逻辑侵入 API 或 ORM 层，并整合 GitLab 工作流规范。
</details>

项目为新仓库，正在根据您提供的规范创建 `AGENTS.md`。

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.b7f11633a283f49bab9e078f0f48323c38858d08094655a7a89947b2337e5c60\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

已按规范要求在项目根目录下创建了 AGENTS.md 文件。
</details>

已在项目根目录创建 [`AGENTS.md`](AGENTS.md)，用于指导 AI 协作代理在本仓库中的行为。

## 文件结构

| 章节 | 内容 |
|------|------|
| **项目概述 & 技术栈** | Hermes / 灵析定位，以及 Next.js、GraphQL、Objection.js、Qdrant、LangChain 等栈 |
| **AI Agent 角色定义** | 您提供的「必须做到 / 禁止事项」原文保留 |
| **分层与职责** | 基于「业务逻辑不进 api/orm 层」补充的架构约束 |
| **可观测性规则** | 日志、traceId、Langfuse 关联等要求 |
| **测试规则** | 按改动类型的最低测试矩阵 |
| **变更范围控制** | 最小闭环交付原则 |
| **Git 与协作约定** | Conventional Commits、GitLab issue 引用 |
| **安全与数据访问** | SQL 权限、PII、GraphQL 权限边界 |
| **常用命令** | just / Docker 入口 |
| **最终输出模板 + 示例** | 六段式交付说明与完整示例 |

## 设计说明

1. **保留原文**：角色定义、可观测性、测试、变更控制、输出模板等核心条款按您提供的表述写入。
2. **补充架构层**：增加 API / ORM / 应用服务 / AI 编排的分层表，便于代理判断改动应落在哪一层。
3. **贴合业务**：针对自然语言 → SQL → 报表场景，补充安全与数据访问约束。
4. **可执行示例**：末尾提供符合输出模板的完整示例，便于代理对齐交付格式。

如需调整（例如补充目录结构约定、GraphQL schema 规范、LangChain 工具链约定），告诉我即可继续完善。

## 用户

请根据项目根目录已有的 AGENTS.md 核心原则，为以下技术域分别生成独立的 Cursor Rule 文件（.cursor/rules/ 目录下），每个规则需遵循通用、可复用、不依赖具体业务字段的原则：

1. 前端开发规则（frontend.mdc）：涵盖 React/Next.js 组件编写、状态管理、UI 交互、API 调用（Apollo GraphQL）、性能优化、Ant Design 使用约束。
2. 后端 API 与编排规则（backend-api.mdc）：涵盖 GraphQL Resolver 设计、业务逻辑分层（Services/UseCases）、外部调用（langchain、Qdrant、Redis）、错误处理与日志。
3. 数据持久化规则（database.mdc）：涵盖 Objection.js 模型定义、迁移脚本、查询优化、事务管理、数据一致性。
4. 测试策略规则（testing.mdc）：涵盖单元测试、集成测试、契约测试的选型与编写规范，以及 mock 策略。
5. 可观测性规则（observability.mdc）：涵盖日志结构、traceId 传递、Langfuse 埋点、性能指标记录，以及敏感信息屏蔽。
6. 变更与重构规则（change-control.mdc）：作为 AGENTS.md 变更范围控制的补充，给出更具体的代码评审清单。

每个规则文件应：
- 首行注明适用场景（如 "用于前端 UI 组件开发"）。
- 包含明确的 "必须做" 与 "禁止做" 清单。
- 给出代码示例（正面 vs 反面）以增强约束力。
- 以 "AI 决策前应首先检查本规则" 作为开头。

完成后，请将规则文件列在项目 README 或 AGENTS.md 的 "参考规则" 章节中。

## 助手

<details>
<summary>Thinking</summary>

正在梳理 AGENTS.md 核心原则，准备为六个技术域分别生成独立的 .mdc 规则文件。每份文件将包含适用场景、必须做与禁止做的清单，以及正反面代码示例。
</details>

先读取 `AGENTS.md` 并检查 `.cursor/rules/` 目录结构，再按核心原则生成各技术域规则。

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\"}",
  "result": "{\"contents\":\"# AGENTS.md — 灵析 (LingAnalytics) AI 协作规范\\n\\n> 本文件指导在本仓库中工作的 AI 协作代理。项目代号：**Hermes（赫尔墨斯）**；产品名称：**灵析 (LingAnalytics)**。\\n\\n---\\n\\n## 项目概述\\n\\n灵析是一个数据透视平台，用户可通过自然语言与系统交互，生成对应业务的 SQL 查询、数据报表等内容。\\n\\n## 技术栈\\n\\n| 领域 | 技术 |\\n|------|------|\\n| 前端框架 | Next.js 14 + React 18 |\\n| UI 组件库 | Ant Design |\\n| API 层 | Apollo GraphQL |\\n| ORM | Objection.js |\\n| 缓存 | Redis |\\n| 向量数据库 | Qdrant |\\n| AI 编排 | LangChain |\\n| 监控 | Langfuse |\\n| 自动化 | justfile |\\n| 容器化 | Docker + Nginx |\\n\\n---\\n\\n## AI Agent 角色定义\\n\\n在本仓库中，AI Agent 的角色是**企业研发协作代理**，而非代码补全工具。\\n\\n### 必须做到\\n\\n- **先理解上下文，再动手修改**\\n- **优先保证业务正确性、兼容性、可维护性**\\n- **给出完整可审查的改动，而不是半成品**\\n- **能补测试时补测试，能验证时做验证**\\n- **如存在风险、假设、未验证项，必须明确说明**\\n\\n### 禁止事项\\n\\n- **未经说明直接引入破坏性变更**\\n- **偷改外部接口、事件结构、数据库字段语义**\\n- **把业务逻辑塞进 api、orm 层**\\n- **为了\\\"看起来更优雅\\\"做大面积无关重构**\\n- **虚构测试通过结果、运行结果、压测结果**\\n- **绕过安全、权限、审计、日志、监控要求**\\n\\n---\\n\\n## 分层与职责\\n\\n改动前先确认目标层级，业务逻辑应落在正确的层：\\n\\n| 层级 | 职责 | 禁止 |\\n|------|------|------|\\n| **API / GraphQL** | 路由、鉴权、参数校验、响应映射 | 嵌入核心业务规则 |\\n| **ORM / 仓储** | 数据访问、查询封装、事务边界 | 承载业务流程编排 |\\n| **应用 / 领域服务** | 业务编排、规则校验、跨聚合协调 | — |\\n| **AI 编排** | Prompt 组装、工具调用、结果解析 | 绕过权限与审计直接访问数据 |\\n\\n新增功能时，优先在应用服务层实现业务逻辑，API 层只做薄适配。\\n\\n---\\n\\n## 可观测性规则\\n\\n凡是会影响生产行为的改动，AI 都必须考虑可观测性。至少要检查：\\n\\n- 失败时是否有可定位日志\\n- 是否带业务标识、traceId、请求标识\\n- 外部调用是否可追踪\\n- 关键业务动作是否可度量\\n- 日志是否泄露敏感信息\\n\\n如果仓库已存在统一日志、埋点、Tracing 标准，**必须复用，不得另起一套**。\\n\\nLangfuse 用于 AI 链路追踪；业务日志与指标应与其 trace 上下文关联，便于端到端排查。\\n\\n---\\n\\n## 测试规则\\n\\nAI 必须按改动风险补测试。最低要求：\\n\\n| 改动类型 | 最低测试要求 |\\n|----------|--------------|\\n| 应用编排修改 | 补应用服务测试 |\\n| 接口行为修改 | 补接口测试或契约测试 |\\n| 持久化逻辑修改 | 补仓储或集成测试 |\\n| Bug 修复 | 尽量补回归测试 |\\n\\n如果环境限制无法补测试，**必须在结果说明中明确写出原因**。\\n\\n---\\n\\n## 变更范围控制\\n\\nAI 必须以**最小闭环交付**为原则。\\n\\n### 允许\\n\\n- 为完成需求进行必要的小范围抽取和整理\\n- 为提升可读性抽私有方法\\n- 与现有风格保持一致的小范围整理\\n\\n### 默认不允许\\n\\n- 大面积重命名\\n- 横跨多个模块的无关重构\\n- 风格化批量格式调整\\n- 引入新框架替代旧框架\\n- 没有业务收益的大规模\\\"架构优化\\\"\\n\\n---\\n\\n## Git 与协作约定\\n\\n- 使用 [Conventional Commits](https://www.conventionalcommits.org/)：`feat`、`fix`、`chore`、`docs`、`refactor`、`test`\\n- 在 commit message 与 MR 描述中引用 GitLab issue：`#<issue-number>`\\n- 优先小而聚焦的 Merge Request，目的清晰\\n- 行为变更时及时更新 MR 描述\\n- **未经用户明确要求，不得创建 commit 或 push**\\n\\n---\\n\\n## 安全与数据访问\\n\\n本系统处理业务数据与 AI 生成 SQL，改动须额外注意：\\n\\n- SQL 生成与执行必须经过权限校验与审计\\n- 不得在日志、Langfuse trace、错误信息中输出密钥、Token、PII\\n- Redis / Qdrant 的 key 与 collection 命名遵循现有约定，不随意变更语义\\n- GraphQL 字段与 resolver 的权限边界不得静默放宽\\n\\n---\\n\\n## 常用命令\\n\\n```bash\\njust --list          # 查看可用自动化任务\\njust dev             # 本地开发（以 justfile 实际定义为准）\\njust test            # 运行测试\\njust lint            # 代码检查\\ndocker compose up    # 启动容器化依赖\\n```\\n\\n执行命令前确认 justfile 中的实际任务名；若任务不存在，在输出说明中注明。\\n\\n---\\n\\n## 最终输出模板\\n\\nAI 完成任务后，输出说明**至少**应包含：\\n\\n### 修改了哪些文件\\n\\n列出新增、修改、删除的文件路径。\\n\\n### 改了什么行为\\n\\n用业务语言描述用户可感知或系统可观测的行为变化。\\n\\n### 为什么这样改\\n\\n说明设计取舍与约束依据（兼容性、性能、可维护性等）。\\n\\n### 做了哪些验证\\n\\n列出已执行的测试、lint、手动验证步骤及结果。**不得虚构**。\\n\\n### 有哪些假设\\n\\n明确依赖的前提条件（环境、配置、上游接口、数据状态等）。\\n\\n### 还剩哪些风险或未验证项\\n\\n诚实列出未覆盖的边界、未跑通的场景、需人工确认的事项。\\n\\n---\\n\\n## 示例输出\\n\\n```markdown\\n## 完成情况\\n\\n### 修改了哪些文件\\n- `src/services/report/generateReport.ts` — 新增报表生成编排\\n- `src/graphql/resolvers/report.ts` — 新增 GraphQL mutation\\n- `tests/services/report/generateReport.test.ts` — 新增单元测试\\n\\n### 改了什么行为\\n用户通过自然语言请求报表时，系统会先解析意图、生成 SQL，再经权限校验后返回预览结果。\\n\\n### 为什么这样改\\n业务编排放入 `generateReport` 服务，resolver 仅做参数映射，符合分层约定。\\n\\n### 做了哪些验证\\n- `just test -- tests/services/report/` — 3 passed\\n- `just lint` — 无新增告警\\n- 本地手动调用 mutation — 返回预期结构\\n\\n### 有哪些假设\\n- Qdrant collection `schema-embeddings` 已存在且索引完成\\n- Redis 缓存 TTL 配置为 300s（沿用现有配置）\\n\\n### 还剩哪些风险或未验证项\\n- 未在大数据量下验证 SQL 生成耗时\\n- GraphQL 契约测试尚未补充\\n```\\n\",\"totalLinesInFile\":211}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\".cursor/**/*\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\".cursor/**/*\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在规划创建 6 个独立的 `.mdc` 规则文件到 `.cursor/rules/` 目录，并同步更新 AGENTS.md 的参考规则章节。

确认仅更新 AGENTS.md，因项目无独立 README。各规则文件将遵循统一格式：首行 AI 检查提示、适用场景说明、必须/禁止清单、正反面代码示例，并采用 YAML frontmatter。正在为 frontend.mdc 设定匹配模式，覆盖 tsx/jsx 文件路径。
</details>

正在创建六个 Cursor Rule 文件，并更新 `AGENTS.md`。

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/rules/frontend.mdc\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.da21a286b704d3e66f5c9ea567c299d59a3a8fece1f2c7e3889341a2ea04f56a\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/rules/backend-api.mdc\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.2f96027269ca26e8db59b8e8c9cfbfa3e5a9f6f36804d731e296e6df555037bc\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/rules/database.mdc\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.b935dfe0b4bbbab6e11c35d95b0c3ce28dc76a65e45557898c6f69502e9f7adc\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/rules/testing.mdc\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.a9c99bc2ee01c32be471949d98d7f83a6cf07b7ae5f5c3890cc1b1f7ad24b48b\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/rules/observability.mdc\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.eb69ba40567af59d6a70f897a9227f05a29a04c42c2e3819f4284771a27a7514\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/rules/change-control.mdc\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.82febddcf5165b8b00a89ae52689ab19a4f077f63fb07d3a81b7556cc0bec85d\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在更新 AGENTS.md，在其中新增“参考规则”章节，列出所有新生成的规则文件。
</details>

正在向 `AGENTS.md` 添加「参考规则」章节。

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.b7f11633a283f49bab9e078f0f48323c38858d08094655a7a89947b2337e5c60\",\"afterContentId\":\"composer.content.e04fe474dffe4765be9c03578ee51535569aa39c3cc870ac0f50d3e3ec787641\"}",
  "status": "completed"
}
```
</details>

已创建 6 个 Cursor Rule 文件，并在 `AGENTS.md` 中新增「参考规则」章节。

## 已创建规则

| 文件 | 适用场景 | 触发 |
|------|----------|------|
| `.cursor/rules/frontend.mdc` | React/Next.js、Apollo、Ant Design | `**/*.{tsx,jsx}` |
| `.cursor/rules/backend-api.mdc` | Resolver、Service、外部调用 | `graphql/`、`services/` 等 |
| `.cursor/rules/database.mdc` | Objection.js、迁移、事务 | `models/`、`migrations/` 等 |
| `.cursor/rules/testing.mdc` | 单元/集成/契约测试、mock | `*.test.ts` / `*.spec.ts` |
| `.cursor/rules/observability.mdc` | 日志、traceId、Langfuse、脱敏 | `**/*.{ts,tsx,js,jsx}` |
| `.cursor/rules/change-control.mdc` | 变更范围、评审清单 | **始终生效** |

## 每个规则的结构

1. **首行适用场景** — 如「用于前端 UI 组件开发…」
2. **「AI 决策前应首先检查本规则」** — 统一开头约束
3. **必须做 / 禁止做** — 与 `AGENTS.md` 分层原则对齐
4. **正反面代码示例** — TypeScript/TSX 示例，不含具体业务字段
5. **通用可复用** — 使用 `ReportService`、`traceId`、`SchemaSearchPort` 等抽象命名

## AGENTS.md 更新

在「变更范围控制」与「Git 与协作约定」之间新增了 [**参考规则**](AGENTS.md) 表格，列出全部规则文件、适用场景与触发方式。

项目尚无 `README.md`，因此索引写在 `AGENTS.md` 中。若后续需要 README，可将该表格同步过去。

## 用户

/create-subagent 帮我把前面生成的agent rule，commit 并且 push到 git@github.com:dezliu/nl-hermes.git

## 助手

<details>
<summary>Thinking</summary>

正在准备将此前生成的 agent 规则创建为子代理，并提交推送到指定的 GitHub 仓库。
</details>

正在检查 git 状态与远程配置，随后提交并推送已生成的 agent 规则。

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes && git status && git remote -v && git log -3 --oneline 2>/dev/null || echo \\\"No commits yet\\\"\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"cd\",\"args\":[{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}],\"fullText\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"status\"}],\"fullText\":\"git status\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"remote\"},{\"type\":\"word\",\"value\":\"-v\"}],\"fullText\":\"git remote -v\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"log\"},{\"type\":\"number\",\"value\":\"-3\"},{\"type\":\"word\",\"value\":\"--oneline\"}],\"fullText\":\"git log -3 --oneline\"},{\"name\":\"echo\",\"args\":[{\"type\":\"string\",\"value\":\"\\\"No commits yet\\\"\"}],\"fullText\":\"echo \\\"No commits yet\\\"\"}],\"hasRedirects\":true,\"allRedirectsAreDevNull\":true,\"redirects\":[{\"operator\":\">\",\"destinationFds\":[2],\"targetNodeType\":\"word\",\"targetText\":\"/dev/null\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"Check git status, remote, and recent commits\"}",
  "result": "{\"output\":\"On branch main\\n\\nNo commits yet\\n\\nUntracked files:\\n  (use \\\"git add <file>...\\\" to include in what will be committed)\\n\\t.cursor/\\n\\tAGENTS.md\\n\\nnothing added to commit but untracked files present (use \\\"git add\\\" to track)\\nNo commits yet\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor\",\"globPattern\":\"**/*\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor\",\"globPattern\":\"**/*\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor\",\"files\":[{\"relPath\":\"rules/change-control.mdc\"},{\"relPath\":\"rules/observability.mdc\"},{\"relPath\":\"rules/testing.mdc\"},{\"relPath\":\"rules/database.mdc\"},{\"relPath\":\"rules/backend-api.mdc\"},{\"relPath\":\"rules/frontend.mdc\"}],\"totalFiles\":6}]}",
  "status": "completed"
}
```
</details>

正在添加远程仓库、提交并推送。

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes && git remote add origin git@github.com:dezliu/nl-hermes.git 2>/dev/null || git remote set-url origin git@github.com:dezliu/nl-hermes.git && git add AGENTS.md .cursor/rules/ && git commit --trailer \\\"Co-authored-by: Cursor <cursoragent@cursor.com>\\\" -m \\\"$(cat <<'EOF'\\ndocs: add AGENTS.md and Cursor rules for AI collaboration\\n\\nEstablish Hermes/LingAnalytics AI agent guidelines and domain-specific\\nCursor rules for frontend, backend, database, testing, observability,\\nand change control.\\nEOF\\n)\\\" && git push -u origin main\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"cd\",\"args\":[{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}],\"fullText\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"remote\"},{\"type\":\"word\",\"value\":\"add\"},{\"type\":\"word\",\"value\":\"origin\"},{\"type\":\"word\",\"value\":\"git@github.com:dezliu/nl-hermes.git\"}],\"fullText\":\"git remote add origin git@github.com:dezliu/nl-hermes.git\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"remote\"},{\"type\":\"word\",\"value\":\"set-url\"},{\"type\":\"word\",\"value\":\"origin\"},{\"type\":\"word\",\"value\":\"git@github.com:dezliu/nl-hermes.git\"}],\"fullText\":\"git remote set-url origin git@github.com:dezliu/nl-hermes.git\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"add\"},{\"type\":\"word\",\"value\":\"AGENTS.md\"},{\"type\":\"word\",\"value\":\".cursor/rules/\"}],\"fullText\":\"git add AGENTS.md .cursor/rules/\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"commit\"},{\"type\":\"word\",\"value\":\"--trailer\"},{\"type\":\"string\",\"value\":\"\\\"Co-authored-by: Cursor <cursoragent@cursor.com>\\\"\"},{\"type\":\"word\",\"value\":\"-m\"},{\"type\":\"string\",\"value\":\"\\\"$(cat <<'EOF'\\ndocs: add AGENTS.md and Cursor rules for AI collaboration\\n\\nEstablish Hermes/LingAnalytics AI agent guidelines and domain-specific\\nCursor rules for frontend, backend, database, testing, observability,\\nand change control.\\nEOF\\n)\\\"\"}],\"fullText\":\"git commit --trailer \\\"Co-authored-by: Cursor <cursoragent@cursor.com>\\\" -m \\\"$(cat <<'EOF'\\ndocs: add AGENTS.md and Cursor rules for AI collaboration\\n\\nEstablish Hermes/LingAnalytics AI agent guidelines and domain-specific\\nCursor rules for frontend, backend, database, testing, observability,\\nand change control.\\nEOF\\n)\\\"\"},{\"name\":\"cat\",\"fullText\":\"cat\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"push\"},{\"type\":\"word\",\"value\":\"-u\"},{\"type\":\"word\",\"value\":\"origin\"},{\"type\":\"word\",\"value\":\"main\"}],\"fullText\":\"git push -u origin main\"}],\"hasRedirects\":true,\"hasCommandSubstitution\":true,\"allRedirectsAreDevNull\":true,\"redirects\":[{\"operator\":\">\",\"destinationFds\":[2],\"targetNodeType\":\"word\",\"targetText\":\"/dev/null\"},{\"operator\":\"<<\",\"destinationFds\":[0],\"targetNodeType\":\"heredoc_redirect\",\"targetText\":\"cat\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":true,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"Add remote, commit agent rules, push to GitHub\"}",
  "result": "{\"output\":\"[main (root-commit) 0564c1f] docs: add AGENTS.md and Cursor rules for AI collaboration\\n 7 files changed, 1170 insertions(+)\\n create mode 100644 .cursor/rules/backend-api.mdc\\n create mode 100644 .cursor/rules/change-control.mdc\\n create mode 100644 .cursor/rules/database.mdc\\n create mode 100644 .cursor/rules/frontend.mdc\\n create mode 100644 .cursor/rules/observability.mdc\\n create mode 100644 .cursor/rules/testing.mdc\\n create mode 100644 AGENTS.md\\nTo github.com:dezliu/nl-hermes.git\\n * [new branch]      main -> main\\nbranch 'main' set up to track 'origin/main'.\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes && git status && git log -1 --format='%h %s'\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"cd\",\"args\":[{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}],\"fullText\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"status\"}],\"fullText\":\"git status\"},{\"name\":\"git\",\"args\":[{\"type\":\"word\",\"value\":\"log\"},{\"type\":\"number\",\"value\":\"-1\"},{\"type\":\"concatenation\",\"value\":\"--format='%h %s'\"}],\"fullText\":\"git log -1 --format='%h %s'\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"Verify commit and push success\"}",
  "result": "{\"output\":\"On branch main\\nYour branch is up to date with 'origin/main'.\\n\\nnothing to commit, working tree clean\\n0564c1f docs: add AGENTS.md and Cursor rules for AI collaboration\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

已完成提交并推送到 GitHub。

## 提交信息

- **Commit**: `0564c1f`
- **Message**: `docs: add AGENTS.md and Cursor rules for AI collaboration`
- **Remote**: `git@github.com:dezliu/nl-hermes.git`
- **Branch**: `main`（已设置 upstream）

## 包含文件（7 个）

| 文件 |
|------|
| `AGENTS.md` |
| `.cursor/rules/frontend.mdc` |
| `.cursor/rules/backend-api.mdc` |
| `.cursor/rules/database.mdc` |
| `.cursor/rules/testing.mdc` |
| `.cursor/rules/observability.mdc` |
| `.cursor/rules/change-control.mdc` |

仓库地址：https://github.com/dezliu/nl-hermes

---

说明：本次按你的要求完成了 **commit + push**。若还需要把上述规则转成 `.cursor/agents/` 下的自定义 subagent（例如 `code-reviewer`、`backend-specialist` 等），可以说一下要几个、各自职责，我可以继续帮你生成。
