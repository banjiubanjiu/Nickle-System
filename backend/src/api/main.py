from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from swagger_ui_bundle import swagger_ui_path

from backend.src.api.deps import ensure_storage, get_intraday_reader
from backend.src.api.routers import dashboard
from backend.src.storage import get_intraday_interval_seconds, get_retention_hours

LOGGER = logging.getLogger("nickel.api")

app = FastAPI(
    title="Nickel Dashboard API",
    version="0.1.0",
    description="APIs for realtime and historical nickel data.",
)

# Serve the bundled Swagger UI assets directly from the local bundle path.
app.mount("/_swagger/static", StaticFiles(directory=swagger_ui_path), name="swagger_ui_static")


@app.on_event("startup")
async def startup_event() -> None:
    """Initialise dependencies that must be ready before the API begins serving."""
    ensure_storage()
    LOGGER.info("API startup completed, storage ready.")


@app.get("/health", tags=["health"])
def health_check(intraday=Depends(get_intraday_reader)) -> Dict[str, Any]:
    """Provide a basic readiness probe with the latest intraday snapshot metadata."""
    record: Optional[Dict[str, Any]] = intraday["get_latest_intraday"]("lme")
    latest_timestamp = record.get("captured_at") if record else None
    return {
        "status": "ok",
        "database": "ready",
        "latest_lme_snapshot": latest_timestamp,
        "intraday_interval_seconds": get_intraday_interval_seconds(),
        "retention_hours": get_retention_hours(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


app.include_router(dashboard.router)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    """Redirect visitors of the bare root to the interactive API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/docs", include_in_schema=False)
def swagger_ui():
    """Serve the Swagger UI that proxies to FastAPI's generated OpenAPI schema."""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Docs",
        swagger_js_url="/_swagger/static/swagger-ui-bundle.js",
        swagger_css_url="/_swagger/static/swagger-ui.css",
        swagger_favicon_url="/_swagger/static/favicon-32x32.png",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.src.api.main:app", host="127.0.0.1", port=8000, reload=True)
