# 灵析 (LingAnalytics) 自动化测试报告

> **执行时间**：2026-07-03 15:47 (UTC+8)  
> **执行命令**：`pnpm test`（Turbo 编排，Vitest 2.1.9）  
> **执行环境**：本地 macOS，Node ≥20，pnpm 9.15.0  
> **总耗时**：约 9.0 秒

---

## 1. 执行摘要

| 指标 | 数值 |
|------|------|
| 参与测试包 | 16 |
| 测试文件总数 | 52 |
| 用例总数 | **215** |
| 通过 | **215** |
| 失败 | **0** |
| 跳过 | **0** |
| **通过率** | **100%** |
| **失败率** | **0%** |
| Turbo 任务 | 23 successful / 23 total |

**结论**：全量自动化测试套件在当前环境下**全部通过**，无阻塞性失败。

---

## 2. 按包维度统计

| 包名 | 类型 | 测试文件 | 用例数 | 通过 | 失败 | 通过率 | 耗时（约） |
|------|------|----------|--------|------|------|--------|------------|
| `@hermes/contract-tests` | 契约 | 6 | 46 | 46 | 0 | 100% | 1.17s |
| `@hermes/shared` | 公共库 | 6 | 25 | 25 | 0 | 100% | 1.46s |
| `@hermes/workflow` | AI 编排 | 4 | 24 | 24 | 0 | 100% | 1.30s |
| `@hermes/metadata-service` | 后端服务 | 6 | 20 | 20 | 0 | 100% | 1.42s |
| `@hermes/orchestrator` | 后端服务 | 6 | 17 | 17 | 0 | 100% | 1.34s |
| `@hermes/llm-tools` | LLM 适配 | 5 | 17 | 17 | 0 | 100% | 1.73s |
| `@hermes/report-service` | 后端服务 | 4 | 14 | 14 | 0 | 100% | 1.79s |
| `@hermes/rag-service` | 后端服务 | 2 | 12 | 12 | 0 | 100% | 2.22s |
| `@hermes/observability` | 可观测性 | 3 | 11 | 11 | 0 | 100% | 1.54s |
| `@hermes/web-user` | 前端 | 1 | 8 | 8 | 0 | 100% | 0.99s |
| `@hermes/eval-service` | 评估服务 | 2 | 5 | 5 | 0 | 100% | 1.41s |
| `@hermes/performance` | 性能 SLA | 3 | 5 | 5 | 0 | 100% | 1.56s |
| `@hermes/gateway-api` | 网关 | 1 | 3 | 3 | 0 | 100% | 0.90s |
| `@hermes/web-monitor` | 前端 | 1 | 3 | 3 | 0 | 100% | 0.67s |
| `@hermes/report-mcp-adapter` | MCP | 1 | 3 | 3 | 0 | 100% | 1.53s |
| `@hermes/web-admin` | 前端 | 1 | 2 | 2 | 0 | 100% | 0.94s |

### 未含测试脚本的包（仅 build，无 test 任务）

| 包名 | 说明 |
|------|------|
| `@hermes/contracts` | GraphQL/类型契约定义，无独立单测 |
| `@hermes/ui-shared` | 共享 UI 壳层，无独立单测 |
| `@hermes/orm-schemas` | ORM Schema 定义，无独立单测 |

---

## 3. 按测试类型分类

### 3.1 单元测试（约 120 用例）

覆盖核心业务逻辑，不依赖外部服务：

| 领域 | 代表文件 | 用例数 | 结果 |
|------|----------|--------|------|
| SQL Grounding | `workflow/grounding.test.ts` | 11 | ✅ 全通过 |
| Schema 增强 | `workflow/schema-enrichment.test.ts` | 4 | ✅ |
| RAG 工具 | `workflow/rag-utils.test.ts` | 4 | ✅ |
| 工作流图 | `workflow/graph.test.ts` | 5 | ✅ |
| SQL 工具 | `report-service/sql-utils.test.ts` | 3 | ✅ |
| 图表合成 | `report-service/chart-composer.test.ts` | 3 | ✅ |
| 认证/CORS | `shared/auth.test.ts`, `cors.test.ts` | 9 | ✅ |
| LLM 工厂/配置 | `llm-tools/*.test.ts` | 17 | ✅ |
| 模板工具 | `orchestrator/template-utils.test.ts` | 4 | ✅ |
| 候选资格 | `orchestrator/candidate-eligibility.test.ts` | 4 | ✅ |
| 加密/指标存储 | `metadata-service/crypto.test.ts` 等 | 4 | ✅ |
| Prompt 脱敏 | `observability/sanitize-prompt.test.ts` | 3 | ✅ |

### 3.2 API / 集成测试（约 53 用例）

通过 Supertest 启动 Express 应用，验证 HTTP 路由与中间件：

| 服务 | 用例数 | 覆盖要点 | 结果 |
|------|--------|----------|------|
| orchestrator | 5 | health、SSE 流、并发拒绝、会话 CRUD、反馈 | ✅ |
| report-service | 3 + 5 | health、模板匹配、SQL 校验/执行、Word 渲染 | ✅ |
| rag-service | 3 + 9 | health、retrieve、score | ✅ |
| metadata-service | 3 + 3 | health、数据源、监控看板、告警 | ✅ |
| eval-service | 3 + 2 | health、评估集 CRUD、用例执行 | ✅ |
| gateway-api | 3 | 网关路由 | ✅ |

### 3.3 跨服务契约测试（46 用例）

`@hermes/contract-tests` 验证各服务 API 响应结构与错误码约定：

| 契约文件 | 用例数 | 结果 |
|----------|--------|------|
| `workflow.contract.test.ts` | 27 | ✅ |
| `orchestrator.contract.test.ts` | 4 | ✅ |
| `metadata.contract.test.ts` | 5 | ✅ |
| `report.contract.test.ts` | 4 | ✅ |
| `rag.contract.test.ts` | 3 | ✅ |
| `eval.contract.test.ts` | 3 | ✅ |

### 3.4 性能 SLA 验收（5 用例）

| 测试 | SLA 目标 | 实测 | 结果 |
|------|----------|------|------|
| RAG retrieve | ≤ 5s（stub 模式） | ~77ms | ✅ |
| RAG score | ≤ 5s（stub 模式） | ~20ms | ✅ |
| 首阶段事件（first-token） | ≤ 3s | ~524–559ms | ✅ |
| 评估吞吐 | 预算内完成 | — | ✅ (2) |

### 3.5 前端结构测试（13 用例）

| 应用 | 用例数 | 验证内容 | 结果 |
|------|--------|----------|------|
| web-user | 8 | 页面结构、导航、聊天区元素 | ✅ |
| web-monitor | 3 | KPI 卡片、监控面板结构 | ✅ |
| web-admin | 2 | 管理后台首页结构 | ✅ |

### 3.6 MCP 适配器（3 用例）

| 测试 | 结果 |
|------|------|
| JSON-RPC tools/list | ✅ |
| MCP 请求处理 | ✅ |

---

## 4. 失败用例明细

**无。** 本次执行 0 失败、0 跳过。

---

## 5. 运行期观察（非失败，需关注）

以下日志出现在 stderr/stdout，但**对应用例断言均通过**：

| 现象 | 出现位置 | 说明 | 风险 |
|------|----------|------|------|
| `[llm] healthcheck failed provider=zhipu: fetch failed` | orchestrator、performance、contract-tests | 沙箱/离线环境无法访问智谱 API，自动 fallback 到 mock LLM | 低 — 测试设计允许 mock |
| `[llm] classifyIntent/generateSql fallback to mock` | 同上 | 意图分类与 SQL 生成走 mock 路径 | 低 |
| `report.render.word.worker_unavailable` | artifact-renderer.test.ts | **故意**测试 render-worker 不可用时的错误处理 | 无 — 预期行为 |
| `eval_cases.expected_tables` JSON 插入错误 | eval.contract.test.ts | 契约测试中 eval case 创建返回 500，用例以条件跳过/容错通过 | 中 — 见 §6 |
| Vite CJS Node API deprecated 警告 | observability、performance 等 | 工具链弃用提示，不影响结果 | 低 |

---

## 6. 已知缺口与未覆盖项

| 类别 | 状态 | 说明 |
|------|------|------|
| E2E 浏览器测试 | ❌ 未纳入 | 无 Playwright/Cypress 套件 |
| 真实 LLM 联调 | ⚠️ 未验证 | 测试环境 fallback mock，未验证智谱/OpenAI 真实响应 |
| Word 渲染端到端 | ⚠️ 部分 | 有 mock worker 路径；真实 render-worker (4060) 需 Docker 手动验证 |
| GraphQL gateway 深度契约 | ⚠️ 浅覆盖 | gateway-api 仅 3 用例 |
| ui-shared 组件 | ❌ 无单测 | 三端样式对齐后尚未补组件级测试 |
| 离线评估全链路 | ⚠️ 部分 | eval run 契约在 DB JSON 字段异常时走降级路径 |
| progress-board 待验证项 | ⏳ 待人工 | `make seed` + RAG rebuild 后业务场景复测 |

---

## 7. 覆盖率说明

当前项目**未配置** Vitest/Istanbul 代码覆盖率阈值（`coverage` 未在 CI 中强制）。本报告基于**用例执行结果**统计，非行覆盖率报告。

如需覆盖率，可执行：

```bash
# 示例：单包开启 coverage（需在 vitest.config 中配置）
pnpm --filter @hermes/workflow exec vitest run --coverage
```

---

## 8. 复现与分项执行

```bash
# 全量
make test          # 或 pnpm test

# Phase 9 质量验收子集
make test-phase9   # observability + contract + performance + mcp

# 仅契约
make test-contract

# 仅性能 SLA
make test-perf
```

---

## 9. 结论与建议

1. **当前质量门禁**：215/215 通过，**可视为 CI 绿灯状态**。
2. **优先跟进**：`eval_cases.expected_tables` 字段 JSON 序列化问题（契约测试日志已暴露，建议修复 ORM 层写入格式）。
3. **发布前建议**：在 Docker 全栈 + 真实 LLM Key 环境下做一次冒烟（`make health` + 用户对话 + Word 报表下载）。
4. **样式迭代后**：为三端 `page.test.ts` 与 `ui-shared` 补充回归用例，防止 mockup 对齐回退。

---

*报告由 `pnpm test` 输出自动汇总生成。*
