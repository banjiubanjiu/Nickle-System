# MVP 实施计划

## 1. 数据存储层
- 设计并记录 `intraday_snapshots`、`daily_market_data` 的建表 SQL。
- 在 `backend/src/storage/repository.py` 中使用 `sqlite3` 实现连接、建表、读写方法。
- 提供 24 小时快照保留的清理函数，并在文档说明如何执行。
- 通过 `.env` 或环境变量管理数据库路径、连接字符串，兼容后续迁移 PostgreSQL。
- 在 README 中补充数据库初始化、配置和本地运行说明。

## 2. 采集层调整
- 将 LME、SHFE 采集逻辑封装为可复用函数（如 `collect_lme_realtime()`），返回结构化字典，统一字段命名和单位处理。
- 抽离公共字段映射 / 数值转换逻辑，避免重复代码。
- 统一错误处理：接口失败抛出异常或返回显式状态，调度层可据此决定是否重试。
- 记录采集日志：`INFO` 输出成功抓取摘要（交易所、任务类型、耗时、返回记录数），`ERROR` 记录异常栈和第三方接口返回信息。

## 3. 任务调度层
- 新建独立调度脚本（例如 `backend/tasks/scheduler.py`），定时调用采集函数。
- 在调度器内部执行“采集 → 将结果交给 repository 写库”的完整流程；记录成功/失败日志，并设置重试策略。
  - 调度日志包含任务名称、尝试次数、写库条数、异常原因。
- 调度策略：
  - 实时任务（LME、SHFE 快照）每 30 秒执行一次。
  - 日线任务（历史接口）每日固定时刻执行一次，避免交易时段干扰。
- 支持两种运行模式：
  - 本地模式通过命令行启动调度器。
  - Docker 模式在 compose 中配置独立调度容器。

## 4. API 服务层
- 基于 FastAPI 实现核心接口：
  - `GET /api/v1/dashboard/latest` 返回 LME/SHFE 最新快照、`captured_at`、中文标签。
  - `GET /api/v1/dashboard/history` 返回指定天数的日线数据（准备好后启用）。
  - 预留 `GET /api/v1/dashboard/compare` 接口用于后续指标扩展。
  - `GET /health` 检查数据库连接、最近采集时间。
- 统一响应格式 `{ data, meta, error }`，并提供字段含义说明。
- API 日志：记录请求路径、状态码、耗时；异常时输出堆栈到 `logs/api.log`（按日滚动）。

## 5. 前端原型
- 使用 React/Vue 或静态 HTML + JS 构建大屏单页：
  - 每 30 秒轮询 `latest` 接口，展示 P0 模块（顶部概览、实时卡片、数据时间）。
  - P1 模块（走势、价差）先显示“待上线”占位卡片。
  - 格式化数值、单位，展示中文标签。

## 6. 部署与运维
- 本地模式：提供采集函数、调度器、API、前端的启动命令，方便开发调试。
- Docker 模式：编写 Dockerfile、docker-compose，把调度器、API、前端组件整合在同一台服务器运行。
- 通过 `.env` 统一管理配置项（数据库路径、日志级别、调度频率、API 端口等），在 README 中列出示例。
- 日志与维护：统一使用 Python `logging`，将日志输出到 `logs/` 目录，采用按日滚动策略；在 README 中注明日志路径、级别调整方法、常见错误解释。
- 测试与扩展：编写基础单元测试（采集函数、repository、API），为后续接入新交易所/指标、迁移 PostgreSQL 打基础。
- 文档更新：同步维护 `docs/design/pr.md`、`docs/design/storage.md`、README，记录配置、运行、清理、迁移 PostgreSQL 的步骤。
