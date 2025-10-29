from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.src.api.deps import get_daily_reader, get_intraday_reader
from backend.src.api.models import APIResponse, DailyRecord, IntradaySnapshot

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

INTRADAY_LABELS: Dict[str, str] = {
    "exchange": "交易所",
    "contract": "合约",
    "captured_at": "抓取时间",
    "quote_date": "行情日期",
    "latest_price": "最新价",
    "open": "开盘价",
    "high": "最高价",
    "low": "最低价",
    "close": "收盘价",
    "settlement": "结算价",
    "prev_settlement": "昨日结算",
    "volume": "成交量",
    "open_interest": "持仓量",
    "bid": "买价",
    "ask": "卖价",
    "change": "涨跌额",
    "change_pct": "涨跌幅(%)",
    "tick_time": "Tick 时间",
    "elapsed_seconds": "耗时(秒)",
}

DAILY_LABELS: Dict[str, str] = {
    "exchange": "交易所",
    "contract": "合约",
    "trade_date": "交易日",
    "open": "开盘价",
    "high": "最高价",
    "low": "最低价",
    "close": "收盘价",
    "settlement": "结算价",
    "prev_settlement": "前结算",
    "change": "涨跌额",
    "change_pct": "涨跌幅(%)",
    "volume": "成交量",
    "open_interest": "持仓量",
    "elapsed_seconds": "耗时(秒)",
}


def _serialise_intraday(record: Dict[str, Any]) -> IntradaySnapshot:
    payload = {key: record.get(key) for key in IntradaySnapshot.model_fields.keys()}
    return IntradaySnapshot.model_validate(payload)


def _serialise_daily(record: Dict[str, Any]) -> DailyRecord:
    payload = {key: record.get(key) for key in DailyRecord.model_fields.keys()}
    return DailyRecord.model_validate(payload)


@router.get("/latest", response_model=APIResponse)
def get_latest_snapshot(
    exchange: str = Query("lme", description="交易所标识，如 lme / shfe"),
    intraday=Depends(get_intraday_reader),
) -> APIResponse:
    record = intraday["get_latest_intraday"](exchange)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No intraday data for exchange '{exchange}'")

    snapshot = _serialise_intraday(record)
    return APIResponse(
        data=snapshot.model_dump(),
        meta={"labels": INTRADAY_LABELS, "exchange": exchange},
        error=None,
    )


@router.get("/intraday", response_model=APIResponse)
def list_intraday_snapshots(
    exchange: str = Query("lme", description="交易所标识，如 lme / shfe"),
    limit: int = Query(30, ge=1, le=500, description="返回条数"),
    intraday=Depends(get_intraday_reader),
) -> APIResponse:
    records = intraday["list_intraday"](exchange, limit=limit)
    data = [_serialise_intraday(record).model_dump() for record in records]
    return APIResponse(
        data=data,
        meta={"labels": INTRADAY_LABELS, "exchange": exchange, "count": len(data)},
        error=None,
    )


@router.get("/daily", response_model=APIResponse)
def list_daily_records(
    exchange: str = Query("lme", description="交易所标识，如 lme / shfe"),
    start_date: Optional[str] = Query(None, description="起始日期 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    daily=Depends(get_daily_reader),
) -> APIResponse:
    records = daily["list_daily"](exchange, start_date=start_date, end_date=end_date)
    data = [_serialise_daily(record).model_dump() for record in records]
    return APIResponse(
        data=data,
        meta={
            "labels": DAILY_LABELS,
            "exchange": exchange,
            "count": len(data),
            "start_date": start_date,
            "end_date": end_date,
        },
        error=None,
    )
