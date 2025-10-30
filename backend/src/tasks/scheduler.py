from __future__ import annotations

import argparse
import logging
import logging.handlers
import sys
import time
from datetime import datetime, timedelta, timezone, tzinfo
from pathlib import Path
from typing import Callable, Optional

from backend.src.config import (
    get_daily_run_time,
    get_intraday_interval_seconds,
    get_max_retries,
)
from backend.src.storage import (
    StorageError,
    cleanup_intraday,
    init_db,
    save_daily_market_data,
    save_intraday_snapshot,
)

from .collectors_bridge import (
    CollectorError,
    collect_lme_daily,
    collect_lme_realtime,
    collect_shfe_daily,
    collect_shfe_realtime,
)

LOG_DIR = "logs"
LOGGER = logging.getLogger("nickel.scheduler")

SHANGHAI_TZ = timezone(timedelta(hours=8), name="Asia/Shanghai")
EXCHANGE_TIMEZONES = {
    "shfe": SHANGHAI_TZ,
    "lme": SHANGHAI_TZ,
}


def _configure_logging() -> None:
    """Set up time-rotating file logging plus console output for the scheduler."""
    if LOGGER.handlers:
        return
    Path(LOG_DIR).mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.TimedRotatingFileHandler(
        f"{LOG_DIR}/scheduler.log",
        when="midnight",
        backupCount=7,
        encoding="utf-8",
    )
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    handler.setFormatter(formatter)
    LOGGER.addHandler(handler)
    console_handler = logging.StreamHandler()  # defaults to stderr, avoids closed-stdout issues
    console_handler.setFormatter(formatter)
    LOGGER.addHandler(console_handler)
    LOGGER.setLevel(logging.INFO)
    LOGGER.propagate = False


def _current_time() -> datetime:
    """Return the current UTC time (timezone aware)."""
    return datetime.now(timezone.utc)


def _compute_next_daily(now: datetime, hour: int, minute: int, tz: tzinfo = timezone.utc) -> datetime:
    """Compute the next daily collection time slot for the given clock time in the provided time zone."""
    now_local = now.astimezone(tz)
    candidate_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate_local <= now_local:
        candidate_local += timedelta(days=1)
    return candidate_local.astimezone(timezone.utc)


def _run_with_retries(
    name: str,
    func: Callable[[], Optional[dict]],
    save_call: Callable[[dict], int],
    max_retries: int,
) -> bool:
    """Execute a collector with retry/backoff and persist the returned payload."""
    attempt = 0
    while True:
        try:
            record = func()
            if record is None:
                LOGGER.warning("%s collector returned no data", name)
                return False
            save_call(record)
            LOGGER.info("%s collector succeeded", name)
            return True
        except (CollectorError, StorageError) as exc:
            attempt += 1
            LOGGER.error("%s collector failed: %s", name, exc, exc_info=True)
            if attempt > max_retries:
                LOGGER.error("%s collector exceeded max retries (%s)", name, max_retries)
                return False
            sleep_seconds = min(5, 1 + attempt)
            LOGGER.info("%s retrying in %s seconds (attempt %s)", name, sleep_seconds, attempt)
            time.sleep(sleep_seconds)
        except Exception as exc:  # pragma: no cover - unexpected failures
            attempt += 1
            LOGGER.exception("%s collector unexpected error: %s", name, exc)
            if attempt > max_retries:
                return False
            time.sleep(1.0)


def run_intraday_cycle(max_retries: int) -> None:
    """Fetch and persist realtime data for all exchanges once."""
    LOGGER.info("Starting intraday cycle")
    tasks = [
        ("lme_intraday", collect_lme_realtime),
        ("shfe_intraday", collect_shfe_realtime),
    ]
    successes = 0
    for name, func in tasks:
        if _run_with_retries(name, func, save_intraday_snapshot, max_retries):
            successes += 1
    if successes:
        deleted = cleanup_intraday()
        LOGGER.info("Intraday cleanup removed %s rows", deleted)
    LOGGER.info("Intraday cycle complete (success=%s)", successes)


def run_shfe_daily_cycle(max_retries: int) -> None:
    """Collect and store the SHFE daily summary."""
    LOGGER.info("Starting SHFE daily cycle")
    _run_with_retries("shfe_daily", collect_shfe_daily, save_daily_market_data, max_retries)
    LOGGER.info("SHFE daily cycle complete")


def run_lme_daily_cycle(max_retries: int) -> None:
    """Collect and store the LME daily summary."""
    LOGGER.info("Starting LME daily cycle")
    _run_with_retries("lme_daily", collect_lme_daily, save_daily_market_data, max_retries)
    LOGGER.info("LME daily cycle complete")


def run_daily_cycle(max_retries: int) -> None:
    """Run both daily collectors back to back."""
    LOGGER.info("Running both daily cycles once")
    run_shfe_daily_cycle(max_retries)
    run_lme_daily_cycle(max_retries)
    LOGGER.info("Both daily cycles executed")


def run_forever() -> None:
    """Main scheduling loop orchestrating intraday and daily runs."""
    interval = get_intraday_interval_seconds()
    max_retries = get_max_retries()
    shfe_hour, shfe_minute = get_daily_run_time("shfe")
    lme_hour, lme_minute = get_daily_run_time("lme")
    LOGGER.info(
        "Scheduler starting (interval=%ss, shfe_daily=%02d:%02d Asia/Shanghai, lme_daily=%02d:%02d Asia/Shanghai, max_retries=%s)",
        interval,
        shfe_hour,
        shfe_minute,
        lme_hour,
        lme_minute,
        max_retries,
    )
    next_intraday = _current_time()
    now = _current_time()
    shfe_tz = EXCHANGE_TIMEZONES["shfe"]
    lme_tz = EXCHANGE_TIMEZONES["lme"]
    daily_schedules = {
        "shfe": {
            "next": _compute_next_daily(now, shfe_hour, shfe_minute, shfe_tz),
            "hour": shfe_hour,
            "minute": shfe_minute,
            "runner": run_shfe_daily_cycle,
            "tz": shfe_tz,
        },
        "lme": {
            "next": _compute_next_daily(now, lme_hour, lme_minute, lme_tz),
            "hour": lme_hour,
            "minute": lme_minute,
            "runner": run_lme_daily_cycle,
            "tz": lme_tz,
        },
    }

    try:
        while True:
            now = _current_time()
            if now >= next_intraday:
                run_intraday_cycle(max_retries)
                next_intraday = now + timedelta(seconds=interval)
            for name, schedule in daily_schedules.items():
                if now >= schedule["next"]:
                    schedule["runner"](max_retries)
                    schedule["next"] = _compute_next_daily(now, schedule["hour"], schedule["minute"], schedule["tz"])

            sleep_until_intraday = (next_intraday - now).total_seconds()
            sleep_until_dailies = [max(1.0, (schedule["next"] - now).total_seconds()) for schedule in daily_schedules.values()]
            sleep_seconds = max(1.0, min([sleep_until_intraday, *sleep_until_dailies]))
            time.sleep(sleep_seconds)
    except KeyboardInterrupt:
        LOGGER.info("Scheduler interrupted, exiting.")


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    """Parse CLI arguments used to control scheduler execution mode."""
    parser = argparse.ArgumentParser(description="Nickel data scheduler")
    parser.add_argument(
        "--once",
        choices=["intraday", "daily", "both"],
        help="Run selected tasks once and exit.",
    )
    parser.add_argument("--log-level", default=None, help="Override log level (INFO/DEBUG/...).")
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> None:
    """Entry point used by both CLI executions and tests."""
    _configure_logging()
    args = parse_args(argv)
    if args.log_level:
        LOGGER.setLevel(getattr(logging, args.log_level.upper(), logging.INFO))
    init_db()
    LOGGER.info("Database initialised")
    max_retries = get_max_retries()

    if args.once:
        if args.once in ("intraday", "both"):
            run_intraday_cycle(max_retries)
        if args.once in ("daily", "both"):
            run_daily_cycle(max_retries)
        return

    run_forever()


if __name__ == "__main__":
    main()
