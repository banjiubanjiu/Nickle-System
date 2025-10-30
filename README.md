# Nickel-System

## 1. 项目概览

镍金属独立站的目标包括三大模块：
- 实时数据大屏（LME、SHFE）
- AI 自动报告（早报 / 日报 / 周报 / 月报）
- 镍市资讯（国内 / 国际）

当前代码已实现数据采集、存储、调度以及对外 API。

## 2. 开发环境 & 依赖

建议使用 Python 3.10+ 并启用虚拟环境：

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

`requirements.txt` 包含采集、调度、API 所需的最小依赖。

## 3. 配置

可在根目录创建 `.env`（可选）覆盖默认配置：

```
NICKEL_DATABASE_URL=sqlite:///storage/data.db
NICKEL_INTRADAY_RETENTION_HOURS=24
NICKEL_INTRADAY_INTERVAL_SECONDS=30
NICKEL_SHFE_DAILY_HOUR=15
NICKEL_SHFE_DAILY_MINUTE=1
NICKEL_LME_DAILY_HOUR=3
NICKEL_LME_DAILY_MINUTE=30
NICKEL_MAX_RETRIES=1
NICKEL_LOG_LEVEL=INFO
```

所有键均有默认值，未配置也能运行。调度器与 API 共用这些设置。

## 4. 数据存储层

- 位置：`backend/src/storage/`
- 主要函数：
  - `init_db()` 初始化数据库（默认 `storage/data.db`）
  - `save_intraday_snapshot(payload)` / `save_daily_market_data(payload)` 写入实时/日线数据
  - `get_latest_intraday(exchange)`、`list_intraday(exchange, limit)`、`list_daily(exchange, start, end)` 读取数据
  - `cleanup_intraday()` 清理超出保留窗口的实时快照（默认 24 小时）

快速验证示例：

```python
from datetime import datetime
from backend.src.storage import init_db, save_intraday_snapshot, get_latest_intraday

init_db()
save_intraday_snapshot({
    "exchange": "lme",
    "source_detail": "lme_realtime",
    "contract": "LME_3M",
    "captured_at": datetime.utcnow(),
    "latest_price": 19000.5,
})
print(get_latest_intraday("lme"))
```

## 5. 调度任务

调度器位于 `backend/src/tasks/scheduler.py`，周期性采集实时与日线数据并写库。

### 单次执行（调试）

```bash
python -m backend.src.tasks.scheduler --once intraday   # 仅一次实时采集
python -m backend.src.tasks.scheduler --once daily      # 仅一次日线采集
python -m backend.src.tasks.scheduler --once both       # 先实时后日线，各执行一次
```

> `--once` 表示“执行一次后退出”。若不带该参数，则常驻运行并循环采集。

### 常驻执行

```bash
python -m backend.src.tasks.scheduler
```

默认每 30 秒抓取实时数据；日线任务分开调度：SHFE 在 15:01 执行、LME 在次日 03:30 执行。日志输出到 `logs/scheduler.log` 和终端。

### 一键启动（调度 + API）

开发阶段可使用根目录脚本同时启动调度器和 API：

```bash
python run_all.py
```

常用参数：`--no-scheduler`、`--no-api`、`--host`、`--port`、`--no-reload` 等。按 `python run_all.py --help` 查看全部说明。

## 6. API 服务

- 入口：`backend/src/api/main.py`
- 启动方式：

```bash
uvicorn backend.src.api.main:app --reload --port 8000
# 或
python -m backend.src.api.main
```

- 项目内置 Swagger UI 静态资源，不依赖外网：`http://127.0.0.1:8000/docs`
- 常用接口：
  - `GET /health`
  - `GET /api/v1/dashboard/latest?exchange=lme`
  - `GET /api/v1/dashboard/intraday?exchange=shfe&limit=30`
  - `GET /api/v1/dashboard/daily?exchange=lme&start_date=2025-10-01&end_date=2025-10-28`

## 7. 目录结构

```
backend/
  src/
    api/           # FastAPI 应用
    collectors/    # LME、SHFE 采集脚本
    storage/       # 数据存储层
    tasks/         # 调度器与采集桥接
docs/
  design/          # 设计方案与计划
requirements.txt
.env (可选)
```

## 8. 后续规划

- API 权限与缓存
- 前端大屏原型（React/Vue）
- AI 报告生成
- Docker 化部署流程

更多细节可参考 `docs/design/pr.md` 与 `docs/design/mvp-plan.md`。
