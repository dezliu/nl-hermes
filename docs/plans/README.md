# nl-hermes 项目 Plan 归档

本目录归档灵析（Hermes / nl-hermes）相关的 Cursor Plan 文档，来源：`~/.cursor/plans/`（与仓库实现相关的条目）。

> 其他项目（如 myrag、HappySettlement、zscm-retail 等）的 plan 不在此目录。

## 索引

| 文档 | 主题 |
|------|------|
| [灵析系统架构设计_86078467.plan.md](./灵析系统架构设计_86078467.plan.md) | 微服务整体架构、RAG 三集合、LangGraph 工作流 |
| [nl2sql_系统设计_9dac9513.plan.md](./nl2sql_系统设计_9dac9513.plan.md) | NL2SQL 系统初版设计（LangGraph + 混合检索） |
| [prd_业务需求文档_aef326b3.plan.md](./prd_业务需求文档_aef326b3.plan.md) | 业务 PRD 撰写计划 |
| [admin与workflow对齐_d6a0ad5c.plan.md](./admin与workflow对齐_d6a0ad5c.plan.md) | 管理后台与 11 步 Workflow 对齐 |
| [元数据管理改造_b55f7b07.plan.md](./元数据管理改造_b55f7b07.plan.md) | 元数据同步、查询库、向量索引重建 |
| [结算演示数据脚本_e5788256.plan.md](./结算演示数据脚本_e5788256.plan.md) | seed:settle 演示库与 RAG 索引 |
| [llm_多厂商适配器_1deb61cd.plan.md](./llm_多厂商适配器_1deb61cd.plan.md) | OpenAI / 阿里云 / 智谱 LLM 切换 |
| [rag_评分尺度修复_c806cca1.plan.md](./rag_评分尺度修复_c806cca1.plan.md) | RRF 分数与质量门限量纲统一 |
| [sql_幻觉字段分析_7a97290b.plan.md](./sql_幻觉字段分析_7a97290b.plan.md) | 跨表字段幻觉、Grounding、生成闭环 |
| [sql错误与llm排查_0a752c31.plan.md](./sql错误与llm排查_0a752c31.plan.md) | trade_date / gmt_create、流式思考展示 |
| [sql生成失败与提速_653982b3.plan.md](./sql生成失败与提速_653982b3.plan.md) | datasourceId 贯通、RAG 提速 |
| [报表生成扩展设计_2b63e494.plan.md](./报表生成扩展设计_2b63e494.plan.md) | ReportSpec、多格式输出（Web/Word） |
| [大屏生成功能设计_09d40cc5.plan.md](./大屏生成功能设计_09d40cc5.plan.md) | 数据大屏：DashboardLayoutSpec、全屏渲染、布局编辑与 MCP 工具 |
| [cursor_聊天导出脚本_b4890267.plan.md](./cursor_聊天导出脚本_b4890267.plan.md) | Cursor 会话导出 Markdown 脚本 |
| [重启后端服务_0af0cb80.plan.md](./重启后端服务_0af0cb80.plan.md) | Docker / make dev 模式下服务重启指引 |

## 维护说明

新增与 nl-hermes 相关的 plan 时，可从 Cursor 导出后复制到本目录，并更新上表：

```bash
cp ~/.cursor/plans/<name>_<hash>.plan.md docs/plans/
```
