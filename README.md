# 灵析 (LingAnalytics) / Hermes

智能数据透视平台 — 用户通过自然语言提问，系统生成 SQL 或可视化报表。

## 架构概览

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  web-user   │  │  web-admin  │  │ web-monitor │
│   :3001     │  │   :3002     │  │   :3003     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       └────────────────┼────────────────┘
                        │ Nginx :80
              ┌─────────▼─────────┐
              │   gateway-api     │  Apollo GraphQL :4000
              └─────────┬─────────┘
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
 metadata-service  orchestrator    eval-service
     :4050             :4010           :4040
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         rag-service  report-service  Redis
           :4020        :4030
```

## 技术栈

| 领域 | 技术 |
|------|------|
| 前端 | Next.js 14, React 18, Ant Design, Apollo Client |
| API | Apollo Server 4 (GraphQL) |
| ORM | Objection.js + Knex, MySQL 8 |
| 缓存 | Redis 7 |
| 向量 | Qdrant |
| BM25 | OpenSearch 2.x |
| AI 编排 | LangChain + LangGraph |
| 监控 | Langfuse |
| 部署 | Docker Compose + Nginx |

## 快速开始

### 前置要求

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose（`make dev` 需 Docker 守护进程已启动）

---

### 第一次拉取代码（推荐：本地开发）

克隆仓库后，按顺序执行以下步骤。**首次 `make dev` 通常需 5～15 分钟**（拉镜像、构建 render-worker、导入演示数据与向量索引）；之后日常启动约 1～2 分钟。

```bash
# 1. 克隆并进入项目
git clone <repo-url> nl-hermes
cd nl-hermes

# 2. 环境变量（make dev 也会自动 cp，建议首次手动确认）
cp .env.example .env

# 3. 安装 Node 依赖（必须，make dev 不会自动执行）
make install

# 4. 一键启动：Docker 基础设施 + 数据库迁移 + 首次 Seed + 全部应用热重载
make dev
```

**`make dev` 会自动完成：**

| 步骤 | 说明 |
|------|------|
| `infra` | Docker 启动 MySQL、Redis、Qdrant、OpenSearch、**render-worker**（Word 报表） |
| `build-deps` | 编译 workspace 公共包 |
| `seed-if-needed` | 首次执行 DB 迁移 + 结算演示数据 Seed（写入 `.hermes/settle-seed.done` 后跳过） |
| `pnpm dev` | 并行启动 gateway / orchestrator / rag / report / metadata / eval / 三个前端 |

**首次 Seed 完成后**，终端会打印数据源 ID，请写入 `.env`：

```env
DEFAULT_DATASOURCE_ID=<seed 输出的 uuid>
```

**（可选）配置真实 LLM**：未配置 API Key 时使用 Mock LLM，流程可跑通但非真实模型。示例：

```env
LLM_PROVIDER=zhipu
ZHIPU_API_KEY=your-key
```

**国内网络首次拉镜像较慢时**，可使用：

```bash
make infra-cn   # 启用镜像加速并启动基础设施，然后再 make dev
```

**验证服务是否就绪**（另开终端）：

```bash
make health
```

**本地开发访问地址**（`make dev`，直连各服务端口）：

| 服务 | URL |
|------|-----|
| 用户平台 | http://localhost:3001 |
| 管理后台 | http://localhost:3002/admin |
| 监控看板 | http://localhost:3003 |
| GraphQL / 流式 API | http://localhost:4000/graphql |
| Gateway Health | http://localhost:4000/health |
| Word 渲染 worker | http://localhost:4060/health |

**常见问题（首次运行）：**

- **`pnpm: command not found`** → 安装 pnpm 9+，或 `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- **Docker 未启动** → 先启动 Docker Desktop / OrbStack，再执行 `make dev`
- **Seed 索引失败** → 确认 Qdrant/OpenSearch 已 healthy：`docker compose -f docker-compose.dev.yml ps`
- **端口被占用** → 勿与 `make up`（Docker 全栈）同时运行；可先 `make down` 释放端口
- **Word 无法打开** → 确认 `curl http://localhost:4060/health` 返回 `{"status":"ok"}`；失败时执行 `make render-worker`

---

### 日常开发（非首次）

依赖与演示数据已就绪时，只需：

```bash
make dev
```

如需强制重导演示数据：

```bash
make seed              # 强制全量重跑 Seed
pnpm seed:settle --keep-db --force   # 保留 hermes_settle 库，仅重跑元数据与索引
```

---

### Docker 全栈部署（生产/演示环境）

适合不依赖宿主机热重载、通过 Nginx 统一入口访问：

```bash
cp .env.example .env
make pull-images   # 首次执行，预拉基础镜像
make up-build      # 首次或 Dockerfile 变更后：构建并启动
make up            # 日常启动：不重建镜像
```

**按需启动 Docker 后端（不含前端 / Nginx）：**

```bash
make stack-core    # gateway + orchestrator + rag + report + render-worker
```

**Docker 全栈访问地址**（经 Nginx :80）：

| 服务 | URL |
|------|-----|
| 用户平台 | http://localhost/ |
| 管理后台 | http://localhost/admin |
| 监控看板 | http://localhost/monitor |
| GraphQL | http://localhost/graphql |
| Gateway Health | http://localhost:4000/health |

---

### 各服务端口一览

| 服务 | 端口 |
|------|------|
| gateway-api | 4000 |
| orchestrator | 4010 |
| rag-service | 4020 |
| report-service | 4030 |
| eval-service | 4040 |
| metadata-service | 4050 |
| render-worker（Word/图表） | 4060 |
| web-user | 3001 |
| web-admin | 3002 |
| web-monitor | 3003 |
| MySQL（宿主机连库） | 3307 |

### 常用命令

```bash
make help          # 查看所有命令
make migrate       # 执行 Hermes 元数据/会话/评估库迁移
make seed          # 强制导入结算演示数据
make render-worker # 仅启动 Word 渲染服务（4060）
make build         # 构建
make test          # 测试
make lint          # 类型检查
make logs          # 容器日志
make down          # 停止 Docker 全栈
make clean         # 清理（含 settle seed 标记与 Docker 卷）
```

### 结算演示数据 Seed

脚本位于 [`scripts/seed-settle.ts`](scripts/seed-settle.ts)，配套 SQL 与配置在 `scripts/settle/`。

| 命令 | 说明 |
|------|------|
| `make dev` | 首次自动执行 Seed（`--if-needed`） |
| `make seed` | 强制全量导入 |
| `pnpm seed:settle:if-needed` | 仅未执行过时导入 |
| `pnpm seed:settle --force` | 强制全量导入 |
| `pnpm seed:settle --keep-db` | 跳过 MySQL 重建，仅同步元数据与索引 |
| `pnpm seed:settle --skip-index` | 跳过 Qdrant/OpenSearch 索引 |

Seed 完成后会创建：

- MySQL 库 `hermes_settle`（18 张结算核心表 + 模拟数据）
- Hermes 数据源「结算演示库」及元数据同步
- 查询库字段、业务知识条目
- Qdrant 集合 `hermes_metadata`、`hermes_business` 向量索引

执行标记：`.hermes/settle-seed.done`（本地文件，已 gitignore）。`make clean` 会删除该标记。

## 项目结构

```
apps/
  gateway-api/        # GraphQL 网关
  metadata-service/   # 元数据/Prompt/模板
  orchestrator/       # LangGraph 工作流
  rag-service/        # BM25 + 向量检索
  report-service/     # 报表生成
  eval-service/       # 离线评估
  web-user/           # 用户前端
  web-admin/          # 管理后台
  web-monitor/        # 监控看板
packages/
  shared/             # 公共类型/工具
  contracts/          # 服务间契约
  llm-tools/          # LangChain Tool 定义
  workflow/           # 工作流节点/状态
  orm-schemas/        # ORM 模型
  ui-shared/          # 前端共享组件
scripts/
  seed-settle.ts      # 结算演示数据一键 Seed
  settle/             # Seed SQL、查询库与业务知识配置
```

## 文档

- [业务需求 PRD](docs/PRD_业务需求文档_v1.0.md)
- [AI 协作规范](AGENTS.md)
- [架构设计](plan/灵析系统架构设计_86078467.plan.md)

## License

Private — All rights reserved.
