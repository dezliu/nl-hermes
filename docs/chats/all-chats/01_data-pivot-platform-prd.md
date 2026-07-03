# Data pivot platform PRD

- **ID**: `c4fb4e74-a461-4605-8cf4-43137d80c5d6`
- **创建时间**: 2026-07-01 15:04
- **模式**: agent
- **Agentic**: True

---

## 用户

角色设定：
请你担任资深产品业务分析师（BA）。我们现在要撰写一份面向业务方和开发团队的《数据透视平台业务需求规格说明书》（PRD）。严正声明：本次输出请不要包含任何技术选型（如 Python/Java/React）、不要写 API 接口定义、不要设计数据库表结构（ER图），也不要涉及具体的代码实现逻辑。只需关注“用户要做什么”、“系统应如何响应”、“业务流程如何流转”以及“界面交互规则”。

项目业务背景：
公司内部有多个业务数据库，业务人员不懂 SQL，但急需灵活取数和制作报表。我们需要打造一个“智能数据透视平台”，核心能力是：业务人员用大白话问数据，系统要么直接生成 SQL 给数仓同事校验，要么直接生成可视化报表。

核心业务模块详细诉求（请按以下结构提取为 PRD 正文）：

模块一：管理后台（面向 数据管理员）

数据源管理：管理员需要能在页面上配置数据库连接（地址、账号、库名）。系统要能测试连接是否成功。连接后，系统要能自动拉取该库下的所有表和字段清单，并以列表形式展示。
表元数据维护：管理员需要勾选“哪些表需要加入智能查询库”。对于已选中的表，管理员可以手动编辑“业务中文名”（例如将 user_id 改为“用户唯一标识”）和“字段同义词”（例如将 created_at 关联“下单时间”、“注册日期”等业务叫法）。
模板管理：管理员需要有一个界面专门管理“SQL模板”和“报表模板”，系统要有评分能力，评分高的SQL和报表，需要能提供管理员选择收入模板的功能。

SQL模板：包含模板名称、适用的业务场景描述、带占位符的SQL语句（例如 select * from orders where date > {{start_date}}）。
报表模板：包含模板名称、图表类型（折线/柱状/表格）、对应的SQL占位符、图表配置（如横轴/纵轴映射）。
模块二：用户前端平台（面向 普通业务人员）

双模式切换：用户在对话框顶部可以切换“SQL生成模式”和“报表生成模式”。
智能输入与模板推荐：当用户输入问题时（例如“上个月华东区的销售额”），系统需要异步匹配现有的模板。如果匹配度较高，对话框上方或侧边要以卡片形式温馨提醒：“检测到已有相似报表模板，是否直接套用？”，用户点击“套用”则自动带入参数填写框，点击“忽略”则继续走大模型原生生成逻辑。
流式交互与打断：

系统回答必须像 ChatGPT 一样一个字一个字地蹦出来（流式推送）。
推送过程要分阶段展示：先展示“正在理解问题...”，再展示“正在检索相关数据表...”，最后展示“正在生成结果...”。
中断能力：在系统回复过程中，发送按钮必须变为“停止生成”按钮。用户点击后，本次生成立即终止，已生成的部分内容可以保留在对话气泡中，并标记为“已中断”。
继续能力：在任意历史对话气泡下，用户都可以输入追加条件（例如“把地区换成华北”），系统必须能识别这是对上一轮次对话的延续，而不是开启新话题。
历史记录：左侧边栏展示历史会话列表，按日期倒序排列。用户可以重命名会话标题，也可以删除。
模块三：监控平台（面向 运维/管理层）

核心看板：需要提供图表展示以下业务指标（不需要技术埋点细节，只看业务层面的展示）：

缓存命中情况：展示近24小时的查询重复率。
检索质量提示：当系统内部计算的相似度评分出现大量低分（业务理解：系统没找到合适的表）时，看板要高亮预警。
Token消耗统计：展示近一周/一月的消耗趋势。
用户满意度：展示用户对生成结果的点赞/点踩统计。
输出要求：
请将以上内容整理为标准的 PRD 文档结构，必须包含以下章节：

文档修订记录与术语定义
用户角色定义（普通业务员、数据管理员、运维监控员）
业务总体流程图（用文字或 Mermaid 的 flowchart 描述用户从提问到拿到结果的完整路径）
功能性需求详细说明（按上述三大模块逐一描述，含输入条件、处理规则、输出结果）
非功能性业务需求（例如：响应时间要求、系统可用性要求、数据安全权限要求——仅限业务层面）
验收标准（每个模块给出 3~5 条最核心的验收用例）
保存路径：请将生成的内容保存至项目根目录下的 /docs/PRD_业务需求文档_v1.0.md。

## 助手

<details>
<summary>Thinking</summary>

正在梳理《智能数据透视平台》PRD的撰写框架。将围绕管理后台、智能查询、监控平台三个模块，提取业务流程与功能需求，排除技术实现细节。
</details>

先了解项目现有文档与业务上下文，再据此拟定 PRD 撰写计划。

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"docs/**/*\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"docs/**/*\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"**/*PRD*\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"**/*PRD*\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: mcp-codegraph-codegraph_explore</summary>

```json
{
  "rawArgs": "{\"name\":\"user-codegraph-codegraph_explore\",\"args\":{\"query\":\"智能数据透视平台 业务模块 数据源管理 模板管理 用户对话 监控看板 产品功能边界\"},\"toolCallId\":\"tool_3d17b1c5-354c-4811-844e-8f49ba760d7\",\"providerIdentifier\":\"codegraph\",\"toolName\":\"codegraph_explore\",\"smartModeApprovalOnly\":false,\"skipApproval\":true}",
  "params": "{\"tools\":[{\"name\":\"codegraph_explore\",\"parameters\":\"{\\\"query\\\":\\\"智能数据透视平台 业务模块 数据源管理 模板管理 用户对话 监控看板 产品功能边界\\\"}\",\"serverName\":\"codegraph\"}]}",
  "result": "{\"result\":\"{\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"Error: Tool execution failed: No CodeGraph project is loaded for this session.\\\\nSearched for a .codegraph/ directory starting from: /Users/dezliu/Documents/mine/repo/nl-hermes\\\\nThe index is likely fine — this is a working-directory detection issue: the MCP client launched the server outside your project and didn't report the workspace root. Fix it either way:\\\\n  • Pass projectPath to the tool call, e.g. projectPath: \\\\\\\"/absolute/path/to/your/project\\\\\\\"\\\\n  • Or add --path to the server's MCP config args: [\\\\\\\"serve\\\\\\\", \\\\\\\"--mcp\\\\\\\", \\\\\\\"--path\\\\\\\", \\\\\\\"/absolute/path/to/your/project\\\\\\\"]\\\"}]}\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在准备撰写《数据透视平台业务需求规格说明书》。将按标准 PRD 结构整理文档，涵盖用户角色定义、业务流程图、三大模块需求说明、非功能需求及验收标准。
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\",\"limit\":50}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\",\"limit\":50,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/AGENTS.md\"}",
  "result": "{\"contents\":\"# AGENTS.md — 灵析 (LingAnalytics) AI 协作规范\\n\\n> 本文件指导在本仓库中工作的 AI 协作代理。项目代号：**Hermes（赫尔墨斯）**；产品名称：**灵析 (LingAnalytics)**。\\n\\n---\\n\\n## 项目概述\\n\\n灵析是一个数据透视平台，用户可通过自然语言与系统交互，生成对应业务的 SQL 查询、数据报表等内容。\\n\\n## 技术栈\\n\\n| 领域 | 技术 |\\n|------|------|\\n| 前端框架 | Next.js 14 + React 18 |\\n| UI 组件库 | Ant Design |\\n| API 层 | Apollo GraphQL |\\n| ORM | Objection.js |\\n| 缓存 | Redis |\\n| 向量数据库 | Qdrant |\\n| AI 编排 | LangChain |\\n| 监控 | Langfuse |\\n| 自动化 | justfile |\\n| 容器化 | Docker + Nginx |\\n\\n---\\n\\n## AI Agent 角色定义\\n\\n在本仓库中，AI Agent 的角色是**企业研发协作代理**，而非代码补全工具。\\n\\n### 必须做到\\n\\n- **先理解上下文，再动手修改**\\n- **优先保证业务正确性、兼容性、可维护性**\\n- **给出完整可审查的改动，而不是半成品**\\n- **能补测试时补测试，能验证时做验证**\\n- **如存在风险、假设、未验证项，必须明确说明**\\n\\n### 禁止事项\\n\\n- **未经说明直接引入破坏性变更**\\n- **偷改外部接口、事件结构、数据库字段语义**\\n- **把业务逻辑塞进 api、orm 层**\\n- **为了\\\"看起来更优雅\\\"做大面积无关重构**\\n- **虚构测试通过结果、运行结果、压测结果**\\n- **绕过安全、权限、审计、日志、监控要求**\\n\\n---\\n\",\"totalLinesInFile\":228}",
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
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"files\":[{\"relPath\":\".git/logs/refs/remotes/origin/main\"},{\"relPath\":\".git/refs/remotes/origin/main\"},{\"relPath\":\".git/config\"},{\"relPath\":\".git/logs/refs/heads/main\"},{\"relPath\":\".git/logs/HEAD\"},{\"relPath\":\".git/refs/heads/main\"},{\"relPath\":\".git/objects/05/64c1f2bed6158a3949b8eb51b75dd4cd0e7423\"},{\"relPath\":\".git/COMMIT_EDITMSG\"},{\"relPath\":\"AGENTS.md\"},{\"relPath\":\".cursor/rules/change-control.mdc\"},{\"relPath\":\".cursor/rules/observability.mdc\"},{\"relPath\":\".cursor/rules/testing.mdc\"},{\"relPath\":\".cursor/rules/database.mdc\"},{\"relPath\":\".cursor/rules/backend-api.mdc\"},{\"relPath\":\".cursor/rules/frontend.mdc\"},{\"relPath\":\".git/HEAD\"},{\"relPath\":\".git/hooks/push-to-checkout.sample\"},{\"relPath\":\".git/hooks/update.sample\"},{\"relPath\":\".git/hooks/pre-push.sample\"},{\"relPath\":\".git/hooks/pre-applypatch.sample\"},{\"relPath\":\".git/hooks/pre-merge-commit.sample\"},{\"relPath\":\".git/hooks/post-update.sample\"},{\"relPath\":\".git/hooks/prepare-commit-msg.sample\"},{\"relPath\":\".git/hooks/pre-receive.sample\"},{\"relPath\":\".git/hooks/fsmonitor-watchman.sample\"},{\"relPath\":\".git/hooks/applypatch-msg.sample\"},{\"relPath\":\".git/hooks/pre-commit.sample\"},{\"relPath\":\".git/hooks/sendemail-validate.sample\"},{\"relPath\":\".git/hooks/pre-rebase.sample\"},{\"relPath\":\".git/hooks/commit-msg.sample\"},{\"relPath\":\".git/description\"},{\"relPath\":\".git/info/exclude\"}],\"totalFiles\":32}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

当前项目尚处早期阶段，现有文件多为 AGENTS.md 及 Cursor 规则，尚未建立完整的业务需求文档体系。

已明确 PRD 撰写范围：排除技术选型、接口定义与数据库结构，聚焦业务流程与交互规则。接下来将制定文档结构与各模块详细说明方案。
</details>

需求已足够清晰；项目尚无 `docs/` 目录与既有 PRD。正在拟定完整的 PRD 撰写计划。

<details>
<summary>Tool: create_plan</summary>

```json
{
  "params": "{\"plan\":\"# 数据透视平台 PRD 撰写计划\\n\\n## 目标与约束\\n\\n- **产出物**：[`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)（需新建 `docs/` 目录）\\n- **产品名称**：对齐项目既有命名——**灵析 (LingAnalytics)** / 智能数据透视平台\\n- **严格排除**：技术选型、API 定义、数据库表结构/ER 图、代码实现逻辑\\n- **聚焦**：用户行为、系统响应、业务流程、界面交互规则\\n\\n---\\n\\n## 文档结构（共 7 大章）\\n\\n### 1. 文档修订记录与术语定义\\n\\n**修订记录**（首版 v1.0）：\\n\\n| 版本 | 日期 | 修订人 | 修订说明 |\\n|------|------|--------|----------|\\n| v1.0 | 2026-07-01 | — | 初稿，覆盖管理后台、用户前端、监控平台三大模块 |\\n\\n**术语定义**（从业务诉求中提炼，预计 10~15 条）：\\n\\n- 智能查询库、SQL 模板、报表模板、占位符参数、模板匹配度、流式回复、会话延续、缓存命中、检索相似度评分、Token 消耗、满意度反馈等\\n- 每条术语给出**业务含义**与**使用场景**，不涉及底层实现\\n\\n---\\n\\n### 2. 用户角色定义\\n\\n定义三类角色及其职责边界：\\n\\n```mermaid\\nflowchart LR\\n  subgraph roles [用户角色]\\n    Admin[数据管理员]\\n    User[普通业务员]\\n    Ops[运维监控员]\\n  end\\n  Admin -->|配置数据源与元数据| DataLayer[智能查询库]\\n  Admin -->|维护模板与评分| TemplateLib[模板库]\\n  User -->|自然语言提问| Chat[对话平台]\\n  Chat -->|SQL模式| SQLResult[SQL输出]\\n  Chat -->|报表模式| ReportResult[可视化报表]\\n  Ops -->|查看指标| Dashboard[监控看板]\\n```\\n\\n| 角色 | 核心诉求 | 可访问模块 |\\n|------|----------|------------|\\n| **数据管理员** | 接入数据源、维护表/字段业务语义、管理模板 | 管理后台 |\\n| **普通业务员** | 用大白话取数、做报表，无需懂 SQL | 用户前端平台 |\\n| **运维/监控员** | 关注系统运行质量、成本与用户满意度 | 监控平台 |\\n\\n补充说明：数仓同事作为**外部协作角色**（校验 SQL），在流程图中体现但不在系统内建角色列表中。\\n\\n---\\n\\n### 3. 业务总体流程图\\n\\n用 Mermaid flowchart 描述**从提问到拿到结果**的完整路径，覆盖双模式分支：\\n\\n```mermaid\\nflowchart TD\\n  Start[业务员输入自然语言问题] --> ModeCheck{当前模式}\\n  ModeCheck -->|SQL生成模式| TemplateMatch1[异步匹配SQL/报表模板]\\n  ModeCheck -->|报表生成模式| TemplateMatch2[异步匹配SQL/报表模板]\\n  TemplateMatch1 --> HighMatch{匹配度是否较高}\\n  TemplateMatch2 --> HighMatch\\n  HighMatch -->|是| CardPrompt[展示模板推荐卡片]\\n  HighMatch -->|否| NativeGen[走原生智能生成]\\n  CardPrompt --> UserChoice{用户选择}\\n  UserChoice -->|套用| FillParams[带入参数填写框并生成]\\n  UserChoice -->|忽略| NativeGen\\n  FillParams --> StreamGen[分阶段流式生成]\\n  NativeGen --> StreamGen\\n  StreamGen --> Phase1[正在理解问题]\\n  Phase1 --> Phase2[正在检索相关数据表]\\n  Phase2 --> Phase3[正在生成结果]\\n  Phase3 --> UserAction{用户操作}\\n  UserAction -->|停止生成| Interrupted[保留部分内容并标记已中断]\\n  UserAction -->|等待完成| Result{模式}\\n  Result -->|SQL模式| SQLOutput[输出SQL供数仓校验]\\n  Result -->|报表模式| ReportOutput[输出可视化报表]\\n  UserAction -->|追加条件| Continue[识别为上一轮延续并重新生成]\\n  Continue --> StreamGen\\n```\\n\\n流程说明将用文字补充：历史会话管理、点赞/点踩反馈如何回流至监控看板（业务层面描述，不写埋点方案）。\\n\\n---\\n\\n### 4. 功能性需求详细说明\\n\\n按三大模块逐一展开，每个功能点统一采用 **输入条件 → 处理规则 → 输出结果 → 界面交互规则** 四段式描述。\\n\\n#### 模块一：管理后台（数据管理员）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.1.1 数据源管理** | 页面配置连接信息（地址、账号、库名）；一键测试连接；成功后自动拉取全库表/字段清单并以列表展示 |\\n| **4.1.2 表元数据维护** | 勾选纳入智能查询库的表；编辑业务中文名；维护字段同义词（一对多业务叫法） |\\n| **4.1.3 SQL 模板管理** | 模板名称、业务场景描述、带占位符的 SQL 语句；系统评分；高分模板可被管理员「收入模板库」 |\\n| **4.1.4 报表模板管理** | 模板名称、图表类型（折线/柱状/表格）、SQL 占位符、图表配置（横轴/纵轴映射）；评分与收入机制同 SQL 模板 |\\n\\n**界面交互规则补充**：\\n- 连接测试：成功/失败需即时反馈，失败展示可读原因\\n- 表/字段列表：支持搜索、筛选已选/未选\\n- 模板评分：展示评分维度说明（业务层：使用频次、用户满意度、生成成功率等），管理员可筛选高分模板执行「收入」操作\\n\\n#### 模块二：用户前端平台（普通业务员）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.2.1 双模式切换** | 对话框顶部切换「SQL 生成模式」/「报表生成模式」，切换后上下文保持、生成逻辑按模式分流 |\\n| **4.2.2 智能输入与模板推荐** | 输入问题时异步匹配模板；高匹配度时以卡片提醒「检测到已有相似报表/SQL 模板，是否直接套用？」；套用→参数框；忽略→原生生成 |\\n| **4.2.3 流式交互** | 逐字流式推送；三阶段状态文案：理解问题 → 检索数据表 → 生成结果 |\\n| **4.2.4 中断与继续** | 生成中发送按钮变为「停止生成」；中断后保留已生成内容并标记「已中断」；任意历史气泡下可追加条件，系统识别为延续而非新话题 |\\n| **4.2.5 历史记录** | 左侧边栏按日期倒序；支持重命名标题、删除会话 |\\n\\n**界面交互规则补充**：\\n- 模板推荐卡片位置：对话框上方或侧边，不遮挡输入区\\n- 停止按钮与发送按钮互斥切换，中断后恢复为发送\\n- 追加条件时，系统应在回复中体现对上一轮上下文的引用（业务层描述）\\n\\n#### 模块三：监控平台（运维/管理层）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.3.1 缓存命中看板** | 近 24 小时查询重复率图表 |\\n| **4.3.2 检索质量预警** | 相似度低分集中时高亮预警（业务含义：系统未找到合适表） |\\n| **4.3.3 Token 消耗统计** | 近一周/一月消耗趋势图 |\\n| **4.3.4 用户满意度** | 点赞/点踩统计展示 |\\n\\n---\\n\\n### 5. 非功能性业务需求\\n\\n仅从业务层面描述，不涉及技术方案：\\n\\n| 类别 | 业务要求 |\\n|------|----------|\\n| **响应体验** | 流式首字出现 ≤ 3 秒；模板匹配卡片在输入停顿后 ≤ 2 秒出现；完整 SQL/报表生成在常规模型下 ≤ 60 秒（超时需提示） |\\n| **可用性** | 工作时间（8:00–20:00）系统可用率 ≥ 99%；计划维护需提前通知 |\\n| **数据安全与权限** | 业务员仅能查询其权限范围内的表/字段；管理员操作需留痕；敏感字段（如手机号）查询结果需脱敏展示 |\\n| **并发与公平** | 单用户同时仅允许 1 个进行中的生成任务；中断后立即释放 |\\n| **审计** | 每次 SQL/报表生成需记录：提问人、时间、所用模板（若有）、满意度反馈 |\\n\\n---\\n\\n### 6. 验收标准\\n\\n每个模块 3~5 条**可测试的业务验收用例**（Given-When-Then 或步骤式）：\\n\\n**模块一（管理后台）— 示例**：\\n1. 管理员配置有效连接并测试通过 → 系统自动展示该库全部表及字段清单\\n2. 管理员勾选 3 张表并编辑字段同义词 → 业务员提问时系统能识别同义词\\n3. 管理员创建带 `{{start_date}}` 占位符的 SQL 模板 → 模板库中可检索到\\n4. 高分 SQL 模板被管理员「收入」→ 业务员提问时可被推荐卡片命中\\n5. 连接测试失败 → 页面展示明确失败提示，不拉取表清单\\n\\n**模块二（用户前端）— 示例**：\\n1. 切换至报表模式并输入「上个月华东区销售额」→ 流式三阶段展示后输出图表\\n2. 输入与已有模板高度相似的问题 → 2 秒内出现推荐卡片；点击「套用」→ 弹出参数框\\n3. 生成过程中点击「停止生成」→ 内容保留并标记「已中断」\\n4. 在历史回复下输入「把地区换成华北」→ 系统基于上一轮上下文重新生成\\n5. 左侧历史列表支持重命名与删除，删除后会话不可恢复\\n\\n**模块三（监控平台）— 示例**：\\n1. 看板展示近 24 小时查询重复率折线图\\n2. 当低相似度评分占比超阈值 → 看板出现高亮预警\\n3. 可切换查看近一周/一月 Token 消耗趋势\\n4. 展示点赞/点踩数量及占比统计\\n\\n---\\n\\n## 撰写原则\\n\\n1. **语言风格**：面向业务方可读，面向开发方可执行（规则明确、无歧义）\\n2. **编号体系**：章节 1~6；功能需求 4.x.x；验收用例 AC-Mx-y\\n3. **不越界**：凡涉及「如何实现」的内容一律不写；用「系统应」「用户可」等业务句式\\n4. **与项目对齐**：产品名使用「灵析」；不引用 [`AGENTS.md`](AGENTS.md) 中的技术栈内容\\n\\n---\\n\\n## 执行步骤\\n\\n1. 创建目录 `docs/`\\n2. 按上述结构撰写完整 Markdown 文档（预计 400~600 行）\\n3. 自检：全文检索是否误含 API、表结构、技术栈关键词\\n4. 保存至 [`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)\\n\\n## 风险与假设\\n\\n- **假设**：公司已有统一账号体系，PRD 不展开登录/SSO 细节，仅在权限章节提及「按角色授权」\\n- **假设**：数仓同事通过线下或既有协作渠道校验 SQL，系统只负责输出 SQL 文本\\n- **未覆盖**：移动端适配、多语言、批量导出等未在用户诉求中出现，首版 PRD 不展开\\n\",\"name\":\"PRD 业务需求文档\",\"todos\":[{\"content\":\"创建 docs/ 目录\",\"status\":\"pending\",\"id\":\"create-docs-dir\"},{\"content\":\"撰写 PRD 七章正文：修订记录、术语、角色、流程图、功能需求、非功能需求、验收标准\",\"status\":\"pending\",\"id\":\"write-prd-structure\"},{\"content\":\"按三大模块展开功能性需求（输入/处理/输出/交互四段式）\",\"status\":\"pending\",\"id\":\"write-module-details\"},{\"content\":\"补充业务总体流程图与角色关系 Mermaid 图\",\"status\":\"pending\",\"id\":\"add-mermaid-diagrams\"},{\"content\":\"自检全文不含技术选型、API、数据库表结构等内容\",\"status\":\"pending\",\"id\":\"self-check\"}],\"overview\":\"基于用户提供的三大业务模块诉求，在项目根目录新建 `/docs/PRD_业务需求文档_v1.0.md`，撰写一份纯业务视角、不含技术实现细节的《数据透视平台业务需求规格说明书》。\"}",
  "result": "{\"rejected\":{}}",
  "status": "completed"
}
```
</details>

## 用户

管理端要包括：
- 数据源管理，数据源对应：表元数据同步/手动录入/编辑描述
- 系统 prompt 管理，包括：
  - 角色设定
  - 对系统的限制
  需要可以对不同角色，分别设定prompt
- SQL模板管理
- 报表模板管理
- 向量检索测试
- 离线评估功能
- 系统设置：生成sql，返回数据行数限制
- 告警信息

## 助手

<details>
<summary>Thinking</summary>

用户正在迭代PRD文档的计划。
</details>

正在将你补充的管理端需求并入 PRD 撰写计划。

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\"}",
  "result": "{\"contents\":\"---\\nname: PRD 业务需求文档\\noverview: 基于用户提供的三大业务模块诉求，在项目根目录新建 `/docs/PRD_业务需求文档_v1.0.md`，撰写一份纯业务视角、不含技术实现细节的《数据透视平台业务需求规格说明书》。\\ntodos:\\n  - id: create-docs-dir\\n    content: 创建 docs/ 目录\\n    status: pending\\n  - id: write-prd-structure\\n    content: 撰写 PRD 七章正文：修订记录、术语、角色、流程图、功能需求、非功能需求、验收标准\\n    status: pending\\n  - id: write-module-details\\n    content: 按三大模块展开功能性需求（输入/处理/输出/交互四段式）\\n    status: pending\\n  - id: add-mermaid-diagrams\\n    content: 补充业务总体流程图与角色关系 Mermaid 图\\n    status: pending\\n  - id: self-check\\n    content: 自检全文不含技术选型、API、数据库表结构等内容\\n    status: pending\\nisProject: false\\n---\\n\\n# 数据透视平台 PRD 撰写计划\\n\\n## 目标与约束\\n\\n- **产出物**：[`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)（需新建 `docs/` 目录）\\n- **产品名称**：对齐项目既有命名——**灵析 (LingAnalytics)** / 智能数据透视平台\\n- **严格排除**：技术选型、API 定义、数据库表结构/ER 图、代码实现逻辑\\n- **聚焦**：用户行为、系统响应、业务流程、界面交互规则\\n\\n---\\n\\n## 文档结构（共 7 大章）\\n\\n### 1. 文档修订记录与术语定义\\n\\n**修订记录**（首版 v1.0）：\\n\\n| 版本 | 日期 | 修订人 | 修订说明 |\\n|------|------|--------|----------|\\n| v1.0 | 2026-07-01 | — | 初稿，覆盖管理后台、用户前端、监控平台三大模块 |\\n\\n**术语定义**（从业务诉求中提炼，预计 10~15 条）：\\n\\n- 智能查询库、SQL 模板、报表模板、占位符参数、模板匹配度、流式回复、会话延续、缓存命中、检索相似度评分、Token 消耗、满意度反馈等\\n- 每条术语给出**业务含义**与**使用场景**，不涉及底层实现\\n\\n---\\n\\n### 2. 用户角色定义\\n\\n定义三类角色及其职责边界：\\n\\n```mermaid\\nflowchart LR\\n  subgraph roles [用户角色]\\n    Admin[数据管理员]\\n    User[普通业务员]\\n    Ops[运维监控员]\\n  end\\n  Admin -->|配置数据源与元数据| DataLayer[智能查询库]\\n  Admin -->|维护模板与评分| TemplateLib[模板库]\\n  User -->|自然语言提问| Chat[对话平台]\\n  Chat -->|SQL模式| SQLResult[SQL输出]\\n  Chat -->|报表模式| ReportResult[可视化报表]\\n  Ops -->|查看指标| Dashboard[监控看板]\\n```\\n\\n| 角色 | 核心诉求 | 可访问模块 |\\n|------|----------|------------|\\n| **数据管理员** | 接入数据源、维护表/字段业务语义、管理模板 | 管理后台 |\\n| **普通业务员** | 用大白话取数、做报表，无需懂 SQL | 用户前端平台 |\\n| **运维/监控员** | 关注系统运行质量、成本与用户满意度 | 监控平台 |\\n\\n补充说明：数仓同事作为**外部协作角色**（校验 SQL），在流程图中体现但不在系统内建角色列表中。\\n\\n---\\n\\n### 3. 业务总体流程图\\n\\n用 Mermaid flowchart 描述**从提问到拿到结果**的完整路径，覆盖双模式分支：\\n\\n```mermaid\\nflowchart TD\\n  Start[业务员输入自然语言问题] --> ModeCheck{当前模式}\\n  ModeCheck -->|SQL生成模式| TemplateMatch1[异步匹配SQL/报表模板]\\n  ModeCheck -->|报表生成模式| TemplateMatch2[异步匹配SQL/报表模板]\\n  TemplateMatch1 --> HighMatch{匹配度是否较高}\\n  TemplateMatch2 --> HighMatch\\n  HighMatch -->|是| CardPrompt[展示模板推荐卡片]\\n  HighMatch -->|否| NativeGen[走原生智能生成]\\n  CardPrompt --> UserChoice{用户选择}\\n  UserChoice -->|套用| FillParams[带入参数填写框并生成]\\n  UserChoice -->|忽略| NativeGen\\n  FillParams --> StreamGen[分阶段流式生成]\\n  NativeGen --> StreamGen\\n  StreamGen --> Phase1[正在理解问题]\\n  Phase1 --> Phase2[正在检索相关数据表]\\n  Phase2 --> Phase3[正在生成结果]\\n  Phase3 --> UserAction{用户操作}\\n  UserAction -->|停止生成| Interrupted[保留部分内容并标记已中断]\\n  UserAction -->|等待完成| Result{模式}\\n  Result -->|SQL模式| SQLOutput[输出SQL供数仓校验]\\n  Result -->|报表模式| ReportOutput[输出可视化报表]\\n  UserAction -->|追加条件| Continue[识别为上一轮延续并重新生成]\\n  Continue --> StreamGen\\n```\\n\\n流程说明将用文字补充：历史会话管理、点赞/点踩反馈如何回流至监控看板（业务层面描述，不写埋点方案）。\\n\\n---\\n\\n### 4. 功能性需求详细说明\\n\\n按三大模块逐一展开，每个功能点统一采用 **输入条件 → 处理规则 → 输出结果 → 界面交互规则** 四段式描述。\\n\\n#### 模块一：管理后台（数据管理员）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.1.1 数据源管理** | 页面配置连接信息（地址、账号、库名）；一键测试连接；成功后自动拉取全库表/字段清单并以列表展示 |\\n| **4.1.2 表元数据维护** | 勾选纳入智能查询库的表；编辑业务中文名；维护字段同义词（一对多业务叫法） |\\n| **4.1.3 SQL 模板管理** | 模板名称、业务场景描述、带占位符的 SQL 语句；系统评分；高分模板可被管理员「收入模板库」 |\\n| **4.1.4 报表模板管理** | 模板名称、图表类型（折线/柱状/表格）、SQL 占位符、图表配置（横轴/纵轴映射）；评分与收入机制同 SQL 模板 |\\n\\n**界面交互规则补充**：\\n- 连接测试：成功/失败需即时反馈，失败展示可读原因\\n- 表/字段列表：支持搜索、筛选已选/未选\\n- 模板评分：展示评分维度说明（业务层：使用频次、用户满意度、生成成功率等），管理员可筛选高分模板执行「收入」操作\\n\\n#### 模块二：用户前端平台（普通业务员）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.2.1 双模式切换** | 对话框顶部切换「SQL 生成模式」/「报表生成模式」，切换后上下文保持、生成逻辑按模式分流 |\\n| **4.2.2 智能输入与模板推荐** | 输入问题时异步匹配模板；高匹配度时以卡片提醒「检测到已有相似报表/SQL 模板，是否直接套用？」；套用→参数框；忽略→原生生成 |\\n| **4.2.3 流式交互** | 逐字流式推送；三阶段状态文案：理解问题 → 检索数据表 → 生成结果 |\\n| **4.2.4 中断与继续** | 生成中发送按钮变为「停止生成」；中断后保留已生成内容并标记「已中断」；任意历史气泡下可追加条件，系统识别为延续而非新话题 |\\n| **4.2.5 历史记录** | 左侧边栏按日期倒序；支持重命名标题、删除会话 |\\n\\n**界面交互规则补充**：\\n- 模板推荐卡片位置：对话框上方或侧边，不遮挡输入区\\n- 停止按钮与发送按钮互斥切换，中断后恢复为发送\\n- 追加条件时，系统应在回复中体现对上一轮上下文的引用（业务层描述）\\n\\n#### 模块三：监控平台（运维/管理层）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.3.1 缓存命中看板** | 近 24 小时查询重复率图表 |\\n| **4.3.2 检索质量预警** | 相似度低分集中时高亮预警（业务含义：系统未找到合适表） |\\n| **4.3.3 Token 消耗统计** | 近一周/一月消耗趋势图 |\\n| **4.3.4 用户满意度** | 点赞/点踩统计展示 |\\n\\n---\\n\\n### 5. 非功能性业务需求\\n\\n仅从业务层面描述，不涉及技术方案：\\n\\n| 类别 | 业务要求 |\\n|------|----------|\\n| **响应体验** | 流式首字出现 ≤ 3 秒；模板匹配卡片在输入停顿后 ≤ 2 秒出现；完整 SQL/报表生成在常规模型下 ≤ 60 秒（超时需提示） |\\n| **可用性** | 工作时间（8:00–20:00）系统可用率 ≥ 99%；计划维护需提前通知 |\\n| **数据安全与权限** | 业务员仅能查询其权限范围内的表/字段；管理员操作需留痕；敏感字段（如手机号）查询结果需脱敏展示 |\\n| **并发与公平** | 单用户同时仅允许 1 个进行中的生成任务；中断后立即释放 |\\n| **审计** | 每次 SQL/报表生成需记录：提问人、时间、所用模板（若有）、满意度反馈 |\\n\\n---\\n\\n### 6. 验收标准\\n\\n每个模块 3~5 条**可测试的业务验收用例**（Given-When-Then 或步骤式）：\\n\\n**模块一（管理后台）— 示例**：\\n1. 管理员配置有效连接并测试通过 → 系统自动展示该库全部表及字段清单\\n2. 管理员勾选 3 张表并编辑字段同义词 → 业务员提问时系统能识别同义词\\n3. 管理员创建带 `{{start_date}}` 占位符的 SQL 模板 → 模板库中可检索到\\n4. 高分 SQL 模板被管理员「收入」→ 业务员提问时可被推荐卡片命中\\n5. 连接测试失败 → 页面展示明确失败提示，不拉取表清单\\n\\n**模块二（用户前端）— 示例**：\\n1. 切换至报表模式并输入「上个月华东区销售额」→ 流式三阶段展示后输出图表\\n2. 输入与已有模板高度相似的问题 → 2 秒内出现推荐卡片；点击「套用」→ 弹出参数框\\n3. 生成过程中点击「停止生成」→ 内容保留并标记「已中断」\\n4. 在历史回复下输入「把地区换成华北」→ 系统基于上一轮上下文重新生成\\n5. 左侧历史列表支持重命名与删除，删除后会话不可恢复\\n\\n**模块三（监控平台）— 示例**：\\n1. 看板展示近 24 小时查询重复率折线图\\n2. 当低相似度评分占比超阈值 → 看板出现高亮预警\\n3. 可切换查看近一周/一月 Token 消耗趋势\\n4. 展示点赞/点踩数量及占比统计\\n\\n---\\n\\n## 撰写原则\\n\\n1. **语言风格**：面向业务方可读，面向开发方可执行（规则明确、无歧义）\\n2. **编号体系**：章节 1~6；功能需求 4.x.x；验收用例 AC-Mx-y\\n3. **不越界**：凡涉及「如何实现」的内容一律不写；用「系统应」「用户可」等业务句式\\n4. **与项目对齐**：产品名使用「灵析」；不引用 [`AGENTS.md`](AGENTS.md) 中的技术栈内容\\n\\n---\\n\\n## 执行步骤\\n\\n1. 创建目录 `docs/`\\n2. 按上述结构撰写完整 Markdown 文档（预计 400~600 行）\\n3. 自检：全文检索是否误含 API、表结构、技术栈关键词\\n4. 保存至 [`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)\\n\\n## 风险与假设\\n\\n- **假设**：公司已有统一账号体系，PRD 不展开登录/SSO 细节，仅在权限章节提及「按角色授权」\\n- **假设**：数仓同事通过线下或既有协作渠道校验 SQL，系统只负责输出 SQL 文本\\n- **未覆盖**：移动端适配、多语言、批量导出等未在用户诉求中出现，首版 PRD 不展开\\n\",\"totalLinesInFile\":219}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在根据扩展后的管理端需求更新计划。

数据源管理将整合表元数据同步、手动录入与描述编辑。系统提示按角色独立配置。向量检索测试和离线评估需用业务术语说明。系统设置包含SQL生成与返回数据行数限制。术语表和角色图谱也需同步更新。
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e14750bbc5d869fdcb7c31b8b7fe07c9ba2b8233601f539eec7bc3e8755bfcc3\",\"afterContentId\":\"composer.content.9dee3ca18b760458ed0efae66a76e9bca8fd8431bd189014f73b4666621c1df9\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.9dee3ca18b760458ed0efae66a76e9bca8fd8431bd189014f73b4666621c1df9\",\"afterContentId\":\"composer.content.be588ee69ace857ce11e5649f89f02cdbb6a983ebcf0316a14f5008ff60fcecd\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.be588ee69ace857ce11e5649f89f02cdbb6a983ebcf0316a14f5008ff60fcecd\",\"afterContentId\":\"composer.content.1c3726b3417c97194674ace5d07a1d88ce0a263b3cc7aa626a53c89735cf62a9\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.1c3726b3417c97194674ace5d07a1d88ce0a263b3cc7aa626a53c89735cf62a9\",\"afterContentId\":\"composer.content.77841d59afe3fdea903203758ac2eede519a97c15dee419f796a2e33a858ee93\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.77841d59afe3fdea903203758ac2eede519a97c15dee419f796a2e33a858ee93\",\"afterContentId\":\"composer.content.89983863f449a8cb7944a130adf75d1a96b071f88fad9602e24dfc5a6d853062\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.89983863f449a8cb7944a130adf75d1a96b071f88fad9602e24dfc5a6d853062\",\"afterContentId\":\"composer.content.61a586c36438fe5e17de42ceb81738f6e26842bf5c7fd09812332eade43e5aab\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.61a586c36438fe5e17de42ceb81738f6e26842bf5c7fd09812332eade43e5aab\",\"afterContentId\":\"composer.content.25e63b154fbe04f18644e6697f308f1e1a7140956f2f7cad9523aaeb214edd48\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.25e63b154fbe04f18644e6697f308f1e1a7140956f2f7cad9523aaeb214edd48\",\"afterContentId\":\"composer.content.ebcd50c8f81430eb46ad890839b18e0b9d64028a076d5705afa33f827f45de65\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.ebcd50c8f81430eb46ad890839b18e0b9d64028a076d5705afa33f827f45de65\",\"afterContentId\":\"composer.content.05df9c8b280d05d4400185df6b860653bbceea28ba251a487a60c6978fe4abfd\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

发现编号不一致：提到8个子域，但只列出了4.1.1至4项。

重新清点后确认实际有9个子域。用户原列8项，但数据源与表元数据本为关联项，合并后共9项。
</details>

合并数据源与表元数据编号，使管理端功能域与用户诉求的 8 项一致。

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.05df9c8b280d05d4400185df6b860653bbceea28ba251a487a60c6978fe4abfd\",\"afterContentId\":\"composer.content.b604869c75167b67015cde284adc13aac3362e153b9ecb08b37bf1ba8a6af2a1\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.b604869c75167b67015cde284adc13aac3362e153b9ecb08b37bf1ba8a6af2a1\",\"afterContentId\":\"composer.content.f12e13b413f343b1c209694320e5f37415ea263ad00bab017b3b5866417be009\"}",
  "status": "completed"
}
```
</details>

已根据你补充的管理端诉求更新了 PRD 撰写计划，主要变更如下：

## 管理后台：8 大功能域

| 编号 | 功能域 | 要点 |
|------|--------|------|
| 4.1.1 | **数据源与表元数据管理** | 合并为一域：连接配置 + **同步** / **手动录入** / **编辑描述**（业务中文名、同义词） |
| 4.1.2 | **系统 Prompt 管理** | 角色设定、系统限制；**按角色分别配置**；支持预览与版本回滚 |
| 4.1.3 | **SQL 模板管理** | 保留原方案 |
| 4.1.4 | **报表模板管理** | 保留原方案 |
| 4.1.5 | **向量检索测试** | 业务表述为「语义检索测试」：输入模拟问题 → 展示匹配表/字段及相似度 |
| 4.1.6 | **离线评估** | 评估问题集、批量运行、命中率报告、低分样本复盘 |
| 4.1.7 | **系统设置** | SQL 生成策略 + **返回数据行数上限**（超限须提示，不可静默截断） |
| 4.1.8 | **告警信息** | 事件列表、筛选、已读/已处理、跳转关联配置 |

## 其他同步调整

- **术语表**：补充 Prompt、离线评估集、返回行数上限、告警事件等
- **角色职责**：数据管理员职责扩展至 Prompt 配置、质量工具、系统策略与告警处置
- **非功能需求**：增加「结果可控」（行数上限）及 Prompt/设置变更审计
- **验收用例**：管理后台更新为 6 条，覆盖 Prompt 按角色生效、语义检索测试、离线评估、行数限制与告警
- **边界说明**：监控看板侧重趋势指标；管理端「告警信息」侧重事件处置闭环

## 撰写约定

「向量检索测试」在菜单上保留你的原称，正文用业务语言描述为「根据自然语言匹配表/字段」，避免写具体技术实现。

---

计划已更新。若没有其他补充，回复「开始执行」或「确认计划」，我会按计划在 `docs/PRD_业务需求文档_v1.0.md` 生成完整 PRD 正文。

## 用户

生成prd

## 助手

<details>
<summary>Thinking</summary>

开始执行计划并生成PRD文档。
</details>

正在根据已确认的计划生成完整 PRD 文档。

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/.cursor/plans/prd_业务需求文档_aef326b3.plan.md\"}",
  "result": "{\"contents\":\"---\\nname: PRD 业务需求文档\\noverview: 基于用户提供的三大业务模块诉求，在项目根目录新建 `/docs/PRD_业务需求文档_v1.0.md`，撰写一份纯业务视角、不含技术实现细节的《数据透视平台业务需求规格说明书》。\\ntodos:\\n  - id: create-docs-dir\\n    content: 创建 docs/ 目录\\n    status: pending\\n  - id: write-prd-structure\\n    content: 撰写 PRD 七章正文：修订记录、术语、角色、流程图、功能需求、非功能需求、验收标准\\n    status: pending\\n  - id: write-module-details\\n    content: 按三大模块展开功能性需求（管理后台 8 大功能域，四段式描述）\\n    status: pending\\n  - id: add-mermaid-diagrams\\n    content: 补充业务总体流程图与角色关系 Mermaid 图\\n    status: pending\\n  - id: self-check\\n    content: 自检全文不含技术选型、API、数据库表结构等内容\\n    status: pending\\nisProject: false\\n---\\n\\n# 数据透视平台 PRD 撰写计划\\n\\n## 目标与约束\\n\\n- **产出物**：[`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)（需新建 `docs/` 目录）\\n- **产品名称**：对齐项目既有命名——**灵析 (LingAnalytics)** / 智能数据透视平台\\n- **严格排除**：技术选型、API 定义、数据库表结构/ER 图、代码实现逻辑\\n- **聚焦**：用户行为、系统响应、业务流程、界面交互规则\\n\\n---\\n\\n## 文档结构（共 7 大章）\\n\\n### 1. 文档修订记录与术语定义\\n\\n**修订记录**（首版 v1.0）：\\n\\n| 版本 | 日期 | 修订人 | 修订说明 |\\n|------|------|--------|----------|\\n| v1.0 | 2026-07-01 | — | 初稿，覆盖管理后台（8 子域）、用户前端、监控平台三大模块 |\\n\\n**术语定义**（从业务诉求中提炼，预计 15~20 条）：\\n\\n- 智能查询库、数据源、表元数据同步、业务中文名、字段同义词、系统 Prompt、角色 Prompt、SQL 模板、报表模板、占位符参数、模板匹配度、语义检索、离线评估集、评估报告、流式回复、会话延续、缓存命中、检索相似度评分、返回行数上限、告警事件、Token 消耗、满意度反馈等\\n- 每条术语给出**业务含义**与**使用场景**，不涉及底层实现\\n- **语义检索**：业务层表述为「根据用户自然语言问题，从已维护的表/字段知识中找出最相关的数据对象」；PRD 中统一用此表述，避免写「向量」等技术词汇（管理端菜单可保留用户原称「向量检索测试」，正文以业务语义描述其用途）\\n\\n---\\n\\n### 2. 用户角色定义\\n\\n定义三类角色及其职责边界：\\n\\n```mermaid\\nflowchart LR\\n  subgraph roles [用户角色]\\n    Admin[数据管理员]\\n    User[普通业务员]\\n    Ops[运维监控员]\\n  end\\n  Admin -->|配置数据源与表元数据| DataLayer[智能查询库]\\n  Admin -->|按角色配置Prompt| PromptCfg[系统Prompt]\\n  Admin -->|维护模板与评分| TemplateLib[模板库]\\n  Admin -->|检索测试与离线评估| QualityTools[质量工具]\\n  Admin -->|系统设置与告警| SysCfg[系统配置]\\n  User -->|自然语言提问| Chat[对话平台]\\n  Chat -->|SQL模式| SQLResult[SQL输出]\\n  Chat -->|报表模式| ReportResult[可视化报表]\\n  Ops -->|查看指标| Dashboard[监控看板]\\n```\\n\\n| 角色 | 核心诉求 | 可访问模块 |\\n|------|----------|------------|\\n| **数据管理员** | 接入数据源、同步/维护表元数据、按角色配置系统 Prompt、管理模板、执行检索测试与离线评估、管理系统策略与查看告警 | 管理后台 |\\n| **普通业务员** | 用大白话取数、做报表，无需懂 SQL | 用户前端平台 |\\n| **运维/监控员** | 关注系统运行质量、成本与用户满意度 | 监控平台 |\\n\\n补充说明：数仓同事作为**外部协作角色**（校验 SQL），在流程图中体现但不在系统内建角色列表中。\\n\\n---\\n\\n### 3. 业务总体流程图\\n\\n用 Mermaid flowchart 描述**从提问到拿到结果**的完整路径，覆盖双模式分支：\\n\\n```mermaid\\nflowchart TD\\n  Start[业务员输入自然语言问题] --> ModeCheck{当前模式}\\n  ModeCheck -->|SQL生成模式| TemplateMatch1[异步匹配SQL/报表模板]\\n  ModeCheck -->|报表生成模式| TemplateMatch2[异步匹配SQL/报表模板]\\n  TemplateMatch1 --> HighMatch{匹配度是否较高}\\n  TemplateMatch2 --> HighMatch\\n  HighMatch -->|是| CardPrompt[展示模板推荐卡片]\\n  HighMatch -->|否| NativeGen[走原生智能生成]\\n  CardPrompt --> UserChoice{用户选择}\\n  UserChoice -->|套用| FillParams[带入参数填写框并生成]\\n  UserChoice -->|忽略| NativeGen\\n  FillParams --> StreamGen[分阶段流式生成]\\n  NativeGen --> StreamGen\\n  StreamGen --> Phase1[正在理解问题]\\n  Phase1 --> Phase2[正在检索相关数据表]\\n  Phase2 --> Phase3[正在生成结果]\\n  Phase3 --> UserAction{用户操作}\\n  UserAction -->|停止生成| Interrupted[保留部分内容并标记已中断]\\n  UserAction -->|等待完成| Result{模式}\\n  Result -->|SQL模式| SQLOutput[输出SQL供数仓校验]\\n  Result -->|报表模式| ReportOutput[输出可视化报表]\\n  UserAction -->|追加条件| Continue[识别为上一轮延续并重新生成]\\n  Continue --> StreamGen\\n```\\n\\n流程说明将用文字补充：历史会话管理、点赞/点踩反馈如何回流至监控看板（业务层面描述，不写埋点方案）。\\n\\n---\\n\\n### 4. 功能性需求详细说明\\n\\n按三大模块逐一展开，每个功能点统一采用 **输入条件 → 处理规则 → 输出结果 → 界面交互规则** 四段式描述。\\n\\n#### 模块一：管理后台（数据管理员）\\n\\n管理后台扩展为 **8 大功能域**（数据源与表元数据合并为一域，内含同步/录入/描述三类能力）：\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.1.1 数据源与表元数据管理** | **数据源**：配置连接信息（地址、账号、库名）、测试连接；**表元数据同步**：连接成功后自动拉取表/字段清单；**手动录入**：支持补充手工新增表/字段；**编辑描述**：勾选纳入智能查询库的表；编辑表/字段业务中文名与字段描述；维护字段同义词（一对多，如 created_at →「下单时间」「注册日期」） |\\n| **4.1.2 系统 Prompt 管理** | 维护**角色设定**与**系统限制**；支持**按用户角色分别配置**不同 Prompt；支持预览、版本记录与回滚 |\\n| **4.1.3 SQL 模板管理** | 模板名称、适用业务场景描述、带占位符的 SQL；系统评分；高分模板可「收入模板库」 |\\n| **4.1.4 报表模板管理** | 模板名称、图表类型（折线/柱状/表格）、SQL 占位符、图表配置（横轴/纵轴）；评分与收入机制同 SQL 模板 |\\n| **4.1.5 向量检索测试**（业务表述：语义检索测试） | 输入模拟用户问题，展示匹配表/字段及相似度排序；验证元数据与同义词维护效果；可重复测试，无需完整生成 SQL/报表 |\\n| **4.1.6 离线评估** | 维护/使用评估问题集（含期望涉及表/期望要点）；批量运行输出评估报告（命中率、低分样本、一致性摘要）；支持导出 |\\n| **4.1.7 系统设置** | SQL 生成全局策略（业务规则级，如跨库限制、默认时间推断）；**返回数据行数上限**配置，超限须提示用户收窄条件 |\\n| **4.1.8 告警信息** | 集中展示业务告警（检索低分集中、连接失败、评估异常、行数超限频发等）；筛选、已读/已处理、跳转关联配置页 |\\n\\n**管理后台导航结构（建议）**：\\n\\n```mermaid\\nflowchart TB\\n  subgraph admin [管理后台]\\n    DS[数据源管理]\\n    DS --> Meta[表元数据同步/录入/描述编辑]\\n    Prompt[系统Prompt管理]\\n    SQLTpl[SQL模板管理]\\n    RptTpl[报表模板管理]\\n    SearchTest[向量检索测试]\\n    OfflineEval[离线评估]\\n    Settings[系统设置]\\n    Alerts[告警信息]\\n  end\\n```\\n\\n**界面交互规则补充**：\\n- 数据源 ↔ 元数据：以数据源为入口，进入后分 Tab「连接配置 / 表清单 / 字段详情」；同步与手动录入可并存，手动录入项需标记来源\\n- 连接测试：成功/失败即时反馈；失败不触发同步\\n- Prompt 管理：左侧角色列表，右侧编辑「角色设定」「系统限制」；未单独配置的角色继承默认 Prompt\\n- 语义检索测试：输入框 +「开始测试」；结果区展示 Top-N 表/字段卡片及相似度（业务可读等级：高/中/低）\\n- 离线评估：选择评估集 → 确认运行 → 进度条 → 报告页；运行中可取消\\n- 系统设置：行数限制需有默认值与上下界提示；修改需二次确认\\n- 告警：未处理告警在导航角标提示；与监控看板预警事件同源、管理端侧重处置闭环\\n\\n#### 模块二：用户前端平台（普通业务员）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.2.1 双模式切换** | 对话框顶部切换「SQL 生成模式」/「报表生成模式」，切换后上下文保持、生成逻辑按模式分流 |\\n| **4.2.2 智能输入与模板推荐** | 输入问题时异步匹配模板；高匹配度时以卡片提醒「检测到已有相似报表/SQL 模板，是否直接套用？」；套用→参数框；忽略→原生生成 |\\n| **4.2.3 流式交互** | 逐字流式推送；三阶段状态文案：理解问题 → 检索数据表 → 生成结果 |\\n| **4.2.4 中断与继续** | 生成中发送按钮变为「停止生成」；中断后保留已生成内容并标记「已中断」；任意历史气泡下可追加条件，系统识别为延续而非新话题 |\\n| **4.2.5 历史记录** | 左侧边栏按日期倒序；支持重命名标题、删除会话 |\\n\\n**界面交互规则补充**：\\n- 模板推荐卡片位置：对话框上方或侧边，不遮挡输入区\\n- 停止按钮与发送按钮互斥切换，中断后恢复为发送\\n- 追加条件时，系统应在回复中体现对上一轮上下文的引用（业务层描述）\\n\\n#### 模块三：监控平台（运维/管理层）\\n\\n| 功能域 | 核心需求要点 |\\n|--------|-------------|\\n| **4.3.1 缓存命中看板** | 近 24 小时查询重复率图表 |\\n| **4.3.2 检索质量预警** | 相似度低分集中时高亮预警（业务含义：系统未找到合适表） |\\n| **4.3.3 Token 消耗统计** | 近一周/一月消耗趋势图 |\\n| **4.3.4 用户满意度** | 点赞/点踩统计展示 |\\n\\n---\\n\\n### 5. 非功能性业务需求\\n\\n仅从业务层面描述，不涉及技术方案：\\n\\n| 类别 | 业务要求 |\\n|------|----------|\\n| **响应体验** | 流式首字出现 ≤ 3 秒；模板匹配卡片在输入停顿后 ≤ 2 秒出现；完整 SQL/报表生成在常规模型下 ≤ 60 秒（超时需提示） |\\n| **可用性** | 工作时间（8:00–20:00）系统可用率 ≥ 99%；计划维护需提前通知 |\\n| **数据安全与权限** | 业务员仅能查询其权限范围内的表/字段；管理员操作需留痕；敏感字段（如手机号）查询结果需脱敏展示 |\\n| **并发与公平** | 单用户同时仅允许 1 个进行中的生成任务；中断后立即释放 |\\n| **审计** | 每次 SQL/报表生成需记录：提问人、时间、所用模板（若有）、满意度反馈；Prompt 变更、系统设置变更需记录操作人与时间 |\\n| **结果可控** | 查询返回行数不得超过管理员在系统设置中配置的上限；超限时须明确提示并建议收窄条件 |\\n\\n---\\n\\n### 6. 验收标准\\n\\n每个模块 3~5 条**可测试的业务验收用例**（Given-When-Then 或步骤式）：\\n\\n**模块一（管理后台）— 5 条核心用例**：\\n1. 管理员配置有效连接并测试通过 → 可触发元数据同步，展示该库全部表及字段清单；支持对手工补充的表/字段编辑业务描述\\n2. 管理员为「普通业务员」角色单独配置 Prompt 限制「不可查询薪资相关表」→ 该角色用户提问薪资时系统拒绝并说明原因\\n3. 管理员在语义检索测试中输入「上个月华东销售额」→ 展示匹配表/字段列表及相似度，与业务员实际提问检索结果一致\\n4. 管理员运行离线评估集（含 20 条标准问题）→ 生成命中率报告，低分样本可逐条查看\\n5. 管理员将返回行数上限设为 1000 → 业务员生成 SQL 执行后若结果超限，系统提示收窄条件；同时告警信息中出现「行数超限」类记录（若达预警阈值）\\n6. （备选）高分 SQL 模板被「收入」→ 用户端可被推荐卡片命中\\n\\n**模块二（用户前端）— 示例**：\\n1. 切换至报表模式并输入「上个月华东区销售额」→ 流式三阶段展示后输出图表\\n2. 输入与已有模板高度相似的问题 → 2 秒内出现推荐卡片；点击「套用」→ 弹出参数框\\n3. 生成过程中点击「停止生成」→ 内容保留并标记「已中断」\\n4. 在历史回复下输入「把地区换成华北」→ 系统基于上一轮上下文重新生成\\n5. 左侧历史列表支持重命名与删除，删除后会话不可恢复\\n\\n**模块三（监控平台）— 示例**：\\n1. 看板展示近 24 小时查询重复率折线图\\n2. 当低相似度评分占比超阈值 → 看板出现高亮预警\\n3. 可切换查看近一周/一月 Token 消耗趋势\\n4. 展示点赞/点踩数量及占比统计\\n\\n---\\n\\n## 撰写原则\\n\\n1. **语言风格**：面向业务方可读，面向开发方可执行（规则明确、无歧义）\\n2. **编号体系**：章节 1~6；功能需求 4.x.x；验收用例 AC-Mx-y\\n3. **不越界**：凡涉及「如何实现」的内容一律不写；用「系统应」「用户可」等业务句式\\n4. **与项目对齐**：产品名使用「灵析」；不引用 [`AGENTS.md`](AGENTS.md) 中的技术栈内容\\n\\n---\\n\\n## 执行步骤\\n\\n1. 创建目录 `docs/`\\n2. 按上述结构撰写完整 Markdown 文档（预计 550~750 行，管理后台章节占比提升）\\n3. 自检：全文检索是否误含 API、表结构、技术栈关键词\\n4. 保存至 [`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)\\n\\n## 风险与假设\\n\\n- **假设**：公司已有统一账号体系，PRD 不展开登录/SSO 细节，仅在权限章节提及「按角色授权」\\n- **假设**：数仓同事通过线下或既有协作渠道校验 SQL，系统只负责输出 SQL 文本\\n- **未覆盖**：移动端适配、多语言等未在用户诉求中出现，首版 PRD 不展开\\n- **管理端与监控端边界**：监控看板侧重趋势与宏观指标；管理端「告警信息」侧重事件列表与处置闭环，二者事件类型对齐但展示粒度不同\\n\",\"totalLinesInFile\":253}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在撰写完整的PRD文档。
</details>

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"mkdir -p /Users/dezliu/Documents/mine/repo/nl-hermes/docs\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"mkdir\",\"args\":[{\"type\":\"word\",\"value\":\"-p\"},{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs\"}],\"fullText\":\"mkdir -p /Users/dezliu/Documents/mine/repo/nl-hermes/docs\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"创建 docs 目录\"}",
  "result": "{\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在撰写完整的PRD文档。
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.9ea0ab4c905772b91b72a3d323f209553c68f6da58793638f100780f739a65cc\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"API|GraphQL|React|Python|Java|Redis|Qdrant|ER图|CREATE TABLE|接口\",\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\",\"caseInsensitive\":true,\"multiline\":false,\"toolCallId\":\"tool_4e34c308-3a12-4522-81d7-bb1b29f5b13\",\"offset\":0}",
  "params": "{\"pattern\":\"API|GraphQL|React|Python|Java|Redis|Qdrant|ER图|CREATE TABLE|接口\",\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\",\"caseInsensitive\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"wc -l /Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"wc\",\"args\":[{\"type\":\"word\",\"value\":\"-l\"},{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\"}],\"fullText\":\"wc -l /Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"统计 PRD 文档行数\"}",
  "result": "{\"output\":\"     873 /Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

## 完成情况

PRD 已生成并保存至 [`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md)（约 873 行）。

### 修改了哪些文件

- **新增** `docs/PRD_业务需求文档_v1.0.md` — 灵析智能数据透视平台业务需求规格说明书 v1.0

### 文档结构

| 章节 | 内容 |
|------|------|
| **1. 修订记录与术语** | 修订记录 + 22 条业务术语定义 |
| **2. 用户角色** | 数据管理员、普通业务员、运维监控员 + 数仓外部协作角色 |
| **3. 业务总体流程** | 主流程 Mermaid 图、管理侧准备流程、模板推荐/流式/中断/反馈闭环 |
| **4. 功能需求** | 管理后台 8 大功能域、用户前端 6 项、监控平台 4 项（均采用「输入→处理→输出→交互」四段式） |
| **5. 非功能需求** | 响应体验、可用性、安全权限、并发、审计、结果可控、易用性 |
| **6. 验收标准** | 管理端 8 条、用户端 7 条、监控端 5 条（AC-Mx-xx 编号） |
| **7. 假设与风险** | 账号体系、数仓协作等假设及首版未覆盖项 |

### 管理后台 8 大功能域（已纳入）

1. 数据源与表元数据管理（同步 / 手动录入 / 描述编辑）
2. 系统 Prompt 管理（按角色配置角色设定与系统限制）
3. SQL 模板管理
4. 报表模板管理
5. 向量检索测试（正文以「语义检索测试」表述）
6. 离线评估
7. 系统设置（SQL 生成策略 + 返回行数上限）
8. 告警信息

### 做了哪些验证

- 全文自检：未出现技术选型、API 定义、数据库表结构等内容
- 仅「接口」一词出现在文档范围排除说明中

### 有哪些假设

- 沿用公司统一账号与角色体系
- 数仓同事在线下校验 SQL
- 模板匹配阈值、离线评估集质量需在试运行期调优

如需调整某一章节的粒度或补充业务流程，直接说明即可。

## 用户

/create-subagent /add-plugin marketplace add anthropics/skills

## 助手

<details>
<summary>Thinking</summary>

The user wants to create a subagent. They also provided a command to add the anthropics/skills plugin via the marketplace.

The user is building a PRD for LingAnalytics. The create-subagent skill should define a subagent role for this project.

The anthropics/skills command is ambiguous. It may be a Cursor command or a marketplace reference. The subagent should likely support PRD and business analyst work for LingAnalytics.

The add-plugin command appears to be a Cursor IDE instruction that cannot be executed directly. The subagent should instead serve as a PRD and business analyst expert for LingAnalytics, focusing on business requirements without technical details.

A PRD and business analyst subagent for LingAnalytics is the most logical choice. The plugin command might instead describe a skills-management subagent. Searching the codebase and cursor documentation for marketplace plugin commands.
</details>

正在根据对话上下文创建项目级 subagent，并查找 `add-plugin marketplace` 的用法。

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"**/.cursor/agents/**\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\",\"globPattern\":\"**/.cursor/agents/**\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes\"}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{}",
  "params": "{\"targetFile\":\"/Users/dezliu/.cursor/skills-cursor/cursor-guide/SKILL.md\",\"limit\":80,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/.cursor/skills-cursor/cursor-guide/SKILL.md\"}",
  "result": "{\"contents\":\"Error: File not found\",\"totalLinesInFile\":0}",
  "status": "error"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"add-plugin|marketplace\",\"path\":\"/Users/dezliu/.cursor\",\"caseInsensitive\":false,\"headLimit\":20,\"multiline\":false,\"toolCallId\":\"tool_2b30753b-d6ed-4f5e-ab43-810cf0b87a8\",\"offset\":0}",
  "params": "{\"pattern\":\"add-plugin|marketplace\",\"path\":\"/Users/dezliu/.cursor\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/.cursor/projects/Users-dezliu-Documents-mine-repo-nl-hermes/mcps\",\"globPattern\":\"**/*\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/.cursor/projects/Users-dezliu-Documents-mine-repo-nl-hermes/mcps\",\"globPattern\":\"**/*\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/.cursor/projects/Users-dezliu-Documents-mine-repo-nl-hermes/mcps\",\"files\":[{\"relPath\":\"user-codegraph/SERVER_METADATA.json\"},{\"relPath\":\"user-codegraph/INSTRUCTIONS.md\"},{\"relPath\":\"user-codegraph/tools/codegraph_files.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_status.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_explore.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_node.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_impact.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_callees.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_callers.json\"},{\"relPath\":\"user-codegraph/tools/codegraph_search.json\"},{\"relPath\":\"plugin-gitlab-GitLab/SERVER_METADATA.json\"},{\"relPath\":\"plugin-gitlab-GitLab/STATUS.md\"},{\"relPath\":\"plugin-gitlab-GitLab/tools/mcp_auth.json\"}],\"totalFiles\":13}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: web_search</summary>

```json
{
  "rawArgs": "{\"searchTerm\":\"Cursor IDE add-plugin marketplace anthropics/skills\",\"toolCallId\":\"tool_08a8e017-eacf-4500-99c6-60239d1099c\"}",
  "params": "{\"searchTerm\":\"Cursor IDE add-plugin marketplace anthropics/skills\"}",
  "result": "{\"references\":[{\"title\":\"Web search results\",\"chunk\":\"Links:\\n1. [anthropics/skills](https://github.com/anthropics/skills?tab=readme-ov-file)\\n2. [Installation - Anthropic Skills](https://anthropics-skills.mintlify.app/installation)\\n3. [Cursor 2.5: Plugins - Release Discussions - Cursor - Community Forum](https://forum.cursor.com/t/cursor-2-5-plugins/152124)\\n4. [The wonderful world of AI plugins - by Jake Handy](https://handyai.substack.com/p/the-wonderful-world-of-ai-plugins)\\n5. [Plugins | Cursor Docs](https://cursor.com/docs/plugins)\\n\\nSynthesis:\\nThe `anthropics/skills` repository is designed for Claude Code, not the Cursor IDE [1][2]. Cursor and Claude Code use different, incompatible plugin and marketplace systems [3][4].\\n\\nIn Cursor, you do not add external marketplaces via a CLI command. Instead, you manage plugins through the Cursor interface [5][4]:\\n\\n1. Open the Customize page in your sidebar to browse or search the official Cursor Marketplace [5][6].\\n2. For private or team-specific plugins, administrators can import a GitHub, GitLab, Bitbucket, or Azure DevOps repository directly through the Cursor Dashboard under Settings, Plugins, and Team Marketplaces [7][6][8].\\n\\nIf you wish to use Anthropic's skills in Cursor, you must manually download or clone the relevant skill files into your project's `.cursor/skills/` directory or your global `~/.cursor/skills/` folder [9][10]. Cursor automatically discovers and enables skills placed in these directories [9].\\n\\nHighlights:\\n<result id=\\\"1\\\">\\n<title>anthropics/skills</title>\\n<url>https://github.com/anthropics/skills?tab=readme-ov-file</url>\\n<content>You can register this repository as a Claude Code Plugin marketplace by running the following command in Claude Code:\\n...\\n```\\n/plugin marketplace add anthropics/skills\\n```\\n...\\nThen, to install a specific set of skills:\\n...\\n1. Select `Browse and install plugins`\\n2. Select `anthropic-agent-skills`\\n3. Select `document-skills` or `example-skills`\\n4. Select `Install now`\\n...\\nAlternatively, directly install either Plugin via:\\n...\\n```\\n/plugin install document-skills@anthropic-agent-skills\\n/plugin install example-skills@anthropic-agent-skills\\n```\\n...\\nAfter installing the plugin, you can use the skill by just mentioning it. For instance, if you install the `document-skills` plugin from the marketplace, you can ask Claude Code to do something like: \\\"Use the PDF skill to extract the form fields from `path/to/some-file.pdf`\\\"</content>\\n</result>\\n\\n<result id=\\\"2\\\">\\n<title>Installation - Anthropic Skills</title>\\n<url>https://anthropics-skills.mintlify.app/installation</url>\\n<content>Claude Code supports skills through its plugin marketplace system. The Anthropic skills repository can be added as a marketplace, giving you access to two curated skill collections.\\n...\\n### Add the skills marketplace\\n...\\nRegister the Anthropic skills repository:\\n...\\n```bash\\n/plugin marketplace add anthropics/skills\\n\\n```\\n...\\nThis makes the `anthropic-agent-skills` marketplace available with two plugin collections:\\n...\\n- document-skills - Excel, Word, PowerPoint, and PDF processing\\n- example-skills - 12 example skills demonstrating various capabilities\\n...\\n### Install skills via browse\\n...\\n## Select the marketplace\\n...\\nChoose `anthropic-agent-skills` from the marketplace list\\n...\\n## Choose a skill collection\\n...\\nSelect either:\\n...\\n- `document-skills` - Document processing suite (PDF, Word, PowerPoint, Excel)\\n- `example-skills` - Creative, development, and enterprise examples\\n...\\nClick \\\"Install now\\\" to add the skills to Claude Code\\n...\\n### Install skills via command\\n...\\nYou can also install directly:\\n...\\n```bash\\n/plugin install document-skills@anthropic-agent-skills\\n\\n```\\n...\\n```bash\\n/plugin install example-skills@anthropic-agent-skills\\n\\n```\\n...\\n### Claude Code: Marketplace not found\\n...\\nIf `/plugin marketplace add anthropics/skills` fails:\\n...\\n1. Verify you're using the latest version of Claude Code\\n2. Check that the repository URL is correct: `anthropics/skills`\\n3. Try adding with the full GitHub URL:\\n...\\n```bash\\n/plugin marketplace add https://github.com/anthropics/skills\\n\\n```</content>\\n</result>\\n\\n<result id=\\\"3\\\">\\n<title>Cursor 2.5: Plugins - Release Discussions - Cursor - Community Forum</title>\\n<url>https://forum.cursor.com/t/cursor-2-5-plugins/152124</url>\\n<content>You can now discover and install plugins from the Cursor Marketplace to extend Cursor with pre-built capabilities.\\n...\\nPlugins package skills, subagents, MCP servers, hooks, and rules into a single install. Browse plugins at https://cursor.com/marketplace or install directly in the editor with`/add-plugin`!\\n...\\nOur initial partners include Amplitude, AWS, Figma, Linear, Stripe, and more, covering workflows across design, databases, payments, analytics, and deployment. If your team already uses these tools, plugins give agents native access to them without writing custom skills from scratch.\\n...\\nFor plugin scaffolding, there’s actually a plugin for that!\\n...\\n### Cursor - Create Plugin Plugin\\n...\\nhttps://cursor.com/marketplace/cursor/create-plugin\\n...\\n@Colin In Claude Code, we can add custom marketplaces. Our team is using it to distribute our own skills and plugins. Are we able to do the same with Cursor? I don’t find anywhere we can add custom marketplace in 2.5\\n...\\nOur team is using it to distribute our own skills and plugins. Are we able to do the same with Cursor? I don’t find anywhere we can add custom marketplace in 2.5\\n...\\nWe’re working on private team marketplaces so organizations can share plugins internally with central governance and security controls. It’s coming soon!\\n...\\nWe’re working on private team marketplaces so organizations can share plugins internally with central governance and security controls. It’s coming soon!\\n...\\n> New in Cursor! · Full changelog· Main announcement Admins on Teams and Enterprise plans can now create team marketplaces to share private plugins internally! How it works: Team marketplaces let you import a GitHub repository of plugins and distribute them to your team. Go to Dashboard → Settings → Plugins, click Import under Team Marketplaces, paste a GitHub repo URL, and review the parsed plugins. Admins can also set Team Access groups to control who sees what, then name and save the marke…</content>\\n</result>\\n\\n<result id=\\\"4\\\">\\n<title>The wonderful world of AI plugins - by Jake Handy</title>\\n<url>https://handyai.substack.com/p/the-wonderful-world-of-ai-plugins</url>\\n<content>On Tuesday, Cursor launched their Marketplace for plugins, allowing you to easily integrate powerful adapters from other companies into Cursor’s industry-leading agent. When OpenAI launched their native Codex app a few weeks ago, it included a specific tab for Skills. Claude Cowork (and Code) launched with plugin integrations, enabling connections out of the box with dozens of apps.\\n...\\nconfig folder.The\\n...\\n, with OpenAI\\n...\\nskills repository and\\n...\\ncataloging 55\\n...\\ninstallable skills across categories like devtools,\\n...\\n### Cursor’s Plugin Marketplace\\n...\\nCursor launched their Marketplace this week, and it’s the most comprehensive plugin system of the three. A single Cursor plugin can bundle together any combination of MCP servers, skills, sub-agents, rules (persistent coding standards), and hooks (automation scripts triggered by events). It’s all packaged into distributable Git repositories that you can install at the project or user level.\\n...\\nThe initial launch includes curated plugins from partners like Stripe, Linear, Supabase, Figma, Amplitude, AWS, Vercel, Slack, Notion, Databricks, and Snowflake, spanning design, databases, payments, analytics, infrastructure, and deployment. You can browse and install them from cursor.com/marketplace or directly in the editor (just type`/add-plugin` in Cursor to get started).\\n...\\nOnce installed, you manage your plugins from Cursor Settings, where you can toggle individual rules between “Always,” “Agent Decides,” and “Manual” modes. Cursor also provides a plugin template for developers who want to build and publish their own. Private team marketplaces are coming for organizations that want to share plugins internally with governance and security controls.\\n...\\nCodex are directories containing\\n...\\n`SKILL.md` file with a name</content>\\n</result>\\n\\n<result id=\\\"5\\\">\\n<title>Plugins | Cursor Docs</title>\\n<url>https://cursor.com/docs/plugins</url>\\n<content>Plugins package rules, skills, agents, commands, MCP servers, and hooks into distributable bundles. Install and manage them from the Customize page or browse official plugins in the Cursor Marketplace. For community plugins and MCP servers, browse cursor.directory. You can also build your own to share with other developers.\\n...\\nThe Cursor Marketplace is where you discover and install official plugins. Plugins are distributed as Git repositories and submitted through the Cursor team. Every plugin is manually reviewed before it's listed. Browse official plugins at cursor.com/marketplace or search by keyword in Customize. For community plugins and MCP servers, browse cursor.directory.\\n...\\n- Open Customize in the sidebar\\n- Look for plugins from your team marketplace.\\n- Install Default Off plugins directly from that panel.\\n- Default On plugins are installed automatically, but developers can opt out.\\n- Required plugins are installed automatically and cannot be uninstalled.\\n- Install and configure marketplace MCP servers for use in the Agent Window, IDE, and CLI.\\n...\\nOpen Customize in the sidebar to manage plugins, MCP servers, rules\\n...\\nManage rules and skills from Customize. Toggle individual rules between Always, Agent Decides, and Manual modes. Skills appear in the Agent Decides section and can be invoked manually with `/skill-name` in chat.\\n...\\nA plugin is a directory with a `.cursor-plugin/plugin.json` manifest and your components (rules, skills, agents, commands, hooks, or MCP servers). Start from the plugin template repository or create one from scratch:\\n...\\nWhen your plugin is ready, submit it for review at cursor.com/marketplace/publish. For multi-plugin repositories, add a marketplace manifest at `.cursor-plugin/marketplace.json`.\\n...\\nCreate a directory with a `.cursor-plugin/plugin.json` manifest file, add your rules, skills, agents, commands, or other components, and submit it to the Cursor team. See the Plugins reference for the full guide.</content>\\n</result>\"}],\"isFinal\":true,\"rejected\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

The command creates a custom subagent using the anthropics/skills plugin.

This command belongs to Claude Code, not Cursor. Cursor uses `/add-plugin` to browse its marketplace. Anthropic skills are installed via the Claude Code marketplace, while Cursor subagents live in `.cursor/skills/`.

I'll create a project-level subagent named prd-business-analyst for the LingAnalytics PRD work. The user may be asking to run both commands, or may want a subagent tied to anthropics skills.

The user likely mixed up Claude Code and Cursor syntax. I'll inspect the anthropics/skills repository to see if any relevant content can be adapted for the subagent.
</details>

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"which cursor 2>/dev/null; cursor --help 2>&1 | head -40\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"which\",\"args\":[{\"type\":\"word\",\"value\":\"cursor\"}],\"fullText\":\"which cursor\"},{\"name\":\"cursor\",\"args\":[{\"type\":\"word\",\"value\":\"--help\"}],\"fullText\":\"cursor --help\"},{\"name\":\"head\",\"args\":[{\"type\":\"number\",\"value\":\"-40\"}],\"fullText\":\"head -40\"}],\"hasRedirects\":true,\"allRedirectsAreDevNull\":true,\"redirects\":[{\"operator\":\">\",\"destinationFds\":[2],\"targetNodeType\":\"word\",\"targetText\":\"/dev/null\"},{\"operator\":\">&\",\"destinationFds\":[2],\"targetNodeType\":\"number\",\"targetText\":\"1\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"检查 Cursor CLI 是否支持 add-plugin\"}",
  "result": "{\"output\":\"/Users/dezliu/.local/bin/cursor\\nError: No Cursor IDE installation found. Use 'cursor agent' or 'agent' to run the agent.\\nOr, install Cursor at https://cursor.com/download\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: web_fetch</summary>

```json
{
  "rawArgs": "{\"url\":\"https://github.com/anthropics/skills\",\"toolCallId\":\"tool_3ca2fa66-f487-4956-b148-526d0c79164\"}",
  "params": "{\"url\":\"https://github.com/anthropics/skills\"}",
  "result": "{\"url\":\"https://github.com/anthropics/skills\",\"markdown\":\"# anthropics/skills\\n\\nPublic repository for Agent Skills. Contribute to anthropics/skills development by creating an account on GitHub.\\n\\n⭐ 157,119 stars | 🍴 0 forks\\n\\n## Links\\n\\n- [Repository](https://github.com/anthropics/skills)\\n- [Issues](https://github.com/anthropics/skills/issues)\\n- [Pull Requests](https://github.com/anthropics/skills/pulls)\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

Creating a PRD BA subagent for LingAnalytics based on the conversation.

The subagent will follow the AGENTS.md delivery template. It will reference the existing PRD at docs/PRD_业务需求文档_v1.0.md. It will write PRDs without tech stack, API, or database details. It will know the three module structure. The anthropics skills plugin needs manual installation for Cursor.
</details>

正在创建与灵析 PRD 工作流匹配的项目级 subagent，并说明 `anthropics/skills` 在 Cursor 中的安装方式。

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"mkdir -p /Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/agents\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"mkdir\",\"args\":[{\"type\":\"word\",\"value\":\"-p\"},{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/agents\"}],\"fullText\":\"mkdir -p /Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/agents\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"创建 .cursor/agents 目录\"}",
  "result": "{\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/agents/prd-business-analyst.md\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.985f3d28c614d0df2fd6e3b2eb96e00dc067a02eba954ad8023e3631880a70e9\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

Addressing the command to add the anthropics/skills plugin to the marketplace.
</details>

## 已创建 Subagent

已在项目中新增项目级 subagent：

**路径**：[`/.cursor/agents/prd-business-analyst.md`](.cursor/agents/prd-business-analyst.md)

| 字段 | 内容 |
|------|------|
| **name** | `prd-business-analyst` |
| **定位** | 灵析智能数据透视平台 PRD / 业务需求分析专家 |
| **触发场景** | 撰写/修订 PRD、验收用例、流程图；涉及管理后台 8 域、用户对话平台、监控看板、Prompt/模板/语义检索/离线评估等 |

**使用方式**（在 Cursor 对话中）：

```
Use the prd-business-analyst subagent to 补充离线评估章节的验收用例
```

或：

```
让 prd-business-analyst 评审当前 PRD 第 4 章是否完整
```

该 agent 已内置：三模块边界、四段式需求格式、禁止写技术实现等约束，并与现有 [`docs/PRD_业务需求文档_v1.0.md`](docs/PRD_业务需求文档_v1.0.md) 对齐。

---

## 关于 `/add-plugin marketplace add anthropics/skills`

这条命令属于 **Claude Code** 的插件市场语法，**不能直接在 Cursor 中执行**。

| 环境 | 添加方式 |
|------|----------|
| **Claude Code** | `/plugin marketplace add anthropics/skills` |
| **Cursor** | 在对话或命令面板输入 **`/add-plugin`**，从 [Cursor Marketplace](https://cursor.com/marketplace) 浏览安装；或在侧边栏 **Customize** 中管理插件 |

若要在 Cursor 中使用 Anthropic 的 skills（如 document-skills），可手动将对应 `SKILL.md` 放到：

- 项目级：`.cursor/skills/`
- 用户级：`~/.cursor/skills/`

Cursor 会自动发现这些 skills。

---

如需我继续：可以把 `anthropics/skills` 里某类 skill（例如 document-skills）克隆到本项目的 `.cursor/skills/`，或再建一个不同职责的 subagent（如 `code-reviewer`、`data-admin-config`）。告诉我目标即可。
