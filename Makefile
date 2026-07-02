.PHONY: help up down build migrate seed dev test lint logs clean install infra mysql-up

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
	MYSQL_HOST=localhost MYSQL_PORT=3307 pnpm dev

test: ## 运行测试
	pnpm test

lint: ## 代码检查
	pnpm lint

logs: ## 查看容器日志
	docker compose logs -f

clean: ## 清理构建产物
	pnpm clean
	docker compose down -v 2>/dev/null || true
