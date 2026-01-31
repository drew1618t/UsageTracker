# Project Milestones: Claude Usage Tray Widget

## v1.1 Polish & Fixes (Shipped: 2026-01-31)

**Delivered:** Smarter display logic showing session limits by default with intelligent weekly override, plus auto-start bug fix.

**Phases completed:** 5 (2 plans total)

**Key accomplishments:**

- Session-first display logic — tooltip and popup show session by default
- Smart weekly override — switches only when >90% AND more limiting in session-equivalent units
- Independent icon color evaluation — warns about ANY limit hitting threshold
- Fixed display order in popup — consistent positioning with dynamic highlighting
- Auto-start dev mode protection — prevents electron.exe registry entries

**Stats:**

- 1,941 lines of TypeScript (+112 from v1.0)
- 1 phase, 2 plans, 5 tasks
- 4/4 requirements satisfied
- 2 days from milestone start to ship

**Git range:** `feat(05-01)` → `docs(v1.1)`

**What's next:** TBD (notifications, historical data, or additional polish)

---

## v1.0 MVP (Shipped: 2026-01-29)

**Delivered:** Windows system tray application displaying Claude.ai usage limits with color-coded indicators, browser authentication, and configurable background polling.

**Phases completed:** 1-4 (9 plans total)

**Key accomplishments:**

- Persistent system tray widget with Windows Explorer restart survival and single-instance enforcement
- Browser-based authentication with session cookie persistence across app restarts
- Three-limit usage display with progress bars, gradient coloring, and reset countdowns
- Dynamic tray icon color (green/yellow/red/gray) reflecting most limiting constraint
- Background polling with exponential backoff and configurable interval (1-30 min)
- Settings persistence with auto-start Windows integration

**Stats:**

- ~1,829 lines of TypeScript
- 4 phases, 9 plans
- 15/15 requirements satisfied
- 3 days from project start to ship

**Git range:** `chore(01-01)` → `docs(04)`

**What's next:** v1.1 features (notifications, historical data, or polish improvements)

---
