from __future__ import annotations

import argparse
import logging
import logging.handlers
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Optional

from backend.src.storage import (
    StorageError,
    cleanup_intraday,
    get_daily_run_time,
    get_intraday_interval_seconds,
    get_max_retries,
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


def _configure_logging() -> None:
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
    return datetime.now(timezone.utc)


def _compute_next_daily(now: datetime, hour: int, minute: int) -> datetime:
    candidate = now.astimezone(timezone.utc).replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate


def _run_with_retries(
    name: str,
    func: Callable[[], Optional[dict]],
    save_call: Callable[[dict], int],
    max_retries: int,
) -> bool:
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


def run_daily_cycle(max_retries: int) -> None:
    LOGGER.info("Starting daily cycle")
    tasks = [
        ("lme_daily", collect_lme_daily),
        ("shfe_daily", collect_shfe_daily),
    ]
    successes = 0
    for name, func in tasks:
        if _run_with_retries(name, func, save_daily_market_data, max_retries):
            successes += 1
    LOGGER.info("Daily cycle complete (success=%s)", successes)


def run_forever() -> None:
    interval = get_intraday_interval_seconds()
    max_retries = get_max_retries()
    hour, minute = get_daily_run_time()
    LOGGER.info(
        "Scheduler starting (interval=%ss, daily=%02d:%02d, max_retries=%s)",
        interval,
        hour,
        minute,
        max_retries,
    )
    next_intraday = _current_time()
    next_daily = _compute_next_daily(_current_time(), hour, minute)

    try:
        while True:
            now = _current_time()
            if now >= next_intraday:
                run_intraday_cycle(max_retries)
                next_intraday = now + timedelta(seconds=interval)
            if now >= next_daily:
                run_daily_cycle(max_retries)
                next_daily = _compute_next_daily(now, hour, minute)

            sleep_until_intraday = (next_intraday - now).total_seconds()
            sleep_until_daily = (next_daily - now).total_seconds()
            sleep_seconds = max(1.0, min(sleep_until_intraday, sleep_until_daily))
            time.sleep(sleep_seconds)
    except KeyboardInterrupt:
        LOGGER.info("Scheduler interrupted, exiting.")


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Nickel data scheduler")
    parser.add_argument(
        "--once",
        choices=["intraday", "daily", "both"],
        help="Run selected tasks once and exit.",
    )
    parser.add_argument("--log-level", default=None, help="Override log level (INFO/DEBUG/...).")
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> None:
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
