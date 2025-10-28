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
from datetime import datetime
from typing import Dict, Optional

import akshare as ak
import pandas as pd

from collection_data_utils import STANDARD_FIELDS, build_standard_record

# Force UTF-8 output (AkShare returns Chinese column names)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


# Column names returned by AkShare for the realtime feed (Chinese -> English keywords)
REALTIME_RENAME_MAP = {
    "名称": "contract",
    "最新价": "latest_price",
    "开盘价": "open",
    "最高价": "high",
    "最低价": "low",
    "昨日结算价": "prev_settlement",
    "持仓量": "open_interest",
    "行情时间": "quote_time",
    "日期": "date",
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


def _print_result(label: str, data: Optional[Dict[str, Optional[float]]]) -> None:
    """Pretty-print the standardized result using shared field order."""
    print("\n" + "=" * 60)
    print(label)
    print("=" * 60)
    if data is None:
        print("No data")
        return
    for field in STANDARD_FIELDS:
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

    return build_standard_record(
        date_str=date_str,
        contract=str(row.get("contract", "")),
        open_price=row.get("open"),
        high_price=row.get("high"),
        low_price=row.get("low"),
        close_price=row.get("latest_price"),
        volume=None,  # realtime API does not expose volume
        open_interest=row.get("open_interest"),
        settlement=row.get("prev_settlement"),
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
    return build_standard_record(
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
        _print_result(f"LME Historical [{args.date}]", historical)
        return

    today_str = datetime.now().strftime("%Y-%m-%d")
    test_history_date = "2025-10-23"
    print(f"Testing LME realtime ({today_str}) and historical ({test_history_date}) data...\n")

    realtime = get_realtime_lme_nickel()
    _print_result(f"LME Realtime [{today_str}]", realtime)

    historical = get_historical_lme_nickel(test_history_date)
    _print_result(f"LME Historical [{test_history_date}]", historical)


if __name__ == "__main__":
    main()
