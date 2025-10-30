from __future__ import annotations

from functools import lru_cache

from fastapi import Depends

from backend.src.storage import cleanup_intraday, get_latest_intraday, init_db, list_daily, list_intraday


@lru_cache()
def init_storage() -> None:
    """Initialise database schema once."""
    init_db()


def ensure_storage():
    """Guarantee that database schema is initialised before any storage access."""
    init_storage()


def get_intraday_reader():
    """Provide a bundle of intraday storage helpers for FastAPI dependency injection."""
    ensure_storage()
    return {
        "get_latest_intraday": get_latest_intraday,
        "list_intraday": list_intraday,
        "cleanup_intraday": cleanup_intraday,
    }


def get_daily_reader():
    """Provide read-only accessors for historical daily market data."""
    ensure_storage()
    return {
        "list_daily": list_daily,
    }


__all__ = [
    "ensure_storage",
    "get_intraday_reader",
    "get_daily_reader",
]
