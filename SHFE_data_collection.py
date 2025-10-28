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
import numbers
from datetime import datetime
from typing import Any, Dict, Optional

import akshare as ak
import pandas as pd
import numpy as np
from akshare.futures.futures_zh_sina import futures_symbol_mark

# Ensure UTF-8 stdout for readable Chinese if present in data.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# Fields we surface when printing realtime snapshots (Sina接口字段+补算指标).
REALTIME_FIELDS = (
    "date",
    "contract",
    "latest_price",
    "open",
    "high",
    "low",
    "close",
    "prev_settlement",
    "settlement",
    "change",
    "change_pct",
    "bid",
    "ask",
    "volume",
    "open_interest",
    "source",
    "tick_time",
    "elapsed_seconds",
)

# Fields shown for历史日线记录（与 Sina 日度接口保持一致的核心指标）。
HISTORICAL_FIELDS = (
    "date",
    "contract",
    "open",
    "high",
    "low",
    "close",
    "settlement",
    "prev_settlement",
    "change",
    "change_pct",
    "volume",
    "open_interest",
    "source",
    "elapsed_seconds",
)

try:
    # Cache the SHFE nickel symbol.
    _SHFE_NI_SYMBOL = (
        futures_symbol_mark()
        .loc[futures_symbol_mark()["mark"] == "ni_qh", "symbol"]
        .iloc[0]
    )
except Exception:
    _SHFE_NI_SYMBOL = None


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


# Assemble dict consumed by CLI / downstream storage for realtime SHFE data
def _build_realtime_record(
    *,
    date_str: str,
    contract: Optional[str],
    open_price: Any,
    high_price: Any,
    low_price: Any,
    close_price: Any,
    latest_price: Any,
    prev_settlement: Any,
    settlement: Any,
    change: Any,
    change_pct: Any,
    bid: Any,
    ask: Any,
    volume: Any,
    open_interest: Any,
    tick_time: Optional[str],
    source: str,
    elapsed_seconds: Optional[float],
) -> Dict[str, Optional[Any]]:
    """Assemble realtime SHFE record."""
    return {
        "date": date_str,
        "contract": contract or "",
        "latest_price": _coerce_to_float(latest_price),
        "open": _coerce_to_float(open_price),
        "high": _coerce_to_float(high_price),
        "low": _coerce_to_float(low_price),
        "close": _coerce_to_float(close_price),
        "prev_settlement": _coerce_to_float(prev_settlement),
        "settlement": _coerce_to_float(settlement),
        "change": _coerce_to_float(change),
        "change_pct": (
            round(_coerce_to_float(change_pct), 6) if change_pct is not None else None
        ),
        "bid": _coerce_to_float(bid),
        "ask": _coerce_to_float(ask),
        "volume": _coerce_to_float(volume),
        "open_interest": _coerce_to_float(open_interest),
        "source": source,
        "tick_time": tick_time,
        "elapsed_seconds": (
            round(float(elapsed_seconds), 4)
            if isinstance(elapsed_seconds, numbers.Real)
            else None
        ),
    }


# Assemble dict for SHFE 历史日线数据（保持字段整洁）。
def _build_historical_record(
    *,
    date_str: str,
    contract: Optional[str],
    open_price: Any,
    high_price: Any,
    low_price: Any,
    close_price: Any,
    settlement: Any,
    prev_settlement: Any,
    change: Any,
    change_pct: Any,
    volume: Any,
    open_interest: Any,
    source: str,
    elapsed_seconds: Optional[float],
) -> Dict[str, Optional[Any]]:
    """Assemble historical SHFE record."""
    return {
        "date": date_str,
        "contract": contract or "",
        "open": _coerce_to_float(open_price),
        "high": _coerce_to_float(high_price),
        "low": _coerce_to_float(low_price),
        "close": _coerce_to_float(close_price),
        "settlement": _coerce_to_float(settlement),
        "prev_settlement": _coerce_to_float(prev_settlement),
        "change": _coerce_to_float(change),
        "change_pct": (
            round(_coerce_to_float(change_pct), 6) if change_pct is not None else None
        ),
        "volume": _coerce_to_float(volume),
        "open_interest": _coerce_to_float(open_interest),
        "source": source,
        "elapsed_seconds": (
            round(float(elapsed_seconds), 4)
            if isinstance(elapsed_seconds, numbers.Real)
            else None
        ),
    }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> datetime:
    """Parse date in yyyy-mm-dd format."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"Invalid date '{date_str}'. Expected format yyyy-mm-dd.") from exc


def _print_realtime(label: str, data: Optional[Dict[str, Optional[Any]]]) -> None:
    _print_record(label, data, REALTIME_FIELDS)


def _print_historical(label: str, data: Optional[Dict[str, Optional[Any]]]) -> None:
    _print_record(label, data, HISTORICAL_FIELDS)


def _print_record(label: str, data: Optional[Dict[str, Optional[Any]]], fields) -> None:
    """Pretty-print helper according to provided field order."""
    print("\n" + "=" * 60)
    print(label)
    print("=" * 60)

    if data is None:
        print("No data")
        return

    for field in fields:
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
        "动态结算价": "settlement",
    }
    df = df.rename(columns=rename_map)

    if "date" not in df.columns:
        print("[Sina] Unexpected response: missing 'date' column")
        return None

    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    df = df.sort_values("date").reset_index(drop=True)

    matching_idx = df.index[df["date"] == target_date]
    if matching_idx.size == 0:
        print(f"[Sina] No record for {date_str}")
        return None

    row_idx = matching_idx[-1]
    row = df.loc[row_idx]

    prev_settlement = None
    if row_idx > 0 and "settlement" in df.columns:
        prev_value = df.loc[row_idx - 1, "settlement"]
        prev_settlement = prev_value if pd.notna(prev_value) else None

    prev_settlement_value = _coerce_to_float(prev_settlement)
    settlement_value = _coerce_to_float(row.get("settlement"))
    close_value = _coerce_to_float(row.get("close"))
    base_price = settlement_value if settlement_value is not None else close_value
    change = None
    change_pct = None
    if base_price is not None and prev_settlement_value not in (None, 0):
        change = base_price - prev_settlement_value
        if prev_settlement_value:
            change_pct = (change / prev_settlement_value) * 100

    return _build_historical_record(
        date_str=date_str,
        contract="NI_main",
        open_price=row.get("open"),
        high_price=row.get("high"),
        low_price=row.get("low"),
        close_price=row.get("close"),
        settlement=settlement_value,
        prev_settlement=prev_settlement_value,
        change=change,
        change_pct=change_pct,
        volume=row.get("volume"),
        open_interest=row.get("open_interest"),
        source="sina_main",
        elapsed_seconds=elapsed,
    )


def _fetch_shfe_realtime(date_str: str) -> Optional[Dict[str, Optional[Any]]]:
    """Fetch SHFE realtime snapshot via Sina interface."""
    target_date = _parse_date(date_str)

    fetch_start = time.perf_counter()
    try:
        symbol_for_fetch = _SHFE_NI_SYMBOL
        if symbol_for_fetch is None:
            symbol_for_fetch = futures_symbol_mark().loc[
                futures_symbol_mark()["mark"] == "ni_qh", "symbol"
            ].iloc[0]
        realtime_df = ak.futures_zh_realtime(symbol=symbol_for_fetch)
    except Exception as exc:
        print(f"[SHFE realtime] Request failed: {exc}")
        return None
    elapsed = time.perf_counter() - fetch_start

    if realtime_df is None or realtime_df.empty:
        print("[SHFE realtime] Empty response")
        return None

    main_mask = realtime_df["symbol"].str.upper().eq("NI0")
    row_df = realtime_df[main_mask]
    row = row_df.iloc[0] if not row_df.empty else realtime_df.iloc[0]

    latest_price = row.get("trade")
    open_price = row.get("open")
    high_price = row.get("high")
    low_price = row.get("low")
    close_numeric = _coerce_to_float(row.get("close"))
    close_price = close_numeric if close_numeric not in (None, 0.0) else None
    settlement_numeric = _coerce_to_float(row.get("settlement"))
    settlement_value = settlement_numeric if settlement_numeric not in (None, 0.0) else None
    prev_settlement = row.get("presettlement") or row.get("prevsettlement")
    tick_time = row.get("ticktime")  # e.g. 14:03:30
    trade_date = row.get("tradedate")
    record_date = trade_date if trade_date else target_date.strftime("%Y-%m-%d")

    prev_settlement_value = _coerce_to_float(prev_settlement)
    change = None
    change_pct = None
    latest_numeric = _coerce_to_float(latest_price)
    if latest_numeric is not None and prev_settlement_value not in (None, 0):
        change = latest_numeric - prev_settlement_value
        if prev_settlement_value:
            change_pct = (change / prev_settlement_value) * 100
    elif row.get("changepercent") not in (None, ""):
        # Sina 可能直接返回涨跌幅（单位为小数），作为备选数据源。
        change_pct = (
            row.get("changepercent") * 100
            if row.get("changepercent") not in (None, 0)
            else None
        )

    bid_candidate = row.get("bidprice1") if row.get("bidprice1") else row.get("bid")
    bid_numeric = _coerce_to_float(bid_candidate)
    bid = bid_numeric if bid_numeric not in (None, 0.0) else None

    ask_candidate = row.get("askprice1") if row.get("askprice1") else row.get("ask")
    ask_numeric = _coerce_to_float(ask_candidate)
    ask = ask_numeric if ask_numeric not in (None, 0.0) else None

    return _build_realtime_record(
        date_str=str(record_date),
        contract=str(row.get("symbol", "")),
        open_price=open_price,
        high_price=high_price,
        low_price=low_price,
        close_price=close_price,
        latest_price=latest_price,
        prev_settlement=prev_settlement_value,
        settlement=settlement_value,
        change=change,
        change_pct=change_pct,
        bid=bid,
        ask=ask,
        volume=row.get("volume"),
        open_interest=row.get("position"),
        tick_time=tick_time,
        source="shfe_realtime",
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
        _print_historical(f"Historical Data [{date_str}]", historical)
        return

    # Default behaviour: exercise both interfaces.
    today_str = datetime.now().strftime("%Y-%m-%d")
    test_history_date = "2025-10-23"
    print(f"Testing realtime (today: {today_str}) and historical (test date: {test_history_date}) data...\n")

    realtime = get_realtime_nickel()
    _print_realtime(f"Realtime Data [SHFE {today_str}]", realtime)

    historical = get_historical_nickel(test_history_date)
    _print_historical(f"Historical Data [Sina {test_history_date}]", historical)


if __name__ == "__main__":
    main()
