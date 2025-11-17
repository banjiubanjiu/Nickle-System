#!/usr/bin/env python
"""
Convenience script to launch the scheduler and API server together.

Usage:
    python run_all.py
Optional flags:
    --no-scheduler        仅启动 API，不运行调度器
    --no-api              仅运行调度器
    --host 0.0.0.0        API 监听地址（默认 127.0.0.1）
    --port 8000           API 端口
    --no-reload           关闭 uvicorn 的自动重载
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.src.logging import StorageLoggingServer, start_storage_logging_server


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run scheduler and API together.")
    parser.add_argument("--no-scheduler", action="store_true", help="Only run API server.")
    parser.add_argument("--no-api", action="store_true", help="Only run scheduler.")
    parser.add_argument("--host", default="127.0.0.1", help="API host (default: 127.0.0.1).")
    parser.add_argument("--port", type=int, default=8000, help="API port (default: 8000).")
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable uvicorn reload (default enabled for convenience).",
    )
    parser.add_argument(
        "--uvicorn-extra",
        nargs=argparse.REMAINDER,
        help="Extra args passed to uvicorn (after '--').",
    )
    return parser


def _launch_process(label: str, command: List[str], env: Optional[Dict[str, str]] = None) -> subprocess.Popen:
    print(f"[run_all] starting {label}: {' '.join(command)}")
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    return subprocess.Popen(command, env=process_env)


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    if args.no_scheduler and args.no_api:
        parser.error("Both --no-scheduler and --no-api provided; nothing to run.")

    processes: List[Tuple[str, subprocess.Popen]] = []

    log_server: Optional[StorageLoggingServer] = None

    try:
        log_server = start_storage_logging_server(Path("logs") / "storage.log")
        shared_env = log_server.env()
        print("[run_all] storage logging queue initialised")
    except Exception as exc:  # pragma: no cover - defensive fallback
        shared_env = {}
        print(f"[run_all] failed to start logging queue ({exc}), falling back to per-process logging")

    try:
        if not args.no_scheduler:
            scheduler_cmd = [sys.executable, "-m", "backend.src.tasks.scheduler"]
            processes.append(("scheduler", _launch_process("scheduler", scheduler_cmd, shared_env)))

        if not args.no_api:
            uvicorn_cmd = [
                sys.executable,
                "-m",
                "uvicorn",
                "backend.src.api.main:app",
                "--host",
                args.host,
                "--port",
                str(args.port),
            ]
            if not args.no_reload:
                uvicorn_cmd.append("--reload")
            if args.uvicorn_extra:
                uvicorn_cmd.extend(args.uvicorn_extra)
            processes.append(("uvicorn", _launch_process("uvicorn", uvicorn_cmd, shared_env)))

        if not processes:
            print("[run_all] nothing to run.")
            return

        # Wait for any process to exit
        while True:
            active = False
            for label, process in processes:
                retcode = process.poll()
                if retcode is not None:
                    print(f"[run_all] {label} exited with code {retcode}")
                    # terminate others
                    for other_label, other_process in processes:
                        if other_process is not process and other_process.poll() is None:
                            print(f"[run_all] terminating {other_label}")
                            other_process.terminate()
                    return
                else:
                    active = True
            if not active:
                return
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\n[run_all] interrupted, shutting down...")
    finally:
        for label, process in processes:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"[run_all] killing {label}")
                    process.kill()
        if log_server is not None:
            log_server.stop()


if __name__ == "__main__":
    main()
