#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LME nickel data collection.

Public interfaces:
    - get_realtime_lme_nickel():   realtime snapshot from LME (via AkShare)
    - get_historical_lme_nickel(date_str): historical daily data for a given date

When executed as a script:
    * without arguments: tests realtime (today) and historical (2025-10-23)
    * with YYYY-MM-DD argument: fetches only that day's historical data
"""

from __future__ import annotations

import argparse
import io
import sys
import time
import numbers
from datetime import datetime
from typing import Any, Dict, Optional

import akshare as ak
import pandas as pd
import numpy as np

# Force UTF-8 output (AkShare returns Chinese column names)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


# Column names returned by AkShare for the realtime feed (Chinese -> English keywords).
# Keeps the raw DataFrame readable while letting the rest of the code use stable English keys.
REALTIME_RENAME_MAP = {
    "名称": "contract",
    "最新价": "latest_price",
    "涨跌额": "change",
    "涨跌幅": "change_pct",
    "买价": "bid",
    "卖价": "ask",
    "开盘价": "open",
    "最高价": "high",
    "最低价": "low",
    "昨日结算价": "prev_settlement",
    "持仓量": "open_interest",
    "日期": "date",
}

# Order of fields to display for realtime snapshots (print helpers rely on this sequence).
REALTIME_FIELDS = (
    "date",
    "contract",
    "latest_price",
    "open",
    "high",
    "low",
    "close",
    "prev_settlement",
    "change",
    "change_pct",
    "bid",
    "ask",
    "volume",
    "open_interest",
    "settlement",
    "source",
    "elapsed_seconds",
)

# Order of fields to display for historical daily records.
HISTORICAL_FIELDS = (
    "date",
    "contract",
    "open",
    "high",
    "low",
    "close",
    "settlement",
    "volume",
    "open_interest",
    "source",
    "elapsed_seconds",
)


def _coerce_to_float(value: Any) -> Optional[float]:
    """Convert assorted numeric-like values to float, preserving None."""
    if value is None:
        return None

    if isinstance(value, numbers.Real) or isinstance(value, np.number):
        return float(value)

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return float(stripped.replace(",", ""))
        except ValueError:
            return None

    if isinstance(value, pd.Series) and not value.empty:
        return _coerce_to_float(value.iloc[0])

    return None


# Assemble dict consumed by CLI / downstream storage for realtime data.
def _build_realtime_record(
    *,
    date_str: str,
    contract: Optional[str],
    open_price: Any,
    high_price: Any,
    low_price: Any,
    close_price: Any,
    latest_price: Any,
    volume: Any,
    open_interest: Any,
    settlement: Any,
    prev_settlement: Any = None,
    change: Any = None,
    change_pct: Any = None,
    bid: Any = None,
    ask: Any = None,
    source: str,
    elapsed_seconds: Optional[float],
) -> Dict[str, Optional[Any]]:
    """Assemble a realtime record for LME output."""
    return {
        "date": date_str,
        "contract": contract or "",
        "open": _coerce_to_float(open_price),
        "high": _coerce_to_float(high_price),
        "low": _coerce_to_float(low_price),
        "close": _coerce_to_float(close_price),
        "latest_price": _coerce_to_float(latest_price),
        "volume": _coerce_to_float(volume),
        "open_interest": _coerce_to_float(open_interest),
        "settlement": _coerce_to_float(settlement),
        "prev_settlement": _coerce_to_float(prev_settlement),
        "change": _coerce_to_float(change),
        "change_pct": _coerce_to_float(change_pct),
        "bid": _coerce_to_float(bid),
        "ask": _coerce_to_float(ask),
        "source": source,
        "elapsed_seconds": (
            round(float(elapsed_seconds), 4)
            if isinstance(elapsed_seconds, numbers.Real)
            else None
        ),
    }


# Assemble dict for historical daily data (cleaner subset of fields).
def _build_historical_record(
    *,
    date_str: str,
    contract: Optional[str],
    open_price: Any,
    high_price: Any,
    low_price: Any,
    close_price: Any,
    settlement: Any,
    volume: Any,
    open_interest: Any,
    source: str,
    elapsed_seconds: Optional[float],
) -> Dict[str, Optional[Any]]:
    """Assemble a historical daily record for LME output."""
    return {
        "date": date_str,
        "contract": contract or "",
        "open": _coerce_to_float(open_price),
        "high": _coerce_to_float(high_price),
        "low": _coerce_to_float(low_price),
        "close": _coerce_to_float(close_price),
        "settlement": _coerce_to_float(settlement),
        "volume": _coerce_to_float(volume),
        "open_interest": _coerce_to_float(open_interest),
        "source": source,
        "elapsed_seconds": (
            round(float(elapsed_seconds), 4)
            if isinstance(elapsed_seconds, numbers.Real)
            else None
        ),
    }


def _fetch_lme_daily_snapshot(date_str: str) -> Dict[str, Optional[float]]:
    """
    Retrieve daily LME stats (volume & settlement proxy) matching the given date.

    Uses the historical endpoint so we can surface intraday volume/settlement
    metrics on the realtime card. Returns None when data is unavailable.
    """
    try:
        hist_df = ak.futures_foreign_hist(symbol="NID")
    except Exception as exc:
        print(f"[LME realtime] Daily stats request failed: {exc}")
        return {"volume": None, "close": None, "settlement": None}

    if hist_df is None or hist_df.empty:
        print("[LME realtime] Daily stats empty")
        return {"volume": None, "close": None, "settlement": None}

    df = hist_df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    day_df = df[df["date"] == date_str]
    if day_df.empty:
        return {"volume": None, "close": None, "settlement": None}

    row = day_df.iloc[-1]
    close_price = row.get("close")
    settlement_value = row.get("close")
    if "settlement" in row.index:
        settlement_value = row.get("settlement")
    return {
        "volume": row.get("volume"),
        "close": close_price,
        "settlement": settlement_value,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> datetime:
    """Validate and parse yyyy-mm-dd formatted string."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"Invalid date '{date_str}'. Expected format yyyy-mm-dd.") from exc


def _print_realtime(label: str, data: Optional[Dict[str, Optional[Any]]]) -> None:
    _print_record(label, data, REALTIME_FIELDS)


def _print_historical(label: str, data: Optional[Dict[str, Optional[Any]]]) -> None:
    _print_record(label, data, HISTORICAL_FIELDS)


def _print_record(label: str, data: Optional[Dict[str, Optional[Any]]], field_order) -> None:
    """Pretty-print a record with a specified field order."""
    print("\n" + "=" * 60)
    print(label)
    print("=" * 60)
    if data is None:
        print("No data")
        return
    for field in field_order:
        print(f"{field:>13}: {data.get(field)}")


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------

def _fetch_lme_realtime() -> Optional[Dict[str, Optional[float]]]:
    """Fetch realtime LME nickel data via AkShare."""
    fetch_start = time.perf_counter()
    try:
        df = ak.futures_foreign_commodity_realtime(symbol="NID")
    except Exception as exc:
        print(f"[LME realtime] Request failed: {exc}")
        return None
    elapsed = time.perf_counter() - fetch_start

    if df is None or df.empty:
        print("[LME realtime] Empty response")
        return None

    # Normalize column names to English keywords
    df = df.rename(columns=REALTIME_RENAME_MAP)
    row = df.iloc[0]

    date_value = row.get("date")
    if isinstance(date_value, pd.Timestamp):
        date_str = date_value.strftime("%Y-%m-%d")
    else:
        date_str = str(date_value) if date_value is not None else datetime.now().strftime("%Y-%m-%d")

    # Use daily snapshot to back-fill settlement/volume since realtime feed lacks them.
    daily_snapshot = _fetch_lme_daily_snapshot(date_str)

    return _build_realtime_record(
        date_str=date_str,
        contract=str(row.get("contract", "")),
        open_price=row.get("open"),
        high_price=row.get("high"),
        low_price=row.get("low"),
        close_price=daily_snapshot.get("close"),
        latest_price=row.get("latest_price"),
        volume=daily_snapshot.get("volume"),
        open_interest=row.get("open_interest"),
        settlement=daily_snapshot.get("settlement"),
        prev_settlement=row.get("prev_settlement"),
        change=row.get("change"),
        change_pct=row.get("change_pct"),
        bid=row.get("bid"),
        ask=row.get("ask"),
        source="lme_realtime",
        elapsed_seconds=elapsed,
    )


def _fetch_lme_history(date_str: str) -> Optional[Dict[str, Optional[float]]]:
    """Fetch historical LME nickel data for the given date."""
    target_date = _parse_date(date_str).date()

    fetch_start = time.perf_counter()
    try:
        df = ak.futures_foreign_hist(symbol="NID")
    except Exception as exc:
        print(f"[LME history] Request failed: {exc}")
        return None
    elapsed = time.perf_counter() - fetch_start

    if df is None or df.empty:
        print("[LME history] Empty response")
        return None

    df = df.copy()
    if "date" not in df.columns:
        print("[LME history] Unexpected schema (missing 'date')")
        return None

    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    day_df = df[df["date"] == target_date]
    if day_df.empty:
        print(f"[LME history] No record for {date_str}")
        return None

    row = day_df.iloc[-1]
    return _build_historical_record(
        date_str=date_str,
        contract="LME_Nickel",
        open_price=row.get("open"),
        high_price=row.get("high"),
        low_price=row.get("low"),
        close_price=row.get("close"),
        volume=row.get("volume"),
        open_interest=row.get("position"),
        settlement=None,
        source="lme_history",
        elapsed_seconds=elapsed,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_realtime_lme_nickel() -> Optional[Dict[str, Optional[float]]]:
    """Realtime interface for LME nickel."""
    return _fetch_lme_realtime()


def get_historical_lme_nickel(date_str: str) -> Optional[Dict[str, Optional[float]]]:
    """Historical interface for LME nickel."""
    return _fetch_lme_history(date_str)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="LME nickel data collector (realtime & historical)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "date",
        nargs="?",
        help="Optional yyyy-mm-dd date. If provided, fetch only historical data for that day.",
    )
    args = parser.parse_args()

    if args.date:
        try:
            _ = _parse_date(args.date)
        except ValueError as exc:
            print(exc)
            return

        print(f"Fetching LME nickel history for {args.date} ...")
        historical = get_historical_lme_nickel(args.date)
        _print_historical(f"LME Historical [{args.date}]", historical)
        return

    today_str = datetime.now().strftime("%Y-%m-%d")
    test_history_date = "2025-10-23"
    print(f"Testing LME realtime ({today_str}) and historical ({test_history_date}) data...\n")

    realtime = get_realtime_lme_nickel()
    _print_realtime(f"LME Realtime [{today_str}]", realtime)

    historical = get_historical_lme_nickel(test_history_date)
    _print_historical(f"LME Historical [{test_history_date}]", historical)


if __name__ == "__main__":
    main()
