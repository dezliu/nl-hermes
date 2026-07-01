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
- Docker & Docker Compose

### 一键启动（Docker 全栈）

```bash
cp .env.example .env
make up
make migrate
```

访问地址：

| 服务 | URL |
|------|-----|
| 用户平台 | http://localhost/ |
| 管理后台 | http://localhost/admin |
| 监控看板 | http://localhost/monitor |
| GraphQL | http://localhost/graphql |
| Gateway Health | http://localhost:4000/health |

### 本地开发模式

```bash
make install
make dev          # 启动 infra 容器 + pnpm dev 热重载
```

各服务端口：

| 服务 | 端口 |
|------|------|
| gateway-api | 4000 |
| orchestrator | 4010 |
| rag-service | 4020 |
| report-service | 4030 |
| eval-service | 4040 |
| metadata-service | 4050 |
| web-user | 3001 |
| web-admin | 3002 |
| web-monitor | 3003 |

### 常用命令

```bash
make help      # 查看所有命令
make build     # 构建
make test      # 测试
make lint      # 类型检查
make logs      # 容器日志
make down      # 停止
make clean     # 清理
```

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
```

## 文档

- [业务需求 PRD](docs/PRD_业务需求文档_v1.0.md)
- [AI 协作规范](AGENTS.md)
- [架构设计](plan/灵析系统架构设计_86078467.plan.md)

## License

Private — All rights reserved.
