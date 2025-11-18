from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/yearly", tags=["yearly"])

YEARLY_DATA_DIR = Path(__file__).resolve().parents[3] / "resources" / "yearly_data"


def _ensure_data_dir() -> Path:
    if not YEARLY_DATA_DIR.exists():
        raise HTTPException(status_code=500, detail="Yearly data repository not initialised.")
    return YEARLY_DATA_DIR


def _load_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Slide not found.") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read {path.name}") from exc


def _resolve_slide_path(slide_id: str) -> Path:
    slide_id = slide_id.strip()
    if not slide_id:
        raise HTTPException(status_code=400, detail="Slide id must not be empty.")
    if not slide_id.isdigit():
        raise HTTPException(status_code=400, detail="Slide id must be numeric.")
    filename = f"slide-{int(slide_id):02d}.json"
    return _ensure_data_dir() / filename


@router.get("/slides")
def list_yearly_slides() -> Dict[str, List[Dict[str, Any]]]:
    """Return a lightweight index of available yearly report slides."""
    data_dir = _ensure_data_dir()
    slides: List[Dict[str, Any]] = []
    for file in sorted(data_dir.glob("slide-*.json")):
        payload = _load_json(file)
        slides.append(
            {
                "slide": payload.get("slide"),
                "title": payload.get("title"),
                "filename": file.name,
                "chart_count": len(payload.get("charts") or []),
            }
        )
    return {"slides": slides}


@router.get("/charts/{slide_id}")
def get_yearly_slide(slide_id: str) -> Dict[str, Any]:
    """Return the complete payload for a specific yearly report slide."""
    path = _resolve_slide_path(slide_id)
    return _load_json(path)
