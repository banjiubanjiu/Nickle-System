#!/usr/bin/env python
from __future__ import annotations

import argparse
import io
import json
import math
import posixpath
import re
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path, PurePosixPath
from typing import Dict, Iterable, List, Optional, Tuple
import xml.etree.ElementTree as ET

CHART_NS = {"c": "http://schemas.openxmlformats.org/drawingml/2006/chart"}
DRAWING_NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
PRESENTATION_NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
PKG_REL_NS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
SHEET_NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

EXCEL_DATE_BASE = datetime(1899, 12, 30)


def excel_serial_to_iso(value: float) -> str:
    return (EXCEL_DATE_BASE + timedelta(days=value)).strftime("%Y-%m-%d")


def col_to_index(col: str) -> int:
    idx = 0
    for ch in col:
        idx = idx * 26 + (ord(ch) - 64)
    return idx


CELL_RE = re.compile(r"\$?([A-Z]+)\$?(\d+)")


def parse_cell(ref: str) -> Tuple[int, int]:
    ref = ref.upper()
    match = CELL_RE.match(ref)
    if not match:
        raise ValueError(f"Unsupported cell reference: {ref}")
    col = col_to_index(match.group(1))
    row = int(match.group(2))
    return col, row


def parse_formula(formula: str) -> Tuple[str, Tuple[int, int], Tuple[int, int]]:
    if "!" not in formula:
        raise ValueError(f"Formula without sheet reference: {formula}")
    sheet, cells = formula.split("!", 1)
    sheet = sheet.strip().strip("'")
    cells = cells.replace("$", "")
    if ":" in cells:
        start_ref, end_ref = cells.split(":", 1)
    else:
        start_ref = end_ref = cells
    start = parse_cell(start_ref)
    end = parse_cell(end_ref)
    start_col, start_row = start
    end_col, end_row = end
    if start_col > end_col:
        start_col, end_col = end_col, start_col
    if start_row > end_row:
        start_row, end_row = end_row, start_row
    return sheet, (start_col, start_row), (end_col, end_row)


@dataclass
class SeriesData:
    name: str
    values: List[Optional[float | str]]
    range_ref: Optional[str]
    color: Optional[str]
    chart_type: Optional[str] = None


@dataclass
class ChartData:
    chart_path: str
    chart_type: str
    slides: List[int]
    slide_titles: List[str]
    chart_title: Optional[str]
    workbook_path: Optional[str]
    category_values: List[Optional[str | float]]
    category_ref: Optional[str]
    series: List[SeriesData]
    notes: List[str]
    has_date_axis: bool


class EmbeddedWorkbook:
    def __init__(self, name: str, data: bytes):
        self.name = name
        self._data = data
        self._zip = zipfile.ZipFile(io.BytesIO(data))
        self._shared_strings = self._load_shared_strings()
        self._sheet_paths = self._load_sheet_paths()
        self._sheet_cache: Dict[str, Dict[int, Dict[int, Optional[float | str]]]] = {}

    def _load_shared_strings(self) -> List[str]:
        path = "xl/sharedStrings.xml"
        if path not in self._zip.namelist():
            return []
        root = ET.fromstring(self._zip.read(path))
        values: List[str] = []
        for si in root.findall("s:si", SHEET_NS):
            text_parts = [node.text or "" for node in si.findall(".//s:t", SHEET_NS)]
            values.append("".join(text_parts))
        return values

    def _load_sheet_paths(self) -> Dict[str, str]:
        workbook_xml = ET.fromstring(self._zip.read("xl/workbook.xml"))
        rels_xml = ET.fromstring(self._zip.read("xl/_rels/workbook.xml.rels"))
        rels: Dict[str, str] = {}
        for rel in rels_xml.findall("rel:Relationship", PKG_REL_NS):
            rels[rel.get("Id")] = rel.get("Target")
        sheet_paths: Dict[str, str] = {}
        for sheet in workbook_xml.findall("s:sheets/s:sheet", SHEET_NS):
            name = sheet.get("name")
            rel_id = sheet.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            if name and rel_id and rel_id in rels:
                target = rels[rel_id]
                if not target.startswith("xl/"):
                    target = f"xl/{target}"
                sheet_paths[name] = target
        return sheet_paths

    def _load_sheet(self, sheet_name: str) -> Dict[int, Dict[int, Optional[float | str]]]:
        if sheet_name in self._sheet_cache:
            return self._sheet_cache[sheet_name]
        path = self._sheet_paths.get(sheet_name)
        if not path:
            raise KeyError(f"Sheet {sheet_name} not found in workbook {self.name}")
        root = ET.fromstring(self._zip.read(path))
        data: Dict[int, Dict[int, Optional[float | str]]] = {}
        for row in root.findall(".//s:row", SHEET_NS):
            row_idx = int(row.get("r", "0"))
            row_values: Dict[int, Optional[float | str]] = {}
            for cell in row.findall("s:c", SHEET_NS):
                ref = cell.get("r")
                if not ref:
                    continue
                col_letters = re.match(r"[A-Z]+", ref).group()
                col_idx = col_to_index(col_letters)
                value = self._read_cell(cell)
                row_values[col_idx] = value
            if row_values:
                data[row_idx] = row_values
        self._sheet_cache[sheet_name] = data
        return data

    def _read_cell(self, cell: ET.Element) -> Optional[float | str]:
        cell_type = cell.get("t")
        value_node = cell.find("s:v", SHEET_NS)
        if cell_type == "s" and value_node is not None:
            try:
                return self._shared_strings[int(value_node.text)]
            except (ValueError, IndexError):
                return value_node.text
        if cell_type == "b" and value_node is not None:
            return "TRUE" if value_node.text == "1" else "FALSE"
        if cell_type == "str" and value_node is not None:
            return value_node.text
        inline = cell.find("s:is", SHEET_NS)
        if inline is not None:
            parts = [node.text or "" for node in inline.findall(".//s:t", SHEET_NS)]
            return "".join(parts)
        if value_node is None:
            return None
        text = value_node.text
        if text is None:
            return None
        try:
            return float(text)
        except ValueError:
            return text

    def get_range(self, formula: str) -> List[List[Optional[float | str]]]:
        sheet_name, (start_col, start_row), (end_col, end_row) = parse_formula(formula)
        sheet = self._load_sheet(sheet_name)
        values: List[List[Optional[float | str]]] = []
        for row_idx in range(start_row, end_row + 1):
            row_values: List[Optional[float | str]] = []
            row = sheet.get(row_idx, {})
            for col_idx in range(start_col, end_col + 1):
                row_values.append(row.get(col_idx))
            values.append(row_values)
        return values

    def flatten_range(self, formula: str) -> List[Optional[float | str]]:
        range_values = self.get_range(formula)
        if not range_values:
            return []
        if len(range_values[0]) == 1:
            return [row[0] for row in range_values]
        flattened: List[Optional[float | str]] = []
        for row in range_values:
            flattened.extend(row)
        return flattened


def load_slide_titles(ppt: zipfile.ZipFile) -> Dict[int, str]:
    titles: Dict[int, str] = {}
    for name in ppt.namelist():
        if not name.startswith("ppt/slides/slide"):
            continue
        slide_num = int(PurePosixPath(name).stem.replace("slide", ""))
        xml = ET.fromstring(ppt.read(name))
        title = extract_slide_title(xml)
        titles[slide_num] = title
    return titles


def extract_slide_title(root: ET.Element) -> str:
    def text_from_shape(shape: ET.Element) -> str:
        texts = [node.text or "" for node in shape.findall(".//a:t", DRAWING_NS)]
        return "".join(texts).strip()

    for shape in root.findall(".//p:sp", PRESENTATION_NS):
        ph = shape.find(".//p:nvSpPr/p:nvPr/p:ph", PRESENTATION_NS)
        if ph is not None and ph.get("type") in {"title", "ctrTitle", "subTitle"}:
            text = text_from_shape(shape)
            if text:
                return text
    for shape in root.findall(".//p:sp", PRESENTATION_NS):
        text = text_from_shape(shape)
        if text:
            return text
    return ""


def map_charts_to_slides(ppt: zipfile.ZipFile) -> Dict[str, List[int]]:
    mapping: Dict[str, List[int]] = defaultdict(list)
    for name in ppt.namelist():
        if not name.startswith("ppt/slides/_rels/slide") or not name.endswith(".rels"):
            continue
        slide_num = int(PurePosixPath(name).stem.replace("slide", "").split(".")[0])
        rels = ET.fromstring(ppt.read(name))
        slide_path = name.replace("_rels/", "")
        if slide_path.endswith(".rels"):
            slide_path = slide_path[:-5]
        base_dir = posixpath.dirname(slide_path)
        for rel in rels.findall("rel:Relationship", PKG_REL_NS):
            rtype = rel.get("Type", "")
            if "relationships/chart" not in rtype:
                continue
            target = rel.get("Target")
            if not target:
                continue
            chart_path = posixpath.normpath(posixpath.join(base_dir, target))
            if chart_path not in mapping[chart_path]:
                mapping[chart_path].append(slide_num)
    for chart, slides in mapping.items():
        slides.sort()
    return mapping


def normalize_path(base: str, target: str) -> str:
    joined = posixpath.join(posixpath.dirname(base), target)
    return posixpath.normpath(joined)


def load_workbooks(ppt: zipfile.ZipFile) -> Dict[str, EmbeddedWorkbook]:
    workbooks: Dict[str, EmbeddedWorkbook] = {}
    for name in ppt.namelist():
        if not name.startswith("ppt/embeddings/") or not name.endswith(".xlsx"):
            continue
        workbooks[name] = EmbeddedWorkbook(name, ppt.read(name))
    return workbooks


def get_chart_workbook(ppt: zipfile.ZipFile, chart_path: str, workbooks: Dict[str, EmbeddedWorkbook]) -> Optional[EmbeddedWorkbook]:
    rel_path = f"{posixpath.dirname(chart_path)}/_rels/{posixpath.basename(chart_path)}.rels"
    if rel_path not in ppt.namelist():
        return None
    rels = ET.fromstring(ppt.read(rel_path))
    for rel in rels.findall("rel:Relationship", PKG_REL_NS):
        if rel.get("Type") == "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package":
            target = rel.get("Target")
            if not target:
                continue
            normalized = normalize_path(chart_path, target)
            workbook = workbooks.get(normalized)
            if workbook:
                return workbook
    return None


def load_theme_colors(ppt: zipfile.ZipFile) -> Dict[str, str]:
    colors: Dict[str, str] = {}
    for name in ppt.namelist():
        if not name.startswith("ppt/theme/theme") or not name.endswith(".xml"):
            continue
        root = ET.fromstring(ppt.read(name))
        for idx in range(1, 11):
            node = root.find(f".//a:accent{idx}", DRAWING_NS)
            if node is None:
                continue
            srgb = node.find("a:srgbClr", DRAWING_NS)
            if srgb is not None and srgb.get("val"):
                colors[f"accent{idx}"] = f"#{srgb.get('val')}"
        break
    return colors


def extract_chart_data(
    ppt: zipfile.ZipFile,
    chart_path: str,
    slide_map: Dict[str, List[int]],
    slide_titles: Dict[int, str],
    workbooks: Dict[str, EmbeddedWorkbook],
    theme_colors: Dict[str, str],
) -> ChartData:
    root = ET.fromstring(ppt.read(chart_path))
    plot_area = root.find("c:chart/c:plotArea", CHART_NS)
    chart_type = "unknown"
    ser_parent = None
    if plot_area is not None:
        for child in plot_area:
            tag = child.tag.split("}")[-1]
            if tag.endswith("Chart") and child.findall("c:ser", CHART_NS):
                chart_type = tag
                ser_parent = child
                break
    chart_title_el = root.find(".//c:title//a:t", {**CHART_NS, **DRAWING_NS})
    chart_title = chart_title_el.text.strip() if chart_title_el is not None else None
    workbook = get_chart_workbook(ppt, chart_path, workbooks)
    workbook_path = workbook.name if workbook else None
    series_data: List[SeriesData] = []
    cat_values: List[Optional[float | str]] = []
    cat_formula = None
    notes: List[str] = []
    has_date_axis = root.find(".//c:dateAx", CHART_NS) is not None

    def read_axis_data(node: ET.Element, expect_string: bool = False) -> Tuple[List[Optional[float | str]], Optional[str]]:
        if node is None:
            return [], None
        ref = node.find("c:strRef", CHART_NS)
        if ref is None:
            ref = node.find("c:numRef", CHART_NS)
        lit = node.find("c:strLit", CHART_NS)
        if lit is None:
            lit = node.find("c:numLit", CHART_NS)
        cache = node.find("c:strCache", CHART_NS)
        if cache is None:
            cache = node.find("c:numCache", CHART_NS)
        if ref is not None:
            formula_el = ref.find("c:f", CHART_NS)
            formula = formula_el.text if formula_el is not None else None
            values: List[Optional[float | str]] = []
            if workbook and formula:
                try:
                    values = workbook.flatten_range(formula)
                except Exception as exc:
                    notes.append(f"无法解析公式 {formula}: {exc}")
            if not values and cache is not None:
                pts = cache.findall("c:pt", CHART_NS)
                values = [pt.findtext("c:v", default="", namespaces=CHART_NS) for pt in pts]
                if not expect_string:
                    values = [float(v) if v not in ("", None) else None for v in values]
            return values, formula
        if lit is not None:
            pts = lit.findall("c:pt", CHART_NS)
            values = [pt.findtext("c:v", default="", namespaces=CHART_NS) for pt in pts]
            if not expect_string:
                values = [float(v) if v not in ("", None) else None for v in values]
            return values, None
        return [], None

    if ser_parent is not None:
        first_ser = ser_parent.find("c:ser", CHART_NS)
        if first_ser is not None:
            cat_node = first_ser.find("c:cat", CHART_NS)
            if cat_node is not None:
                expect_string = cat_node.find("c:strRef", CHART_NS) is not None
                cat_values, cat_formula = read_axis_data(cat_node, expect_string=expect_string)

        for ser in ser_parent.findall("c:ser", CHART_NS):
            tx = ser.find("c:tx", CHART_NS)
            series_name = "Series"
            name_formula = None

            if tx is not None:
                text_node = tx.find(".//c:v", CHART_NS)
                if text_node is not None and text_node.text:
                    series_name = text_node.text
                else:
                    tx_values, name_formula = read_axis_data(tx, expect_string=True)
                    if tx_values:
                        series_name = str(tx_values[0])
            val_node = ser.find("c:val", CHART_NS)
            values, value_formula = read_axis_data(val_node)
            sp_pr = ser.find("c:spPr", CHART_NS)
            color = None
            if sp_pr is not None:
                srgb = sp_pr.find(".//a:solidFill/a:srgbClr", DRAWING_NS)
                if srgb is not None:
                    color = f"#{srgb.get('val')}"
                else:
                    scheme = sp_pr.find(".//a:solidFill/a:schemeClr", DRAWING_NS)
                    if scheme is not None:
                        scheme_name = scheme.get("val")
                        if scheme_name and scheme_name in theme_colors:
                            color = theme_colors[scheme_name]
                        else:
                            color = f"scheme:{scheme_name}"
            series_data.append(
                SeriesData(
                    name=series_name,
                    values=values,
                    range_ref=value_formula,
                    color=color,
                )
            )
            if name_formula and not series_name:
                notes.append(f"系列名称引用 {name_formula}")

    slides = slide_map.get(chart_path, [])
    slide_titles_list = [slide_titles.get(num, "") for num in slides]

    if has_date_axis:
        converted: List[Optional[str]] = []
        for val in cat_values:
            if isinstance(val, (int, float)):
                converted.append(excel_serial_to_iso(float(val)))
            else:
                converted.append(val)
        cat_values = converted

    return ChartData(
        chart_path=chart_path,
        chart_type=chart_type,
        slides=slides,
        slide_titles=slide_titles_list,
        chart_title=chart_title,
        workbook_path=workbook_path,
        category_values=cat_values,
        category_ref=cat_formula,
        series=series_data,
        notes=notes,
        has_date_axis=has_date_axis,
    )


def format_value(value: Optional[float | str]) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if float(value).is_integer():
        return f"{int(value)}"
    return f"{value:.6f}".rstrip("0").rstrip(".")






def group_charts_by_slide(charts: List[ChartData]) -> Dict[int, List[ChartData]]:
    grouped: Dict[int, List[ChartData]] = defaultdict(list)
    for chart in charts:
        if chart.slides:
            for slide in chart.slides:
                grouped[slide].append(chart)
        else:
            grouped[0].append(chart)
    return grouped


def resolve_slide_title(slide: int, charts: List[ChartData]) -> str:
    if slide == 0:
        return "Charts Without Slide Reference"
    candidates = [title for chart in charts for title in chart.slide_titles if title]
    return candidates[0] if candidates else ""


def collect_numeric_values(chart: ChartData) -> List[float]:
    values: List[float] = []
    for series in chart.series:
        for value in series.values:
            if isinstance(value, (int, float)) and not math.isnan(float(value)):
                values.append(float(value))
    return values


def suggest_axis_domain(values: List[float]) -> Tuple[float, float]:
    data_min = min(values)
    data_max = max(values)
    if data_min == data_max:
        if data_min == 0:
            return 0.0, 1.0
        padding = abs(data_min) * 0.1 or 1.0
        return data_min - padding, data_max + padding
    span = data_max - data_min
    order = math.floor(math.log10(span)) if span > 0 else 0
    if span >= 10:
        order -= 1
    order = max(min(order, 4), -2)
    step = 10 ** order
    lower = math.floor(data_min / step) * step
    upper = math.ceil(data_max / step) * step
    if data_min >= 0:
        lower = max(0.0, lower)
    if upper - lower < step:
        upper = lower + step
    if data_max - upper < 0.25 * step:
        upper += step
    return lower, upper


def build_value_range(chart: ChartData) -> Optional[Dict[str, float]]:
    values = collect_numeric_values(chart)
    if not values:
        return None
    suggested_min, suggested_max = suggest_axis_domain(values)
    return {
        "dataMin": min(values),
        "dataMax": max(values),
        "suggestedMin": suggested_min,
        "suggestedMax": suggested_max,
    }


def build_json_payloads(charts: List[ChartData]) -> Dict[int, Dict[str, object]]:
    grouped = group_charts_by_slide(charts)
    payloads: Dict[int, Dict[str, object]] = {}
    for slide, chart_list in grouped.items():
        slide_title = resolve_slide_title(slide, chart_list)
        chart_payloads = []
        for chart in sorted(chart_list, key=lambda c: c.chart_path):
            payload = {
                "chartPath": chart.chart_path,
                "chartType": chart.chart_type,
                "title": chart.chart_title,
                "workbook": chart.workbook_path,
                "categoryLabels": chart.category_values,
                "categoryRange": chart.category_ref,
                "series": [
                    {
                        "name": series.name,
                        "values": series.values,
                        "range": series.range_ref,
                        "color": series.color,
                    }
                    for series in chart.series
                ],
                "notes": chart.notes,
                "hasDateAxis": chart.has_date_axis,
            }
            value_range = build_value_range(chart)
            if value_range:
                payload["valueRange"] = {
                    key: round(value, 6) for key, value in value_range.items()
                }
            chart_payloads.append(payload)
        payloads[slide] = {
            "slide": slide,
            "title": slide_title,
            "charts": chart_payloads,
        }
    return payloads


def write_json_payloads(json_dir: Path, payloads: Dict[int, Dict[str, object]]) -> None:
    json_dir.mkdir(parents=True, exist_ok=True)
    for slide, payload in payloads.items():
        filename = f"slide-{slide:02d}.json" if slide > 0 else "slide-00.json"
        (json_dir / filename).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def build_markdown(charts: List[ChartData]) -> str:
    by_slide = group_charts_by_slide(charts)

    lines: List[str] = [
        '# Annual Report Chart Data',
        '',
        '> Generated via scripts/extract_ppt_charts.py using embedded Excel ranges.',
        '',
    ]

    for slide in sorted(by_slide):
        slide_title = resolve_slide_title(slide, by_slide[slide])
        if slide == 0:
            lines.append('## Charts Without Slide Reference')
        else:
            heading = f'## Slide {slide}'
            if slide_title:
                heading += f': {slide_title}'
            lines.append(heading)
        lines.append('')

        for chart in sorted(by_slide[slide], key=lambda c: c.chart_path):
            chart_heading = f"### {chart.chart_path.split('/')[-1]}"
            if chart.chart_title:
                chart_heading += f' ({chart.chart_title})'
            lines.append(chart_heading)
            lines.append('')

            bullet_lines = [
                f'- Chart type: {chart.chart_type}',
            ]
            if chart.workbook_path:
                bullet_lines.append(f'- Data source: {chart.workbook_path}')
            if chart.category_ref:
                bullet_lines.append(f'- Category range: {chart.category_ref}')

            series_desc = []
            for series in chart.series:
                desc = f'{series.name}'
                if series.range_ref:
                    desc += f' ({series.range_ref})'
                if series.color:
                    desc += f', color {series.color}'
                series_desc.append(desc)
            if series_desc:
                bullet_lines.append('- Series: ' + '; '.join(series_desc))
            if chart.notes:
                bullet_lines.append('- Notes: ' + '; '.join(chart.notes))

            lines.extend(bullet_lines)
            lines.append('')

            if chart.category_values and chart.series:
                header = ['Category'] + [s.name for s in chart.series]
                lines.append('| ' + ' | '.join(header) + ' |')
                lines.append('| ' + ' | '.join(['---'] * len(header)) + ' |')
                row_count = max(len(chart.category_values), *(len(s.values) for s in chart.series))
                for idx in range(row_count):
                    row_values = []
                    if idx < len(chart.category_values):
                        row_values.append(format_value(chart.category_values[idx]))
                    else:
                        row_values.append('')
                    for series in chart.series:
                        value = series.values[idx] if idx < len(series.values) else None
                        row_values.append(format_value(value))
                    lines.append('| ' + ' | '.join(row_values) + ' |')
                lines.append('')
            else:
                lines.append('_(no structured data detected)_')
                lines.append('')
    return "\n".join(lines).strip() + "\n"

def main() -> None:
    parser = argparse.ArgumentParser(description="Extract chart data from a PPTX file.")
    parser.add_argument("pptx", type=Path, help="Path to PPTX file.")
    parser.add_argument("output", type=Path, help="Output markdown path.")
    parser.add_argument(
        "--json-dir",
        type=Path,
        help="Optional directory to write per-slide JSON payloads.",
    )
    args = parser.parse_args()

    with zipfile.ZipFile(args.pptx) as ppt:
        slide_titles = load_slide_titles(ppt)
        slide_chart_map = map_charts_to_slides(ppt)
        workbooks = load_workbooks(ppt)
        chart_paths = sorted(name for name in ppt.namelist() if name.startswith("ppt/charts/chart") and name.endswith(".xml"))
        theme_colors = load_theme_colors(ppt)
        charts: List[ChartData] = []
        for chart_path in chart_paths:
            charts.append(extract_chart_data(ppt, chart_path, slide_chart_map, slide_titles, workbooks, theme_colors))
        markdown = build_markdown(charts)
    args.output.write_text(markdown, encoding="utf-8")
    if args.json_dir:
        payloads = build_json_payloads(charts)
        write_json_payloads(args.json_dir, payloads)


if __name__ == "__main__":
    main()
