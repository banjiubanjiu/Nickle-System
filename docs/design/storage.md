# Storage Layer Plan

## Goals
- Provide a stable local data source so the dashboard and AI modules do not rely on live third-party calls.
- Preserve both real-time snapshots and historical data to support trend analysis and automated reports (daily, weekly, monthly).
- Start with SQLite for the MVP but keep the design ready to swap to PostgreSQL later with minimal changes.

## Design Principles
1. **Separate by time granularity**: one table for intraday snapshots, one table for daily aggregates. This mirrors the difference between dashboard updates and report preparation, and it keeps retention/cleanup simple.
2. **Share schema across exchanges**: both LME and SHFE data live in the same tables, identified by an `exchange` column. Most price/volume fields are common; optional values stay nullable or move to an `extras` JSON payload.
3. **Single repository layer**: all database access goes through a dedicated module so a future storage backend can be swapped without touching collectors, APIs, or report logic.

## Data Model (MVP)
| Table | Purpose | Key Columns (examples) |
| --- | --- | --- |
| intraday_snapshots | Stores every snapshot fetched during trading hours; feeds the dashboard. | id, captured_at (local timestamp), exchange (lme, shfe, ...), source_detail (lme_realtime, shfe_realtime), contract, quote_date, latest_price, open, high, low, close, settlement, prev_settlement, volume, open_interest, bid, ask, change, change_pct, tick_time (nullable for LME), elapsed_seconds, extras (JSON string, optional) |
| daily_market_data | Holds daily-level data used for reports and historical charts. | id, trade_date, exchange, source_detail (lme_history, shfe_history, sina_history), contract, open, high, low, close, settlement, prev_settlement, change, change_pct, volume, open_interest, elapsed_seconds, extras |

Additional notes:
- Both tables include created_at and updated_at timestamps (populated by the repository) for auditing and housekeeping.
- Use generic SQLite-friendly types (INTEGER, REAL, TEXT) so the schema ports cleanly to PostgreSQL.
- extras allows temporary storage of exchange-specific data; it can be normalized later if needed.

## Rationale for the Structure
- **Dashboard vs. reports**: real-time views need the freshest intraday records, while reports aggregate daily figures. Splitting the tables keeps queries and retention policies focused.
- **Exchange agnostic**: the exchange flag keeps queries unified (e.g., comparing LME vs. SHFE prices) while still letting the UI filter on demand.
- **Extensible**: new exchanges or data providers can reuse the same tables by introducing new exchange or source_detail values.

## Data Flow Overview
1. Collectors invoke the repository: save_intraday_snapshot(exchange, contract, payload) after each realtime fetch; call save_daily_market_data(...) when a historical batch is retrieved.
2. The repository validates input, ensures tables exist, writes rows, and returns identifiers or status.
3. Dashboard/API modules request recent intraday snapshots via repository methods (for example, get_latest_snapshot(exchange) or list_intraday(exchange, since)).
4. Reporting and AI jobs query daily_market_data, perform their aggregations, and optionally cache rendered text elsewhere.
5. Cleanup/retention policies (such as pruning old intraday rows) can be implemented inside the repository without touching business logic.

## Repository Layer Expectations
- Suggested module layout:
  - `storage/config.py` – load environment variables (`DATABASE_URL`, retention hours, logging level) with sensible defaults (e.g., `sqlite:///storage/data.db`).
  - `storage/models.py` – define `TypedDict` structures for intraday/daily payloads to keep interfaces self-documented.
  - `storage/repository.py` – expose the public API for other layers.
- On module import, initialize the connection (`sqlite3.connect(path, check_same_thread=False)`) and run idempotent table-creation SQL; use a module-level connection guarded by a lock to support multi-threaded readers.
- Expose typed functions for the main operations:
  - `init_db()` – ensure schema exists.
  - `save_intraday_snapshot(exchange, contract, payload)` – insert realtime rows.
  - `save_daily_market_data(exchange, trade_date, payload)` – insert daily aggregates.
  - `get_latest_intraday(exchange)` / `list_intraday(exchange, limit)` – serve API consumers.
  - `list_daily(exchange, start_date, end_date)` – feed charting/report jobs.
  - `cleanup_intraday(before_timestamp)` – remove rows older than the retention window.
- Keep all SQL statements parameterized and contained within the repository; other modules never issue direct SQL.
- Attach a module-level logger (e.g., `nickel.storage`) to record schema initialization, insert failures, and cleanup summaries; errors bubble up as custom `StorageError` exceptions so callers can handle them consistently.
- Read configuration (database path, retention hours, etc.) from environment variables or config files so switching to PostgreSQL only changes one setting; surface helper functions such as `get_database_url()` and `get_retention_hours()` for reuse in schedulers/tests.

## Configuration & Logging
- `.env` keys:
  - `DATABASE_URL` – defaults to `sqlite:///storage/data.db`.
  - `INTRADAY_RETENTION_HOURS` – defaults to `24`.
  - `LOG_LEVEL` – defaults to `INFO`.
- Logging convention: use Python’s `logging` module with daily rotating file handlers writing to `logs/storage.log`; include fields `timestamp | level | exchange | action | message`.

## Migration Path to PostgreSQL
1. Replace the SQLite connection with a PostgreSQL driver (psycopg2 or SQLAlchemy engine) using the same repository interface.
2. Adjust table creation SQL for PostgreSQL data types and indexes (e.g., TIMESTAMP WITH TIME ZONE).
3. Export existing SQLite data if needed and import into PostgreSQL.
4. Re-run repository smoke tests; business code should not require changes.

## Implementation Steps
1. Finalize schemas in this document and agree on column names.
2. Implement the repository module with SQLite: connection management, table creation, insert/query helpers.
3. Update collectors to call the repository instead of printing or writing raw data elsewhere.
4. Build lightweight tests or scripts to verify inserts and queries for both tables.
5. Document backup/export instructions to smooth the future migration to PostgreSQL.
