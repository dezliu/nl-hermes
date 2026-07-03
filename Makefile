.PHONY: help up up-build stack-core pull-images infra infra-cn down build build-deps migrate seed seed-if-needed dev test lint logs clean install mysql-up health mirror-daemon

# 国内镜像：.env 中 USE_CN_MIRROR=1 时自动加载 docker/mirrors.cn.env
-include .env
CN_ENV :=
ifeq ($(USE_CN_MIRROR),1)
  CN_ENV := --env-file docker/mirrors.cn.env
endif
COMPOSE := docker compose --env-file .env $(CN_ENV)
COMPOSE_DEV := docker compose -f docker-compose.dev.yml --env-file .env $(CN_ENV)

help: ## 显示帮助
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	pnpm install

pull-images: ## 预拉取基础镜像（首次部署前执行一次）
	$(COMPOSE_DEV) pull

infra: ## 仅启动基础设施 (MySQL/Redis/Qdrant/OpenSearch) — 最快，配合 make dev
	@test -f .env || cp .env.example .env
	$(COMPOSE_DEV) up -d --wait

infra-cn: ## 启用国内镜像并启动基础设施（首次推荐）
	@test -f .env || cp .env.example .env
	@grep -q '^USE_CN_MIRROR=' .env 2>/dev/null || echo 'USE_CN_MIRROR=1' >> .env
	@sed -i '' 's/^USE_CN_MIRROR=.*/USE_CN_MIRROR=1/' .env 2>/dev/null || sed -i 's/^USE_CN_MIRROR=.*/USE_CN_MIRROR=1/' .env
	$(MAKE) mirror-daemon
	$(MAKE) pull-images
	$(COMPOSE_DEV) up -d --wait

mirror-daemon: ## 配置 Docker 守护进程国内镜像（OrbStack / Docker Desktop，up-build 前必做）
	@mkdir -p $$HOME/.orbstack/config/docker $$HOME/.docker
	@cp docker/daemon.json.example $$HOME/.orbstack/config/docker/daemon.json 2>/dev/null || cp docker/daemon.json.example $$HOME/.docker/daemon.json
	@echo "已写入 registry-mirrors → 请重启 Docker / OrbStack 后再 make up-build"

stack-core: ## Docker 仅后端核心（不含前端/nginx/render-worker），不重建镜像
	@test -f .env || cp .env.example .env
	DOCKER_BUILDKIT=1 $(COMPOSE) --profile core up -d

up: ## 启动全栈（不重建镜像，日常最快）
	@test -f .env || cp .env.example .env
	DOCKER_BUILDKIT=1 $(COMPOSE) --profile full up -d

up-build: ## 重建并启动全栈（代码或 Dockerfile 变更后）
	@test -f .env || cp .env.example .env
	DOCKER_BUILDKIT=1 $(COMPOSE) --profile full up -d --build

down: ## 停止并移除容器
	$(COMPOSE) --profile full down

build: ## 构建全部服务
	pnpm build

build-deps: ## 构建 migrate/seed/dev 所需的 workspace 包
	@find packages -name '*.tsbuildinfo' -delete 2>/dev/null || true
	pnpm --filter @hermes/contracts build \
	  && pnpm --filter @hermes/shared build \
	  && pnpm --filter @hermes/llm-tools build \
	  && pnpm --filter @hermes/workflow build \
	  && pnpm --filter @hermes/orm-schemas build

mysql-up: ## 仅启动 MySQL（供 migrate 使用，等待 healthcheck 通过）
	$(COMPOSE_DEV) up -d --wait mysql

migrate: mysql-up build-deps ## 执行数据库迁移（先启动 MySQL，宿主机连 localhost:3307）
	MYSQL_HOST=localhost MYSQL_PORT=3307 pnpm migrate

seed: mysql-up ## 导入结算演示数据（hermes_settle + 元数据 + 向量索引，强制重跑）
	MYSQL_HOST=localhost MYSQL_PORT=3307 MYSQL_ROOT_PASSWORD=hermes_root pnpm seed:settle --force

seed-if-needed: migrate ## 首次导入结算演示数据（已执行则跳过）
	MYSQL_HOST=localhost MYSQL_PORT=3307 MYSQL_ROOT_PASSWORD=hermes_root pnpm seed:settle:if-needed

dev: infra build-deps seed-if-needed ## 本地开发：infra + 编译依赖 + migrate + 首次 seed + pnpm dev
	@echo "管理后台: http://localhost:3002/admin"
	@echo "健康检查: make health"
	MYSQL_HOST=localhost MYSQL_PORT=3307 pnpm dev

health: ## 检查各服务健康状态（需 make dev 运行中）
	@echo "== metadata-service :4050 =="
	@curl -sf http://localhost:4050/health | jq . || echo "  ✗ 未响应"
	@echo "== rag-service :4020 =="
	@curl -sf http://localhost:4020/health | jq . || echo "  ✗ 未响应"
	@echo "== report-service :4030 =="
	@curl -sf http://localhost:4030/health | jq . || echo "  ✗ 未响应"
	@echo "== eval-service :4040 =="
	@curl -sf http://localhost:4040/health | jq . || echo "  ✗ 未响应"
	@curl -sf http://localhost:4040/v1/eval/meta | jq . || echo "  ✗ eval API 未加载（4040 可能是旧 stub 进程，执行: lsof -ti :4040 | xargs kill -9 后重启 make dev）"
	@echo "== web-admin :3002 =="
	@curl -sf -o /dev/null -w "  HTTP %{http_code} → /admin\n" http://localhost:3002/admin || echo "  ✗ 未响应"

test: ## 运行测试
	pnpm test

test-phase9: ## Phase 9 质量验收（契约 + 性能 + 可观测性 + MCP）
	pnpm --filter @hermes/observability test
	pnpm --filter @hermes/contract-tests test
	pnpm --filter @hermes/performance test
	pnpm --filter @hermes/report-mcp-adapter test

test-contract: ## 跨服务契约测试
	pnpm --filter @hermes/contract-tests test

test-perf: ## 性能 SLA 验收测试
	pnpm --filter @hermes/performance test

lint: ## 代码检查
	pnpm lint

logs: ## 查看容器日志
	$(COMPOSE) --profile full logs -f

clean: ## 清理构建产物
	pnpm clean
	rm -rf .hermes/settle-seed.done
	$(COMPOSE) --profile full down -v 2>/dev/null || true
