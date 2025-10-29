from __future__ import annotations

from functools import lru_cache

from fastapi import Depends

from backend.src.storage import (
    DailyMarketPayload,
    IntradaySnapshotPayload,
    cleanup_intraday,
    get_daily_run_time,
    get_intraday_interval_seconds,
    get_latest_intraday,
    get_log_level,
    get_retention_hours,
    init_db,
    list_daily,
    list_intraday,
)


@lru_cache()
def init_storage() -> None:
    """Initialise database schema once."""
    init_db()


def ensure_storage():
    init_storage()


def get_intraday_reader():
    ensure_storage()
    return {
        "get_latest_intraday": get_latest_intraday,
        "list_intraday": list_intraday,
        "cleanup_intraday": cleanup_intraday,
    }


def get_daily_reader():
    ensure_storage()
    return {
        "list_daily": list_daily,
    }


__all__ = [
    "ensure_storage",
    "get_intraday_reader",
    "get_daily_reader",
]
