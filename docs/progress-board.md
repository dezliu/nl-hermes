# 灵析敏捷看板 — SQL Grounding 优化

> 最后更新：2026-07-03 15:53

## 进行中

| 任务 | 状态 | 说明 |
|------|------|------|
| 全量自动化测试报告 | ✅ 已完成 | `test_report.md` — 215 用例全通过，耗时 8.19s |
| 三端页面样式对齐 mockup | ✅ 已完成 | Admin / 监控 / 用户端视觉与 docs/mockup 对齐 |

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
