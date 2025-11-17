# Nickel-System

一个端到端的镍金属行情与研究系统：AkShare 采集 LME / SHFE 数据，经调度与清洗写入 sqlite，FastAPI 对外提供健康检查与大屏接口，React 前端负责呈现实时指标、走势图与研究报告，`docs/` 目录沉淀 AI 生成的早评、日评与方案文档。

## 亮点速览
- **采集与调度**：`backend/src/collectors/` 封装 LME、SHFE 实时与历史接口；`backend/src/tasks/scheduler.py` 统一调度，支持 `--once` 调试 / 常驻运行、失败重试与实时保留窗口清理。
- **存储与 API**：`backend/src/storage/` 纯 sqlite3 实现，提供 `save_*` / `list_*` / `cleanup_intraday()` 等函数；FastAPI (`backend/src/api/`) 内置 Swagger 静态资源与标准响应包装（`APIResponse`）。
- **前端大屏**：`frontend/` 采用 React 18 + Vite + React Router，Mock 数据与真实 API 能随时切换，已经实现仪表盘、走势图、盘口、成交、早/日/周/月/年报面板等模块。
- **文档与报告**：`docs/design/` 记录架构、存储、前/后端计划与联调约定；`docs/镍市*.md` 保存 AI 生成的最新研报，可直接投喂给前端或运营。

## 目录速查
```
.
├── backend/
│   └── src/
│       ├── api/           # FastAPI 应用（路由、依赖、模型）
│       ├── collectors/    # LME / SHFE 采集脚本
│       ├── config/        # Pydantic Settings（.env → Settings）
│       ├── storage/       # sqlite repository（init/save/list/cleanup）
│       └── tasks/         # 调度器与采集桥接
├── frontend/
│   └── src/
│       ├── components/    # Header、图表、指标卡、盘口等复用组件
│       ├── data/          # Mock 数据与报告样例
│       ├── pages/         # dashboard + reports 路由
│       ├── services/      # Axios 封装（health/latest/intraday/daily）
│       ├── styles/        # 主题、布局与页面样式
│       └── types/         # 报告/指标类型
├── docs/
│   ├── design/            # 架构、计划、联调等文档
│   ├── 镍市早评.md / 镍市日评.md
│   └── Task.md            # 任务看板
├── run_all.py             # 一键启动调度器 + API
└── requirements.txt / package.json
```

## Backend 快速上手
### 1. 准备环境
- Python 3.10+，Windows/WSL/macOS/Linux 均可。
- 建议使用虚拟环境：
  ```powershell
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  ```
- 若需前端，Node.js 18+、npm 9+。

### 2. 运行调度器 & API
```powershell
python run_all.py                 # 同时启动 scheduler + uvicorn --reload
python run_all.py --no-api        # 仅跑调度
python run_all.py --no-scheduler  # 仅跑 API
python run_all.py --host 0.0.0.0 --port 9000 --no-reload
```
- 日志位于 `logs/scheduler.log`、`logs/storage.log`，终端同时打印关键信息。
- 访问 `http://127.0.0.1:8000/docs` 查看 API，静态 Swagger 资源随项目分发，离线可用。

### 3. 独立调试
- 单次采集：
  ```powershell
  python -m backend.src.tasks.scheduler --once intraday
  python -m backend.src.tasks.scheduler --once daily
  python -m backend.src.tasks.scheduler --once both
  ```
- 单独运行 API：`uvicorn backend.src.api.main:app --reload --port 8000`
- 直接验证采集脚本：
  ```powershell
  python -m backend.src.collectors.lme_data_collection YYYY-MM-DD
  python -m backend.src.collectors.SHFE_data_collection YYYY-MM-DD
  ```

## 配置（`.env` 或 `Settings(...)` 覆盖）
| 键 | 默认值 | 作用 |
| --- | --- | --- |
| `NICKEL_DATABASE_URL` | `sqlite:///storage/data.db` | sqlite 文件位置，可切 PostgreSQL（待实现） |
| `NICKEL_INTRADAY_RETENTION_HOURS` | `24` | 实时快照保留窗口（`cleanup_intraday` 使用） |
| `NICKEL_INTRADAY_INTERVAL_SECONDS` | `30` | 实时采集周期 |
| `NICKEL_SHFE_DAILY_HOUR` / `_MINUTE` | `15` / `1` | 北京时间的 SHFE 日线采集时间 |
| `NICKEL_LME_DAILY_HOUR` / `_MINUTE` | `3` / `30` | 北京时间的 LME 日线采集时间 |
| `NICKEL_MAX_RETRIES` | `1` | 调度器失败重试次数 |
| `NICKEL_LOG_LEVEL` | `INFO` | storage/scheduler 日志级别 |

调度器与 API 共享同一份配置，代码里统一调用 `backend.src.config.get_settings()`，不读取进程环境变量以避免意外污染。

## 数据流 & 调度节奏
1. 调度循环默认每 30 秒触发一次 **intraday** 任务：依次调用 `collect_lme_realtime()` / `collect_shfe_realtime()` → `save_intraday_snapshot()`，成功后执行 `cleanup_intraday()`，仅保留最近 N 小时。
2. **日线任务**：
   - SHFE：每天 15:01（Asia/Shanghai）触发 `collect_shfe_daily()`。
   - LME：每天 03:30（Asia/Shanghai）触发 `collect_lme_daily()`。
3. 存储层两个表：`intraday_snapshots`（按 `captured_at` 逆序查询最新/列表）、`daily_market_data`（支持 start/end 过滤）。所有字段与 API 响应保持一致，额外 `extras` JSON 保存原始 payload。
4. API 通过 `backend/src/api/deps.py` 在启动阶段调用 `init_db()`，之后 `Dashboard` 路由提供 `latest/intraday/daily` 接口，并附带中文 `labels` 供前端显示。

## API 速查
| 方法 & 路径 | 说明 |
| --- | --- |
| `GET /health` | 返回服务状态、最近一次 LME 快照时间、轮询间隔、保留窗口、UTC 时间戳 |
| `GET /api/v1/dashboard/latest?exchange=lme` | 指定交易所的最新实时快照，404 表示暂未采集 |
| `GET /api/v1/dashboard/intraday?exchange=shfe&limit=50` | 最近 N 条实时快照，按时间倒序 |
| `GET /api/v1/dashboard/daily?exchange=lme&start_date=2025-10-01&end_date=2025-10-31` | 日线区间数据（默认为所有历史），结果附带 `meta.count/start_date/end_date` |

返回结构统一为：`{ "data": ..., "meta": { labels, ... }, "error": null }`。字段模型定义在 `backend/src/api/models.py`，前端可直接推断类型。

## Frontend
1. 安装与启动：
   ```powershell
   cd frontend
   npm install
   npm run dev        # http://127.0.0.1:5173
   npm run build      # 产物在 dist/
   ```
2. `.env.local` / `VITE_API_BASE_URL` 控制后端地址，默认指向 `http://127.0.0.1:8000`，便于与 `run_all.py` 联调。
3. `src/App.tsx` 通过 React Router 切换仪表盘与早/日/周/月/年报，`services/dashboard.ts` 封装 `fetchHealth` / `fetchLatest` / `fetchIntraday` / `fetchDaily`，若后端不可用则自动 fallback 到 mock 数据。
4. 设计规范与主题说明见 `docs/design/mvp-front-plan.md` 与 `frontend/src/styles/README.md`，所有卡片/图表样式集中在 `src/styles/`。

## 报告 & 文档
- `docs/镍市早评.md`、`docs/镍市日评.md`：近期 AI 生成的资讯+技术分析，可直接复制到 CMS 或作为 Prompt。
- `docs/design/`：
  - `pr.md`：系统概览与模块职责；
  - `storage.md`：表结构、索引、清理策略；
  - `mvp-*.md`：前后端路线图、联调约定；
  - `frontend.md`：前端工程说明。
- `镍金属报告系统架构.md`：更宏观的架构/流程图示。
- `docs/Task.md`：任务推进记录与交付物索引。

## 故障排查
- **采集失败**：查看 `logs/scheduler.log`，搜索 `collector failed` 关键字；必要时单独运行采集脚本重现。
- **API 404 / 无数据**：确认调度器运行且数据库中存在记录，可使用 `sqlite3 storage/data.db 'SELECT COUNT(*) FROM intraday_snapshots;'` 自检。
- **Swagger 静态资源 404**：确保 `swagger_ui_bundle` 已安装且未被删除，`app.mount("/_swagger/static"...` 会直接读取包内文件。
- **前端跨域**：FastAPI 已允许 `http://localhost:5173` 与 `http://127.0.0.1:5173`，若使用其他域名，请在 `backend/src/api/main.py` 的 `allow_origins` 中补充。

## 后续路线（示例）
1. **联调落地**：将 `RealtimeDashboard` 的八张指标卡、盘口、Trades 替换为真实 API 数据，必要时新增 `/api/v1/dashboard/trades` 等接口。
2. **监控与告警**：为调度器添加钉钉 / 邮件通知，或将日志接入 Promtail/ELK。
3. **数据库抽象**：引入 SQLAlchemy/psycopg2，使 `NICKEL_DATABASE_URL` 支持 PostgreSQL；补充迁移脚本。
4. **AI 报告生产化**：固化 `docs/镍市*.md` 的模板与字段，结合存储数据自动生成 PDF / Markdown。
5. **容器化**：提供 docker-compose（scheduler + API + frontend）与生产部署指引。

