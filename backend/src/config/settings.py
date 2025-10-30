from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration shared across scheduler, storage, and API.

    Values are loaded from the optional .env file,
    falling back to the defaults defined below.
    """

    # Database connection URL (defaults to SQLite in storage/data.db)
    database_url: str = "sqlite:///storage/data.db"

    # How long to keep intraday (real-time) data in hours before cleanup
    intraday_retention_hours: int = 24

    # Interval in seconds between intraday data collection runs
    intraday_interval_seconds: int = 30

    # Daily data collection time for SHFE (Shanghai Futures Exchange) — Beijing time
    shfe_daily_hour: int = 15
    shfe_daily_minute: int = 1

    # Daily data collection time for LME (London Metal Exchange) — Beijing time
    lme_daily_hour: int = 3
    lme_daily_minute: int = 30

    # Maximum number of retry attempts for failed operations
    max_retries: int = 1

    # Logging level for application components
    log_level: Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG", "NOTSET"] | str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="NICKEL_",
        case_sensitive=False,
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        """Limit overrides to explicit kwargs and the local .env file."""
        return init_settings, dotenv_settings


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()  # type: ignore[call-arg]


def get_database_url() -> str:
    """Database connection URL (e.g., sqlite:///storage/data.db)."""
    return get_settings().database_url


def get_retention_hours() -> int:
    """Intraday data retention window in hours."""
    return int(get_settings().intraday_retention_hours)


def get_log_level() -> str:
    """Configured log level (upper-case string)."""
    return str(get_settings().log_level).upper()


def get_intraday_interval_seconds() -> int:
    """Interval between intraday collection runs, clamped to >= 1."""
    return max(1, int(get_settings().intraday_interval_seconds))


def _clamp_hour_minute(hour: int, minute: int) -> tuple[int, int]:
    hour = max(0, min(23, hour))
    minute = max(0, min(59, minute))
    return hour, minute


def get_daily_run_time(exchange: str) -> tuple[int, int]:
    """Daily run time (hour, minute) specified in Beijing time for each exchange."""
    settings = get_settings()
    exchange_lower = exchange.lower()
    if exchange_lower == "shfe":
        return _clamp_hour_minute(int(settings.shfe_daily_hour), int(settings.shfe_daily_minute))
    if exchange_lower == "lme":
        return _clamp_hour_minute(int(settings.lme_daily_hour), int(settings.lme_daily_minute))
    raise ValueError(f"Unsupported exchange for daily schedule: {exchange}")


def get_max_retries() -> int:
    """Maximum retry attempts for collectors/storage operations."""
    return max(0, int(get_settings().max_retries))


__all__ = [
    "Settings",
    "get_settings",
    "get_database_url",
    "get_retention_hours",
    "get_log_level",
    "get_intraday_interval_seconds",
    "get_daily_run_time",
    "get_max_retries",
]
