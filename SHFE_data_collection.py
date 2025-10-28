#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nickel futures data collector.

Provides two public functions:
    1. get_realtime_nickel()          -> SHFE realtime snapshot for today.
    2. get_historical_nickel(date)    -> Historical main contract data (Sina) for the given date.

Running this script without arguments exercises both functions:
    - realtime: today (SHFE)
    - historical: fixed test date 2025-10-23 (Sina)

Running with a single YYYY-MM-DD argument fetches only that day's historical data.
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from datetime import datetime
from typing import Any, Dict, Optional

import akshare as ak
import pandas as pd

from collection_data_utils import STANDARD_FIELDS, build_standard_record

# Ensure UTF-8 stdout for readable Chinese if present in data.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> datetime:
    """Parse date in yyyy-mm-dd format."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"Invalid date '{date_str}'. Expected format yyyy-mm-dd.") from exc


def _print_result(label: str, data: Optional[Dict[str, Optional[Any]]]) -> None:
    """Pretty-print the standardized result."""
    print("\n" + "=" * 60)
    print(label)
    print("=" * 60)

    if data is None:
        print("No data")
        return

    for field in STANDARD_FIELDS:
        value = data.get(field)
        print(f"{field:>13}: {value}")


# ---------------------------------------------------------------------------
# Internal fetchers
# ---------------------------------------------------------------------------

def _fetch_sina_history(date_str: str) -> Optional[Dict[str, Optional[Any]]]:
    """Fetch historical main contract data from Sina for the given date."""
    target_date = _parse_date(date_str).date()

    fetch_start = time.perf_counter()
    try:
        df = ak.futures_main_sina(symbol="NI0")
    except Exception as exc:
        print(f"[Sina] Request failed: {exc}")
        return None
    elapsed = time.perf_counter() - fetch_start

    if df is None or df.empty:
        print("[Sina] Empty response")
        return None

    df = df.copy()
    rename_map = {
        "日期": "date",
        "开盘价": "open",
        "最高价": "high",
        "最低价": "low",
        "收盘价": "close",
        "成交量": "volume",
        "持仓量": "open_interest",
        "主力合约": "contract",
    }
    df = df.rename(columns=rename_map)

    if "date" not in df.columns:
        print("[Sina] Unexpected response: missing 'date' column")
        return None

    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    day_df = df[df["date"] == target_date]
    if day_df.empty:
        print(f"[Sina] No record for {date_str}")
        return None

    row = day_df.iloc[-1]
    return build_standard_record(
        date_str=date_str,
        contract=str(row.get("contract", "NI_main")),
        open_price=row.get("open"),
        high_price=row.get("high"),
        low_price=row.get("low"),
        close_price=row.get("close"),
        volume=row.get("volume"),
        open_interest=row.get("open_interest"),
        settlement=None,
        source="sina_main",
        elapsed_seconds=elapsed,
    )


def _fetch_shfe_realtime(date_str: str) -> Optional[Dict[str, Optional[Any]]]:
    """Fetch SHFE daily data for the requested date and pick the most active contract."""
    target_date = _parse_date(date_str)
    ymd = target_date.strftime("%Y%m%d")

    fetch_start = time.perf_counter()
    try:
        df = ak.get_futures_daily(start_date=ymd, end_date=ymd, market="SHFE")
    except Exception as exc:
        print(f"[SHFE] Request failed: {exc}")
        return None
    elapsed = time.perf_counter() - fetch_start

    if df is None or df.empty:
        print(f"[SHFE] Empty response for {date_str}")
        return None

    nickel_df = df[df["symbol"].str.contains("ni", case=False, na=False)]
    if nickel_df.empty:
        print(f"[SHFE] No nickel contracts on {date_str}")
        return None

    nickel_df = nickel_df.sort_values("volume", ascending=False)
    row = nickel_df.iloc[0]

    settlement = None
    if "settle" in row.index:
        settlement = row.get("settle")
    elif "settlement" in row.index:
        settlement = row.get("settlement")

    return build_standard_record(
        date_str=date_str,
        contract=str(row.get("symbol", "")),
        open_price=row.get("open"),
        high_price=row.get("high"),
        low_price=row.get("low"),
        close_price=row.get("close"),
        volume=row.get("volume"),
        open_interest=row.get("open_interest") or row.get("hold"),
        settlement=settlement,
        source="shfe_daily",
        elapsed_seconds=elapsed,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_realtime_nickel() -> Optional[Dict[str, Optional[Any]]]:
    """Interface 1: realtime SHFE data for today."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    return _fetch_shfe_realtime(today_str)


def get_historical_nickel(date_str: str) -> Optional[Dict[str, Optional[Any]]]:
    """Interface 2: historical main contract (Sina) data for the given date."""
    return _fetch_sina_history(date_str)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Test nickel futures realtime & historical interfaces.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "date",
        nargs="?",
        help="If provided, fetch only this day's historical data (yyyy-mm-dd).",
    )
    args = parser.parse_args()

    if args.date:
        date_str = args.date
        try:
            _ = _parse_date(date_str)
        except ValueError as exc:
            print(exc)
            return

        print(f"Fetching historical nickel futures for {date_str} (Sina)...")
        historical = get_historical_nickel(date_str)
        _print_result(f"Historical Data [{date_str}]", historical)
        return

    # Default behaviour: exercise both interfaces.
    today_str = datetime.now().strftime("%Y-%m-%d")
    test_history_date = "2025-10-23"
    print(f"Testing realtime (today: {today_str}) and historical (test date: {test_history_date}) data...\n")

    realtime = get_realtime_nickel()
    _print_result(f"Realtime Data [SHFE {today_str}]", realtime)

    historical = get_historical_nickel(test_history_date)
    _print_result(f"Historical Data [Sina {test_history_date}]", historical)


if __name__ == "__main__":
    main()
