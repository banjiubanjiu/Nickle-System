#!/usr/bin/env python
from __future__ import annotations

import json
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

from extract_ppt_charts import (
    CHART_NS,
    DRAWING_NS,
    excel_serial_to_iso,
    get_chart_workbook,
    load_workbooks,
)

CHART_PATH = "ppt/charts/chart6.xml"


@dataclass
class SeriesPayload:
    name: str
    values: List[Optional[float]]
    color: Optional[str]
    render_as: str


def find_pptx(root: Path) -> Path:
    for candidate in root.rglob("*.pptx"):
        if candidate.name.startswith("~$"):
            continue
        return candidate
    raise SystemExit("Unable to locate PPTX under docs/")


def read_axis_values(node: ET.Element | None, workbook) -> List[Optional[float]]:
    if node is None:
        return []
    ref = node.find("c:numRef", CHART_NS)
    values: List[Optional[float]] = []
    formula = None
    if ref is not None:
        formula_el = ref.find("c:f", CHART_NS)
        formula = formula_el.text if formula_el is not None else None
        if workbook and formula:
            values = workbook.flatten_range(formula)
    if not values:
        cache = None
        if ref is not None:
            cache = ref.find("c:numCache", CHART_NS)
        else:
            lit = node.find("c:numLit", CHART_NS)
            if lit is not None:
                cache = lit
        if cache is not None:
            pts = cache.findall("c:pt", CHART_NS)
            parsed: List[Optional[float]] = []
            for pt in pts:
                text = pt.findtext("c:v", default="", namespaces=CHART_NS)
                if text in ("", None):
                    parsed.append(None)
                else:
                    try:
                        parsed.append(float(text))
                    except ValueError:
                        parsed.append(None)
            values = parsed
    return values


def read_category_values(node: ET.Element | None, workbook, has_date_axis: bool) -> List[Optional[str]]:
    if node is None:
        return []
    ref = node.find("c:numRef", CHART_NS)
    if ref is None:
        ref = node.find("c:strRef", CHART_NS)
    values: List[Optional[str | float]] = []
    if ref is not None:
        formula_el = ref.find("c:f", CHART_NS)
        formula = formula_el.text if formula_el is not None else None
        if workbook and formula:
            values = workbook.flatten_range(formula)
    if not values:
        cache = ref.find("c:numCache", CHART_NS) if ref is not None else None
        if cache is None and ref is not None:
            cache = ref.find("c:strCache", CHART_NS)
        if cache is None:
            lit = node.find("c:numLit", CHART_NS) or node.find("c:strLit", CHART_NS)
            cache = lit
        if cache is not None:
            pts = cache.findall("c:pt", CHART_NS)
            values = [pt.findtext("c:v", default="", namespaces=CHART_NS) for pt in pts]

    normalized: List[Optional[str]] = []
    for value in values:
        if isinstance(value, (int, float)):
            if has_date_axis:
                normalized.append(excel_serial_to_iso(float(value)))
            else:
                normalized.append(str(value))
        else:
            normalized.append(value)
    return normalized


def extract_color(ser: ET.Element) -> Optional[str]:
    sp_pr = ser.find("c:spPr", CHART_NS)
    if sp_pr is None:
        return None
    srgb = sp_pr.find(".//a:solidFill/a:srgbClr", DRAWING_NS)
    if srgb is not None and srgb.get("val"):
        return f"#{srgb.get('val')}"
    scheme = sp_pr.find(".//a:solidFill/a:schemeClr", DRAWING_NS)
    if scheme is not None and scheme.get("val"):
        return f"scheme:{scheme.get('val')}"
    return None


def extract_series_from_chart(ppt_path: Path) -> Tuple[List[Optional[str]], List[SeriesPayload]]:
    with zipfile.ZipFile(ppt_path) as ppt:
        workbooks = load_workbooks(ppt)
        workbook = get_chart_workbook(ppt, CHART_PATH, workbooks)
        if not workbook:
            raise SystemExit("Embedded workbook for chart6.xml not found.")
        root = ET.fromstring(ppt.read(CHART_PATH))
        plot_area = root.find("c:chart/c:plotArea", CHART_NS)
        if plot_area is None:
            raise SystemExit("plotArea missing from chart6.xml")
        has_date_axis = root.find(".//c:dateAx", CHART_NS) is not None
        categories: List[Optional[str]] = []
        payloads: List[SeriesPayload] = []
        for child in plot_area:
            tag = child.tag.split("}")[-1]
            if not tag.endswith("Chart"):
                continue
            render_as = "line" if "line" in tag.lower() else "bar"
            ser_nodes = child.findall("c:ser", CHART_NS)
            for index, ser in enumerate(ser_nodes):
                text_node = ser.find(".//a:t", {**CHART_NS, **DRAWING_NS})
                if text_node is not None and text_node.text:
                    name = text_node.text
                else:
                    name = ser.findtext(".//c:v", default=f"Series {index + 1}", namespaces=CHART_NS)
                if not categories:
                    categories = read_category_values(ser.find("c:cat", CHART_NS), workbook, has_date_axis)
                values = read_axis_values(ser.find("c:val", CHART_NS), workbook)
                payloads.append(
                    SeriesPayload(
                        name=name or f"Series {index + 1}",
                        values=values,
                        color=extract_color(ser),
                        render_as=render_as,
                    )
                )
        return categories, payloads


def update_slide_json(json_path: Path, categories: List[Optional[str]], series_payloads: List[SeriesPayload]) -> None:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    combo_chart = None
    for chart in data.get("charts", []):
        if chart.get("chartPath") == CHART_PATH:
            combo_chart = chart
            break
    if combo_chart is None:
        raise SystemExit(f"{json_path} does not contain {CHART_PATH}")

    if categories:
        combo_chart["categoryLabels"] = categories
    combo_chart["chartType"] = "comboChart"
    combo_chart["series"] = []
    numeric_values: List[float] = []
    for payload in series_payloads:
        combo_chart["series"].append(
            {
                "name": payload.name,
                "values": payload.values,
                "color": payload.color,
                "renderAs": payload.render_as,
            }
        )
        numeric_values.extend([value for value in payload.values if isinstance(value, (int, float))])
    if numeric_values:
        combo_chart["valueRange"] = {
            "dataMin": min(numeric_values),
            "dataMax": max(numeric_values),
        }
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    ppt_path = find_pptx(repo_root / "docs")
    categories, series_payloads = extract_series_from_chart(ppt_path)
    json_path = repo_root / "frontend" / "public" / "yearly" / "slide-06.json"
    update_slide_json(json_path, categories, series_payloads)
    print(f"Updated slide-06 combo chart from {ppt_path.name}")


if __name__ == "__main__":
    main()
