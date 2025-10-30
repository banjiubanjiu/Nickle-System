# 数据存储设计说明

## 1. 设计目标
- 为调度器 / API / 前端提供统一的数据源；
- 支撑实时与日线数据查询、快速恢复、后续指标扩展；
- 便于将来迁移至 PostgreSQL 或其他存储。

## 2. 数据模型

### 2.1 实时快照表 `intraday_snapshots`
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER, PK | 自增 ID |
| `captured_at` | TEXT (ISO8601) | 调度器抓取时间（UTC） |
| `exchange` | TEXT | `lme` / `shfe` 等交易所标识 |
| `source_detail` | TEXT | 数据来源，如 `lme_realtime` |
| `contract` | TEXT | 合约代码，例如 `LME_3M`、`NI0` |
| `quote_date` | TEXT | 行情日期（源接口返回） |
| `latest_price` 等 | REAL | 价格、成交量、持仓量、涨跌额/幅等字段 |
| `tick_time` | TEXT | 源接口返回的 tick 时间（若有） |
| `elapsed_seconds` | REAL | 采集用时，可用于监控 |
| `extras` | TEXT(JSON) | 额外字段，以 JSON 字符串保存 |
| `created_at` / `updated_at` | TEXT | 冗余存储，便于审计（UTC, ISO8601） |

索引：`(exchange, captured_at)`，便于获取最新记录。

### 2.2 日线数据表 `daily_market_data`
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER, PK |
| `trade_date` | TEXT | 交易日（YYYY-MM-DD） |
| `exchange` / `source_detail` / `contract` | TEXT |
| `open` / `high` / `low` / `close` | REAL |
| `settlement` / `prev_settlement` | REAL |
| `change` / `change_pct` | REAL |
| `volume` / `open_interest` | REAL |
| `elapsed_seconds` | REAL |
| `extras` | TEXT(JSON) |
| `created_at` / `updated_at` | TEXT |

复合唯一键：`(exchange, contract, trade_date, source_detail)`，插入时使用 `ON CONFLICT ... DO UPDATE` 以支持幂等。

索引：`(exchange, trade_date)`。

## 3. 清理与保留策略
- 实时快照默认保留 **24 小时**（`NICKEL_INTRADAY_RETENTION_HOURS`），调度器每次采集成功后调用 `cleanup_intraday` 删除过期数据。
- 日线数据默认长期保留，体量较小；迁移到 PostgreSQL 后可考虑历史归档策略。

## 4. 配置项
均通过 `.env` 或环境变量注入，代码统一调用 `backend.src.config`：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `NICKEL_DATABASE_URL` | `sqlite:///storage/data.db` | 指定数据库位置，可替换为 PostgreSQL |
| `NICKEL_INTRADAY_RETENTION_HOURS` | `24` | 实时数据保留时长 |
| `NICKEL_INTRADAY_INTERVAL_SECONDS` | `30` | 调度器实时采集间隔（调度层共用） |
| `NICKEL_DAILY_RUN_HOUR/MINUTE` | `18/10` | 日线采集执行时间 |
| `NICKEL_MAX_RETRIES` | `1` | 调度器失败重试次数 |
| `NICKEL_LOG_LEVEL` | `INFO` | storage / scheduler 日志级别 |

## 5. 关键接口（`backend/src/storage/__init__.py`）
- 初始化：`init_db()`；
- 写入：`save_intraday_snapshot(payload)`、`save_daily_market_data(payload)`；
- 查询：`get_latest_intraday(exchange)`、`list_intraday(exchange, limit)`、`list_daily(exchange, start_date, end_date)`；
- 清理：`cleanup_intraday(before_timestamp=None, retention_hours=None)`。

输入格式使用 `TypedDict`（`IntradaySnapshotPayload`、`DailyMarketPayload`），采集桥接层负责映射。

## 6. 迁移到 PostgreSQL 的建议
1. 调整 `.env` 的 `NICKEL_DATABASE_URL` 为 PostgreSQL 连接串；
2. 使用 `psycopg2` 或 SQLAlchemy 创建连接（当前实现基于 sqlite3，可重构为 SQLAlchemy 以兼容多种数据库）；
3. 重写 `_resolve_sqlite_path` 等 sqlite 专属逻辑；
4. 重新执行建表脚本，必要时将 `REAL` / `TEXT` 映射为合适的 PostgreSQL 类型；
5. 通过 CSV/脚本导出 sqlite 数据并导入 PostgreSQL；
6. 重新运行调度器与 API，确认 CRUD 与索引行为正确。

## 7. 日志与排错
- 存储层使用 `nickel.storage` 日志；文件位于 `logs/storage.log`，按天滚动；
- 记录事件：连接成功/失败、插入异常、清理结果；
- 调度层在写库失败时会捕获 `StorageError` 并重试或直接记录错误，方便定位问题。

## 8. 与 API 的衔接
- API 中的 `/api/v1/dashboard/*` 接口直接调用 `list_intraday`、`list_daily` 等函数；
- 响应中附带 `labels` 字段，用来在前端或调用者侧显示中文名称；
- 如需新增字段，只要在存储层和模型中同步即可；API 响应会自动包含新字段。

> 本文与《设计概览（pr.md）》配合使用，如需了解总体架构，请查阅该文档；如果数据库结构有变更、或需要支持更多指标，请在此文件中同步说明。
