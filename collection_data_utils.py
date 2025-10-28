#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shared utilities for nickel data collection scripts.

Provides consistent field definitions and helpers for coercing numeric values
and assembling standardized result dictionaries.
"""

from __future__ import annotations

import numbers
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

STANDARD_FIELDS = (
    "date",
    "contract",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "open_interest",
    "settlement",
    "source",
    "elapsed_seconds",
)


def coerce_to_float(value: Any) -> Optional[float]:
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
        return coerce_to_float(value.iloc[0])

    return None


def build_standard_record(
    *,
    date_str: str,
    contract: Optional[str],
    open_price: Any,
    high_price: Any,
    low_price: Any,
    close_price: Any,
    volume: Any,
    open_interest: Any,
    settlement: Any,
    source: str,
    elapsed_seconds: Optional[float],
) -> Dict[str, Optional[Any]]:
    """
    Assemble a standardized result dictionary using the shared field schema.
    """
    record: Dict[str, Optional[Any]] = {
        "date": date_str,
        "contract": contract or "",
        "open": coerce_to_float(open_price),
        "high": coerce_to_float(high_price),
        "low": coerce_to_float(low_price),
        "close": coerce_to_float(close_price),
        "volume": coerce_to_float(volume),
        "open_interest": coerce_to_float(open_interest),
        "settlement": coerce_to_float(settlement),
        "source": source,
        "elapsed_seconds": (
            round(float(elapsed_seconds), 4)
            if isinstance(elapsed_seconds, numbers.Real)
            else None
        ),
    }
    return record
