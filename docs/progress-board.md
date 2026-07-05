# 灵析敏捷看板

> 最后更新：2026-07-05 14:00

## 进行中

| 任务 | 状态 | 说明 |
|------|------|------|
| — | — | — |

## 本次交付（2026-07-05 · README 数据大屏说明）

### 已完成

- [x] **项目简介**：补充「全屏数据大屏（可分享、可编辑布局）」
- [x] **后端服务**：gateway-api / report-service / orchestrator 大屏相关职责与路由
- [x] **工作流**：dashboard 分支流程图与 AnalyzeReport / ComposeSpec / RenderArtifact 说明
- [x] **前端**：web-user 数据大屏输出格式、DashboardViewer、全屏与编辑路由
- [x] **共享包**：contracts `DashboardLayoutSpec`、report-mcp-adapter 大屏 MCP 工具
- [x] **文档链接**：README 与 `docs/plans/README.md` 增加大屏设计 plan 索引
- [x] **演示**：预留 Dashboard 小节（截图待补充）

### 涉及文件

- `README.md`
- `docs/plans/README.md`
- `docs/progress-board.md`（本看板）

## 历史（2026-07-05 · 大屏访问修复）

### 已完成

- [x] **根因定位**：全屏/编辑页直连 report-service 缺 `x-service-token` → 401；分享时 orchestrator `repo.save` 重复 INSERT → Duplicate entry
- [x] **Gateway**：新增 `GET /api/reports/:id?userId=` 代理 orchestrator
- [x] **前端**：`/dashboard/[id]` 与 `/dashboard/[id]/edit` 改走 Gateway
- [x] **预览回退**：Gateway preview/download 在 report-service 内存未命中时，从 orchestrator 拉 spec 并 re-render

### 待验证

- [x] 全屏查看、编辑布局、分享链接、预览网页

## 历史（2026-07-04 · 数据大屏生成）

### 已完成

- [x] **契约扩展**：`DashboardLayoutSpec` / `DashboardPanelSpec`，`outputFormat=dashboard`
- [x] **LLM**：`analyzeDashboardLayout` + workflow `analyzeReportNode` / `composeSpecNode` 分支
- [x] **渲染**：`dashboard-web.ts` 全屏 HTML + `artifact-renderer` dashboard 分支
- [x] **分享刷新**：分享时为 chart/kpi panel 注册 `published_queries`
- [x] **MCP**：`compose_dashboard_layout` / `render_dashboard` / `update_dashboard_layout` / `execute_panel_query`
- [x] **前端**：`DashboardViewer`、对话内「数据大屏」选项、`/dashboard/[id]` 全屏、`/dashboard/[id]/edit` 编辑器
- [x] **API**：`PATCH /api/dashboards/:id/layout`（gateway → orchestrator → report-service）
- [x] **测试**：layout 校验 5 例、workflow dashboard 节点 2 例、MCP tools 8 个

### 涉及文件

- `packages/contracts/src/index.ts`、`dashboard-layout.ts`
- `packages/llm-tools/src/llm/types.ts`、`mock-provider.ts`、`openai-style-provider.ts`、`registry.ts`、`clients.ts`
- `packages/workflow/src/nodes.ts`、`state.ts`、`dashboard.test.ts`
- `apps/report-service/src/templates/dashboard-web.ts`、`artifact-renderer.ts`、`routes/index.ts`
- `apps/orchestrator/src/routes/report-routes.ts`、`repositories/report-artifact-repository.ts`
- `apps/gateway-api/src/index.ts`
- `apps/web-user/components/DashboardViewer.tsx`、`ReportViewer.tsx`、`app/page.tsx`
- `apps/web-user/app/dashboard/[id]/page.tsx`、`app/dashboard/[id]/edit/page.tsx`
- `packages/report-mcp-adapter/src/mcp-handler.ts`、`report-client.ts`
- `migrations/chat/migrations/20260704000001_dashboard_output_format.ts`

### 待验证

- [ ] 本地 `make dev` 后选择「数据大屏」生成并全屏预览
- [ ] 分享链接公开访问 + panel 自动刷新
- [ ] 编辑器拖拽保存后布局持久化

## 历史交付（2026-07-03 · README 模块梳理）

### 已完成

- [x] **架构依赖图**：Mermaid 流程图（前端 → gateway → 微服务 → 基础设施）
- [x] **后端服务表**：7 个 apps 职责、端口、主要 REST 路由
- [x] **工作流节点**：LangGraph 流水线与各节点说明
- [x] **共享包**：补全 observability / performance / report-mcp-adapter / contract-tests
- [x] **数据库**：三 schema（meta / chat / eval）与主要表清单
- [x] **目录速览**：含 render-worker、migrations、docker

### 涉及文件

- `README.md`（「模块说明」章节重写）
- `docs/progress-board.md`（本看板）

## 本次交付（2026-07-03 · 测试报告）

### 已完成

- [x] **全量测试执行**：`TURBO_FORCE=true pnpm test`，16 包 / 52 文件 / 215 用例
- [x] **测试报告**：根目录 `test_report.md`（含按包、按文件统计与模拟数据说明）
- [x] **结果**：通过 215 / 失败 0 / 跳过 0 / 错误 0，成功率 100%

### 涉及文件

- `test_report.md`（新增）
- `docs/progress-board.md`（本看板）

## 本次交付（2026-07-03 · 页面样式）

### 已完成

- [x] **共享主题**：`packages/ui-shared/src/theme.css` — Admin 浅色侧栏、用户端暖橙、监控深色三主题
- [x] **AppShell 变体**：`admin` / `user` / `monitor`，移除通用顶栏，各端独立壳层
- [x] **管理后台**：品牌区、分组导航、激活指示条、顶栏面包屑、首页卡片网格
- [x] **监控看板**：深色 KPI 卡片、告警横幅、品牌 Header、折线图面板
- [x] **用户对话**：顶部导航、历史侧栏、聊天气泡、输入区与 mockup 结构一致

### 涉及文件

- `packages/ui-shared/src/theme.css`、`app-shell.tsx`
- `apps/web-admin/components/AdminLayout.tsx`、`lib/admin-nav.ts`、`app/layout.tsx`、`app/page.tsx`
- `apps/web-monitor/app/page.tsx`、`app/layout.tsx`
- `apps/web-user/app/page.tsx`、`app/layout.tsx`、`app/antd-provider.tsx`

## 历史交付（2026-07-03 · Word 报表）

### 已完成

- [x] **Word 真 DOCX 生成**：移除纯文本 fallback，必须走 Python render-worker
- [x] **图表嵌入**：matplotlib 生成 PNG 写入 Word（line/bar/pie）
- [x] **中文字体**：Docker 镜像安装 `fonts-noto-cjk`
- [x] **dev 栈**：`docker-compose.dev.yml` + `make render-worker` / `make infra` 含 4060
- [x] **前端**：渲染失败时禁用下载并展示错误

### 涉及文件

- `apps/render-worker/main.py`
- `apps/report-service/src/services/artifact-renderer.ts`
- `apps/web-user/components/ReportViewer.tsx`
- `docker-compose.dev.yml`, `docker-compose.yml`, `Makefile`, `.env.example`

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
