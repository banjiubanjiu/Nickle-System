# Styles Overview

```
styles/
├── base.css          # Theme tokens (colors, typography), resets, global utilities.
├── layout.css        # Shared containers (dashboard-card, grid, panels, flex helpers).
├── components/       # Per-component skins, imported inside each React component.
└── pages/            # Route-specific layouts (dashboard, reports, etc.).
```

## Layering Guidelines

1. **Base (`base.css`)** – Only place globals here: CSS variables, body/#root styles, reset rules.
2. **Layout (`layout.css`)** – Reusable scaffolding (e.g. `.dashboard-card`, `.grid`, `.flex-between`). These classes expect to be combined with page/ component classes.
3. **Components** – One file per React component (`MetricCard.css`, `OrderBookPanel.css`, ...). If the component controls its own DOM structure, define its full appearance here.
4. **Pages** – Styles tied to a route/view (`pages/dashboard.css`, `pages/reports-*.css`). Keep page-specific layout or overrides here.

## Combination Notes

- `.dashboard-card` sets `display: flex; flex-direction: column`. Any derived layout (such as `.report-hero`, `.panels`) must override `display/flex-direction` explicitly if a different structure is needed.
- `.report-hero` in `pages/reports-base.css` is used together with `.dashboard-card` and contains two `.report-hero-row` children to align title/update (row 1) and subtitle/button (row 2). When adding new report types, reuse this structure to keep the four-corner layout consistent.
- Utility classes such as `.flex-between`, `.muted`, `.badge` live in `layout.css`. Favor importing/using them rather than duplicating declarations in page/ component files.

## When Adding Styles

1. Decide the scope:
   - Global tokens/utilities → `base.css`
   - Shared layout → `layout.css`
   - Component-specific → `styles/components/<Component>.css`
   - Page/route-specific → `styles/pages/<page>.css`
2. If combining with an existing base class (e.g. `.dashboard-card`), document overrides with comments in the page/component file.
3. Keep structural properties (`display`, `flex/grid` settings) close to the top of the rule block so they are hard to miss.
