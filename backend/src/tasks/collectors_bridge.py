from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.src.collectors.SHFE_data_collection import (
    get_historical_nickel as get_shfe_historical,
    get_realtime_nickel as get_shfe_realtime,
)
from backend.src.collectors.lme_data_collection import (
    get_historical_lme_nickel,
    get_realtime_lme_nickel,
)
from backend.src.storage import DailyMarketPayload, IntradaySnapshotPayload

LOGGER = logging.getLogger("nickel.collectors_bridge")


class CollectorError(RuntimeError):
    """Raised when a collector fails."""


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _coerce_float(value) -> Optional[float]:
    if value in (None, "", "null"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _prepare_intraday_payload(exchange: str, record: dict) -> IntradaySnapshotPayload:
    if not record:
        raise CollectorError(f"{exchange} realtime returned empty record")
    contract = record.get("contract") or ""
    if not contract:
        raise CollectorError(f"{exchange} realtime record missing contract")
    payload: IntradaySnapshotPayload = {
        "exchange": exchange,
        "source_detail": record.get("source") or f"{exchange}_realtime",
        "contract": contract,
        "captured_at": _now_utc(),
        "quote_date": record.get("date"),
        "latest_price": _coerce_float(record.get("latest_price")),
        "open": _coerce_float(record.get("open")),
        "high": _coerce_float(record.get("high")),
        "low": _coerce_float(record.get("low")),
        "close": _coerce_float(record.get("close")),
        "settlement": _coerce_float(record.get("settlement")),
        "prev_settlement": _coerce_float(record.get("prev_settlement")),
        "volume": _coerce_float(record.get("volume")),
        "open_interest": _coerce_float(record.get("open_interest")),
        "bid": _coerce_float(record.get("bid")),
        "ask": _coerce_float(record.get("ask")),
        "change": _coerce_float(record.get("change")),
        "change_pct": _coerce_float(record.get("change_pct")),
        "tick_time": record.get("tick_time"),
        "elapsed_seconds": _coerce_float(record.get("elapsed_seconds")),
        "extras": record,
    }
    return payload


def _prepare_daily_payload(exchange: str, record: dict) -> DailyMarketPayload:
    if not record:
        raise CollectorError(f"{exchange} daily returned empty record")
    trade_date = record.get("date")
    if not trade_date:
        raise CollectorError(f"{exchange} daily record missing date")
    contract = record.get("contract") or ""
    if not contract:
        raise CollectorError(f"{exchange} daily record missing contract")
    payload: DailyMarketPayload = {
        "exchange": exchange,
        "source_detail": record.get("source") or f"{exchange}_history",
        "contract": contract,
        "trade_date": trade_date,
        "open": _coerce_float(record.get("open")),
        "high": _coerce_float(record.get("high")),
        "low": _coerce_float(record.get("low")),
        "close": _coerce_float(record.get("close")),
        "settlement": _coerce_float(record.get("settlement")),
        "prev_settlement": _coerce_float(record.get("prev_settlement")),
        "change": _coerce_float(record.get("change")),
        "change_pct": _coerce_float(record.get("change_pct")),
        "volume": _coerce_float(record.get("volume")),
        "open_interest": _coerce_float(record.get("open_interest")),
        "elapsed_seconds": _coerce_float(record.get("elapsed_seconds")),
        "extras": record,
    }
    return payload


def collect_lme_realtime() -> IntradaySnapshotPayload:
    record = get_realtime_lme_nickel()
    if record is None:
        raise CollectorError("LME realtime returned None")
    return _prepare_intraday_payload("lme", record)


def collect_shfe_realtime() -> IntradaySnapshotPayload:
    record = get_shfe_realtime()
    if record is None:
        raise CollectorError("SHFE realtime returned None")
    return _prepare_intraday_payload("shfe", record)


def collect_lme_daily(target_date: Optional[str] = None) -> DailyMarketPayload:
    if target_date is None:
        target_date = (_now_utc() - timedelta(days=1)).date().isoformat()
    record = get_historical_lme_nickel(target_date)
    if record is None:
        raise CollectorError(f"LME history returned None for {target_date}")
    record.setdefault("date", target_date)
    return _prepare_daily_payload("lme", record)


def collect_shfe_daily(target_date: Optional[str] = None) -> DailyMarketPayload:
    if target_date is None:
        target_date = (_now_utc() - timedelta(days=1)).date().isoformat()
    record = get_shfe_historical(target_date)
    if record is None:
        raise CollectorError(f"SHFE history returned None for {target_date}")
    record.setdefault("date", target_date)
    return _prepare_daily_payload("shfe", record)


__all__ = [
    "CollectorError",
    "collect_lme_realtime",
    "collect_shfe_realtime",
    "collect_lme_daily",
    "collect_shfe_daily",
]
