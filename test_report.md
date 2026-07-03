# 灵析 (LingAnalytics) 全量自动化测试报告

> **生成时间**：2026-07-03 15:53 (UTC+8)  
> **执行命令**：`TURBO_FORCE=true pnpm test`（Turbo 编排，Vitest 2.1.9）  
> **执行环境**：本地 macOS (darwin 25.5.0)，Node ≥20，pnpm 9.15.0  
> **数据来源**：测试用例内嵌 Mock / Stub 模拟数据（无真实 MySQL、Qdrant、LLM 外部依赖）  
> **总执行时间**：**8.19 秒**（wall clock，`/usr/bin/time -p`）

---

## 1. 总体统计

| 指标 | 数值 |
|------|------|
| 参与测试包 | 16 |
| 测试文件总数 | 52 |
| **总测试用例数** | **215** |
| **通过** | **215** |
| **失败** | **0** |
| **跳过** | **0** |
| **错误** | **0** |
| **成功率**（通过 / 总数） | **100.00%** |
| **失败率**（失败 / 总数） | **0.00%** |
| Turbo 任务 | 23 successful / 23 total |

**结论**：当前实现的全部自动化测试用例均通过，无阻塞性失败。

---

## 2. 按包 / 模块统计

| 包名 | 类型 | 测试文件 | 用例数 | 通过 | 失败 | 跳过 | 错误 | 成功率 | 耗时 |
|------|------|----------|--------|------|------|------|------|--------|------|
| `@hermes/contract-tests` | 契约 | 6 | 46 | 46 | 0 | 0 | 0 | 100% | 1.17s |
| `@hermes/shared` | 公共库 | 6 | 25 | 25 | 0 | 0 | 0 | 100% | 1.22s |
| `@hermes/workflow` | AI 编排 | 4 | 24 | 24 | 0 | 0 | 0 | 100% | 1.24s |
| `@hermes/metadata-service` | 后端服务 | 6 | 20 | 20 | 0 | 0 | 0 | 100% | 1.70s |
| `@hermes/orchestrator` | 后端服务 | 6 | 17 | 17 | 0 | 0 | 0 | 100% | 1.20s |
| `@hermes/llm-tools` | LLM 适配 | 5 | 17 | 17 | 0 | 0 | 0 | 100% | 1.31s |
| `@hermes/report-service` | 后端服务 | 4 | 14 | 14 | 0 | 0 | 0 | 100% | 1.57s |
| `@hermes/rag-service` | 后端服务 | 2 | 12 | 12 | 0 | 0 | 0 | 100% | 1.72s |
| `@hermes/observability` | 可观测性 | 3 | 11 | 11 | 0 | 0 | 0 | 100% | 1.01s |
| `@hermes/web-user` | 前端 | 1 | 8 | 8 | 0 | 0 | 0 | 100% | 0.90s |
| `@hermes/eval-service` | 评估服务 | 2 | 5 | 5 | 0 | 0 | 0 | 100% | 1.71s |
| `@hermes/performance` | 性能 SLA | 3 | 5 | 5 | 0 | 0 | 0 | 100% | 2.08s |
| `@hermes/gateway-api` | 网关 | 1 | 3 | 3 | 0 | 0 | 0 | 100% | 0.88s |
| `@hermes/web-monitor` | 前端 | 1 | 3 | 3 | 0 | 0 | 0 | 100% | 0.85s |
| `@hermes/report-mcp-adapter` | MCP | 1 | 3 | 3 | 0 | 0 | 0 | 100% | 0.95s |
| `@hermes/web-admin` | 前端 | 1 | 2 | 2 | 0 | 0 | 0 | 100% | 0.86s |

### 未含测试脚本的包（仅 build，无 test 任务）

| 包名 | 说明 |
|------|------|
| `@hermes/contracts` | GraphQL / 类型契约定义 |
| `@hermes/ui-shared` | 共享 UI 壳层 |
| `@hermes/orm-schemas` | ORM Schema 定义 |

---

## 3. 按测试文件统计

| 测试文件 | 用例数 | 通过 | 失败 | 跳过 | 错误 | 状态 |
|----------|--------|------|------|------|------|------|
| `packages/contract-tests/src/workflow.contract.test.ts` | 27 | 27 | 0 | 0 | 0 | ✅ |
| `apps/rag-service/src/index.test.ts` | 9 | 9 | 0 | 0 | 0 | ✅ |
| `apps/web-user/app/page.test.ts` | 8 | 8 | 0 | 0 | 0 | ✅ |
| `packages/shared/src/auth.test.ts` | 7 | 7 | 0 | 0 | 0 | ✅ |
| `apps/metadata-service/src/services/datasource-service.test.ts` | 6 | 6 | 0 | 0 | 0 | ✅ |
| `packages/llm-tools/src/llm/factory.test.ts` | 6 | 6 | 0 | 0 | 0 | ✅ |
| `packages/shared/src/schema-context.test.ts` | 5 | 5 | 0 | 0 | 0 | ✅ |
| `apps/report-service/src/services/artifact-renderer.test.ts` | 5 | 5 | 0 | 0 | 0 | ✅ |
| `apps/orchestrator/src/index.test.ts` | 5 | 5 | 0 | 0 | 0 | ✅ |
| `packages/workflow/src/graph.test.ts` | 5 | 5 | 0 | 0 | 0 | ✅ |
| `packages/contract-tests/src/metadata.contract.test.ts` | 5 | 5 | 0 | 0 | 0 | ✅ |
| `packages/workflow/src/grounding.test.ts` | 11 | 11 | 0 | 0 | 0 | ✅ |
| `packages/observability/src/performance-budgets.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/llm-tools/src/llm/config.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/llm-tools/src/clients.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/workflow/src/rag-utils.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/workflow/src/schema-enrichment.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/observability/src/langfuse-client.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/contract-tests/src/report.contract.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `apps/orchestrator/src/lib/template-utils.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `apps/orchestrator/src/lib/candidate-eligibility.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/shared/src/logger.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/shared/src/server.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `apps/metadata-service/src/services/closed-loop-service.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/contract-tests/src/orchestrator.contract.test.ts` | 4 | 4 | 0 | 0 | 0 | ✅ |
| `packages/contract-tests/src/rag.contract.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `packages/contract-tests/src/eval.contract.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `packages/shared/src/trace.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/web-monitor/app/page.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/gateway-api/src/index.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/report-service/src/lib/sql-utils.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/report-service/src/services/chart-composer.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/report-service/src/index.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `packages/observability/src/sanitize-prompt.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/rag-service/src/routes.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/metadata-service/src/lib/metrics-store.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/metadata-service/src/index.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/metadata-service/src/routes/monitor-routes.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `apps/eval-service/src/index.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `packages/report-mcp-adapter/src/mcp-handler.test.ts` | 3 | 3 | 0 | 0 | 0 | ✅ |
| `packages/shared/src/cors.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `packages/llm-tools/src/registry.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `apps/orchestrator/src/services/feedback-service.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `apps/eval-service/src/services/eval-case-runner.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `packages/performance/src/eval-throughput.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `packages/performance/src/rag-latency.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `apps/web-admin/app/page.test.ts` | 2 | 2 | 0 | 0 | 0 | ✅ |
| `packages/llm-tools/src/llm/openai-compatible-client.test.ts` | 1 | 1 | 0 | 0 | 0 | ✅ |
| `apps/orchestrator/src/services/template-apply-service.test.ts` | 1 | 1 | 0 | 0 | 0 | ✅ |
| `apps/orchestrator/src/services/conversation-service.test.ts` | 1 | 1 | 0 | 0 | 0 | ✅ |
| `apps/metadata-service/src/lib/crypto.test.ts` | 1 | 1 | 0 | 0 | 0 | ✅ |
| `packages/performance/src/first-token.test.ts` | 1 | 1 | 0 | 0 | 0 | ✅ |

---

## 4. 失败用例明细

> 本次执行无失败、跳过或错误用例。

| 用例名称 | 所属文件 | 错误摘要 |
|----------|----------|----------|
| — | — | — |

---

## 5. 模拟数据说明

本次测试**不依赖** `scripts/seed-settle.ts` 写入的真实 MySQL / Qdrant 数据，各模块在测试内使用脚本级 Mock / Stub：

| 领域 | 模拟方式 | 代表测试 |
|------|----------|----------|
| RAG 检索 | 内存 Stub 向量 + BM25 模拟 | `rag-service/routes.test.ts`、`performance/rag-latency.test.ts` |
| LLM 调用 | 网络不可达时自动 fallback 到 Mock 响应 | `orchestrator/index.test.ts`、`performance/first-token.test.ts` |
| 监控指标 | `metrics-store` 内置 `seedDemoIfEmpty()` | `metadata-service/metrics-store.test.ts` |
| 会话 / 反馈 | 内存 Map 存储 | `orchestrator/index.test.ts` |
| Word 渲染 | Mock render-worker HTTP 或预期 ECONNREFUSED | `report-service/artifact-renderer.test.ts` |
| 评估用例 | 内存 runner，DB 不可用时跳过写库断言 | `eval-service/eval-case-runner.test.ts` |

---

## 6. 运行期告警（非失败）

以下日志为**预期行为**，不影响测试结果：

| 场景 | 日志摘要 | 说明 |
|------|----------|------|
| LLM 健康检查 | `[llm] healthcheck failed provider=zhipu: fetch failed` | 沙箱无外网，自动降级 Mock |
| Word 渲染不可用 | `report.render.word.worker_unavailable` | 测试验证错误路径，render-worker 未启动 |
| Grounding 拒绝 | `workflow.grounding.failed unknown=["phantom_table"]` | 契约测试故意传入不存在表名 |
| Eval JSON 字段 | `Invalid JSON text ... expected_tables` | 契约测试在 DB 可用时探测边界，用例仍通过 |

---

## 7. 失败率分析

**失败率 0.00% < 10%**，无需触发额外根因分析与修复建议。

---

## 8. 验证命令

```bash
# 全量测试（绕过 Turbo 缓存）
TURBO_FORCE=true pnpm test

# 仅契约测试
pnpm test:contract

# 仅性能 SLA 测试
pnpm test:perf
```
