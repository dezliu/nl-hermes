.PHONY: help up down build migrate seed dev test lint logs clean install infra mysql-up health

help: ## 显示帮助
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	pnpm install

infra: ## 仅启动基础设施 (MySQL/Redis/Qdrant/OpenSearch)
	docker compose -f docker-compose.dev.yml up -d

up: ## 一键启动全栈
	@test -f .env || cp .env.example .env
	docker compose up -d --build

down: ## 停止并移除容器
	docker compose down

build: ## 构建全部服务
	pnpm build

mysql-up: ## 仅启动 MySQL（供 migrate 使用）
	docker compose -f docker-compose.dev.yml up -d mysql

migrate: mysql-up ## 执行数据库迁移（先启动 MySQL，宿主机连 localhost:3307）
	MYSQL_HOST=localhost MYSQL_PORT=3307 pnpm migrate

seed: ## 导入演示数据
	@echo "Seed not yet implemented (Phase 2)"

dev: infra ## 本地开发：infra + pnpm dev
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
	docker compose logs -f

clean: ## 清理构建产物
	pnpm clean
	docker compose down -v 2>/dev/null || true
