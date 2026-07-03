# 灵析敏捷看板 — SQL Grounding 优化

> 最后更新：2026-07-03

## 进行中

| 任务 | 状态 | 说明 |
|------|------|------|
| fund_flow.gmt_create 校验失败修复 | ✅ 已完成 | schema 补全 + 别名识别 + 模板注入 |

## 本次交付（2026-07-03）

### 已完成

- [x] **Grounding**：识别 `SELECT ... AS alias`，`ORDER BY dt` 不再误报
- [x] **RAG 后补全**：对已命中表从 query-library 补全全部字段
- [x] **时间意图**：「近7天/环比/同比」时提高 metadata topK=12，并优先补 datetime 字段
- [x] **校验失败补全**：未知列时从 metadata 定向补全 schema 后重检
- [x] **模板匹配注入**：`templateMatches` 的 `sqlBody` 作为 few-shot 传给 LLM
- [x] **TemplateMatchResult** 增加 `sqlBody` 字段

### 涉及文件

- `packages/workflow/src/schema-enrichment.ts`（新增）
- `packages/workflow/src/grounding.ts`
- `packages/workflow/src/nodes.ts`
- `packages/contracts/src/index.ts`
- `apps/report-service/src/services/template-matcher.ts`
- `packages/llm-tools/src/clients.ts`

## 待验证

- [ ] 本地 `make seed` + RAG rebuild 后复测「近7天资金流水 + 环比同比」
- [ ] Docker 全栈重启后 orchestrator / report-service 行为一致

## 重启指引

### 本地开发（`make dev` / `pnpm dev`）

代码变更在 `@hermes/workflow`、`@hermes/contracts`、`report-service`，需重新编译并重启相关进程：

```bash
# 1. 编译依赖包
make build-deps

# 2. 停止当前 dev（Ctrl+C），再启动
make dev
# 或仅重启 orchestrator + report-service（若你用 turbo 分进程）
```

若 metadata / RAG 索引较旧（`gmt_create` 未入库），还需：

```bash
make seed          # 同步 query-library + 演示数据 + 向量索引
# 或仅重建 metadata 索引：
curl -X POST http://localhost:4020/v1/index/rebuild -H 'Content-Type: application/json' -d '{"collection":"metadata"}'
```

验证：`make health`

### Docker 全栈

```bash
make up-build      # 重建镜像并启动
# 或只重建后端：
DOCKER_BUILDKIT=1 docker compose --profile core up -d --build orchestrator report-service
```

首次或元数据变更后：

```bash
make seed
curl -X POST http://localhost:4020/v1/index/rebuild -H 'Content-Type: application/json' -d '{"collection":"metadata"}'
```
