from __future__ import annotations

import re
from pathlib import Path


def split_markdown(source: Path) -> None:
    """Split a consolidated '年报数据.md' into per-slide files plus an index."""
    if not source.exists():
        raise FileNotFoundError(source)
    slides_dir = source.parent / "slides"
    slides_dir.mkdir(parents=True, exist_ok=True)

    sections: list[tuple[int, str, list[str]]] = []
    pattern = re.compile(r"^##\s+Slide\s+(\d+):\s*(.*)$")
    current_lines: list[str] | None = None
    current_num: int | None = None
    current_title: str | None = None

    for line in source.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match:
            if current_lines is not None and current_num is not None and current_title is not None:
                sections.append((current_num, current_title, current_lines))
            current_num = int(match.group(1))
            current_title = match.group(2).strip()
            current_lines = [line]
        else:
            if current_lines is not None:
                current_lines.append(line)
    if current_lines is not None and current_num is not None and current_title is not None:
        sections.append((current_num, current_title, current_lines))

    if not sections:
        raise ValueError("未检测到任何 '## Slide X:' 段落，无法拆分。")

    index_lines = [
        "# 年报图表数据索引",
        "",
        "数据表拆分为每页独立文件，按需打开以避免单个 Markdown 过大。",
        "",
    ]

    for num, title, lines in sorted(sections, key=lambda item: item[0]):
        relative_name = f"slide-{num:02d}.md"
        target = slides_dir / relative_name
        section = "\n".join(lines).strip()
        section_lines = section.splitlines()
        if section_lines:
            header = section_lines[0]
            if header.startswith("##"):
                section_lines[0] = "# " + header[3:]
        target.write_text("\n".join(section_lines).strip() + "\n", encoding="utf-8")
        index_lines.append(f"- [Slide {num}: {title}](slides/{relative_name})")

    index_lines.append("")
    source.write_text("\n".join(index_lines), encoding="utf-8")


if __name__ == "__main__":
    base = Path("docs") / "年报" / "年报数据.md"
    split_markdown(base)
