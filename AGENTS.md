# Repository Guidelines

## Project Structure & Module Organization
Nickel-System splits responsibilities cleanly: `backend/src/collectors` pulls AkShare LME/SHFE feeds, `backend/src/tasks` schedules intraday/daily jobs, `backend/src/storage` owns sqlite persistence, and `backend/src/api` serves FastAPI routers plus the shared `APIResponse`. `frontend/src` mirrors dashboard features via `components`, `pages`, `services`, `data`, `styles`, and `types`. Long-form research and plans stay under `docs/`, runtime traces drop into `logs/`, and `run_all.py` launches scheduler + API in one shot.

## Build, Test, and Development Commands
`python -m venv .venv; .venv\Scripts\activate; pip install -r requirements.txt` readies the backend. `python run_all.py` runs both loops; `--no-api` or `--no-scheduler` focus on a single role. Use `python -m backend.src.tasks.scheduler --once intraday` or `--once daily` to replay jobs, and `uvicorn backend.src.api.main:app --reload --port 8000` to debug the API alone. Inside `frontend/`, run `npm install`, `npm run dev` for Vite hot reload, and `npm run build` before handing artifacts to ops.

## Coding Style & Naming Conventions
Target Python 3.10+, 4-space indents, snake_case modules, and type-hinted Pydantic models that always funnel responses through `APIResponse`. Keep scheduler entry points slim and isolate transformations in helpers (often `backend/src/storage`). Environment flags remain uppercase `NICKEL_*`. In React, use PascalCase for components under `src/components`, keep route files in `src/pages`, prefix hooks with `use`, and centralize HTTP calls through `services/dashboard.ts` instead of ad-hoc `axios` clients.

## Testing Guidelines
Automated coverage is minimal, so add backend specs with `pytest`, storing suites in `backend/tests/test_*.py` and stubbing AkShare I/O. As a quick regression check run `python -m backend.src.tasks.scheduler --once both` plus `sqlite3 storage/data.db "select count(*) from intraday_snapshots;"`. Frontend logic can be guarded with `vitest` + `@testing-library/react` (name files `*.test.tsx`) and should include representative payloads from `frontend/src/data`.

## Commit & Pull Request Guidelines
Recent history favors concise Chinese imperatives (`导航区居中bug`, `完成日报界面的排版`). Follow that tone, optionally prefixing with the domain (`collector: 修复 LME 时区`), and keep changes scoped. PRs must describe behavior, list the commands you ran (e.g., `python run_all.py`, `npm run build`), link issues or specs under `docs/design/`, and attach screenshots for any UI shifts.

## Security & Configuration Tips
Never commit `.env`; base new secrets on `.env.example`, fill `NICKEL_DATABASE_URL`, and keep tokens in your shell profile or CI store. Scrub sensitive payloads before sharing `logs/scheduler.log` or `logs/storage.log`. When exposing the dashboard, set `VITE_API_BASE_URL` explicitly and update CORS origins in `backend/src/api/main.py` before inviting external callers.
