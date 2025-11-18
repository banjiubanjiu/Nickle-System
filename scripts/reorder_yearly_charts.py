#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Sequence


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize yearly slide JSON so that category labels and series values follow chronological order.",
    )
    parser.add_argument(
        "files",
        nargs="+",
        help="Path(s) to yearly slide JSON files (e.g. frontend/public/yearly/slide-04.json).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only report which charts would be reordered without modifying files.",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indent to use when writing files (default: 2).",
    )
    return parser.parse_args()


def parse_iso_date(value: object) -> datetime | None:
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def build_chronological_order(labels: Sequence[object]) -> List[int] | None:
    keyed = []
    for idx, label in enumerate(labels):
        parsed = parse_iso_date(label)
        if parsed is None:
            return None
        keyed.append((parsed, idx))
    keyed.sort(key=lambda item: item[0])
    order = [idx for _, idx in keyed]
    if order == list(range(len(labels))):
        return None
    return order


def reorder_chart(chart: dict) -> bool:
    labels = chart.get("categoryLabels")
    if not isinstance(labels, list) or not labels:
        return False

    order = build_chronological_order(labels)
    if order is None:
        return False

    chart["categoryLabels"] = [labels[idx] for idx in order]

    for series in chart.get("series", []):
        values = series.get("values")
        if not isinstance(values, list):
            continue
        series["values"] = [values[idx] if idx < len(values) else None for idx in order]

    return True


def process_file(path: Path, dry_run: bool, indent: int) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    charts = data.get("charts")
    if not isinstance(charts, list):
        print(f"{path}: no charts array, skipped")
        return

    changed_indices: List[int] = []
    for idx, chart in enumerate(charts):
        if isinstance(chart, dict) and reorder_chart(chart):
            changed_indices.append(idx)

    if not changed_indices:
        print(f"{path}: already in chronological order or unsupported labels")
        return

    if not dry_run:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=indent) + "\n",
            encoding="utf-8",
        )

    print(f"{path}: reordered charts {', '.join(str(i) for i in changed_indices)}")


def main() -> None:
    args = parse_args()
    for file_path in args.files:
        process_file(Path(file_path), args.dry_run, args.indent)


if __name__ == "__main__":
    main()
