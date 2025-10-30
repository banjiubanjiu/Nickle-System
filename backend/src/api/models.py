from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    """Standard envelope for JSON responses returned by this API."""

    data: Any
    meta: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class IntradaySnapshot(BaseModel):
    """Schema describing a single intraday snapshot as surfaced to clients."""

    id: Optional[int] = None
    exchange: str
    contract: str
    captured_at: str
    quote_date: Optional[str] = None
    latest_price: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    settlement: Optional[float] = None
    prev_settlement: Optional[float] = None
    volume: Optional[float] = None
    open_interest: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    tick_time: Optional[str] = None
    elapsed_seconds: Optional[float] = None


class DailyRecord(BaseModel):
    """Schema for a day-level aggregation of nickel market data."""

    id: Optional[int] = None
    exchange: str
    contract: str
    trade_date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    settlement: Optional[float] = None
    prev_settlement: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    volume: Optional[float] = None
    open_interest: Optional[float] = None
    elapsed_seconds: Optional[float] = None
