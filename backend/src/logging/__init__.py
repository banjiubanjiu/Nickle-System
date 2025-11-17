from __future__ import annotations

import base64
import logging
import logging.handlers
import multiprocessing
import os
import secrets
import threading
from dataclasses import dataclass
from multiprocessing.managers import SyncManager
from pathlib import Path
from typing import Any, Dict, Optional

STORAGE_QUEUE_ADDR_ENV = "NICKEL_STORAGE_LOG_QUEUE_ADDR"
STORAGE_QUEUE_AUTH_ENV = "NICKEL_STORAGE_LOG_QUEUE_AUTH"

_MANAGED_QUEUE: Optional[multiprocessing.Queue] = None


def _shared_queue() -> multiprocessing.Queue:
    if _MANAGED_QUEUE is None:
        raise RuntimeError("storage log queue not initialised")
    return _MANAGED_QUEUE


class _StorageQueueManager(SyncManager):
    pass


class _StorageQueueClient(SyncManager):
    pass


_StorageQueueManager.register("get_queue", callable=_shared_queue)
_StorageQueueClient.register("get_queue")


@dataclass
class StorageLoggingServer:
    """Encapsulates the lifetime of the shared storage log writer."""

    manager: SyncManager
    server: Any
    server_thread: threading.Thread
    queue: multiprocessing.Queue
    listener: logging.handlers.QueueListener
    handler: logging.Handler
    authkey: bytes

    def env(self) -> Dict[str, str]:
        host, port = self.server.address  # type: ignore[misc]
        return {
            STORAGE_QUEUE_ADDR_ENV: f"{host}:{port}",
            STORAGE_QUEUE_AUTH_ENV: base64.b64encode(self.authkey).decode("ascii"),
        }

    def stop(self) -> None:
        """Stop the listener and shut down the manager cleanly."""
        try:
            self.listener.stop()
        finally:
            self.handler.close()
            try:
                self.server.stop_event.set()
                self.server_thread.join(timeout=5)
            except Exception:
                pass


_CLIENT_MANAGER: Optional[SyncManager] = None
_CLIENT_QUEUE = None


def start_storage_logging_server(log_path: Path) -> StorageLoggingServer:
    """Launch a background queue listener that owns storage.log rotations."""
    global _MANAGED_QUEUE
    log_path = Path(log_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    _MANAGED_QUEUE = multiprocessing.Queue(-1)
    authkey = secrets.token_bytes(16)
    manager = _StorageQueueManager(address=("127.0.0.1", 0), authkey=authkey)
    server = manager.get_server()
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    handler = logging.handlers.TimedRotatingFileHandler(
        log_path,
        when="midnight",
        backupCount=7,
        encoding="utf-8",
    )
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    handler.setFormatter(formatter)
    listener = logging.handlers.QueueListener(_MANAGED_QUEUE, handler)
    listener.start()

    return StorageLoggingServer(manager, server, server_thread, _MANAGED_QUEUE, listener, handler, authkey)


def _connect_to_storage_queue() -> Optional[object]:
    """Connect to the shared queue using environment hints."""
    global _CLIENT_MANAGER, _CLIENT_QUEUE
    if _CLIENT_QUEUE is not None:
        return _CLIENT_QUEUE

    addr = os.environ.get(STORAGE_QUEUE_ADDR_ENV)
    auth = os.environ.get(STORAGE_QUEUE_AUTH_ENV)
    if not addr or not auth:
        return None
    try:
        host, port_str = addr.rsplit(":", 1)
        port = int(port_str)
        authkey = base64.b64decode(auth.encode("ascii"))
    except (ValueError, base64.binascii.Error):
        return None

    manager = _StorageQueueClient(address=(host, port), authkey=authkey)
    try:
        manager.connect()
        queue = manager.get_queue()
    except (ConnectionError, OSError):
        return None

    _CLIENT_MANAGER = manager
    _CLIENT_QUEUE = queue
    return queue


def configure_storage_logger(logger: logging.Logger, log_path: Optional[Path] = None) -> None:
    """Attach either the shared queue handler or a local fallback handler."""
    queue = _connect_to_storage_queue()
    if queue is not None:
        if not any(isinstance(handler, logging.handlers.QueueHandler) for handler in logger.handlers):
            handler = logging.handlers.QueueHandler(queue)
            logger.addHandler(handler)
        logger.propagate = False
        return

    if any(isinstance(handler, logging.handlers.TimedRotatingFileHandler) for handler in logger.handlers):
        return

    target = log_path or Path("logs") / "storage.log"
    target.parent.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.TimedRotatingFileHandler(
        target,
        when="midnight",
        backupCount=7,
        encoding="utf-8",
    )
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
