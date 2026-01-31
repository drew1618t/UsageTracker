# Roadmap: Claude Usage Tray Widget v1.1

**Milestone:** v1.1 Polish & Fixes
**Created:** 2026-01-31
**Phases:** 1 (Phase 5)

## Overview

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 5 | Display Logic & Fixes | Session-first display with smart weekly priority, fix auto-start | DISPLAY-01, DISPLAY-02, DISPLAY-03, FIX-01 | ✓ Complete |

## Phase 5: Display Logic & Fixes

**Goal:** Implement session-first display logic and fix auto-start bug

**Requirements:**
- DISPLAY-01: Session limit shown by default in popup and tooltip
- DISPLAY-02: Weekly limit takes priority only when >90% used AND more limiting in final 10%
- DISPLAY-03: Tray icon color reflects ANY limit hitting thresholds (early warning)
- FIX-01: Auto-start launches app correctly (not bare electron.exe)

**Success Criteria:**
1. Popup and tooltip show session limit by default
2. Weekly limit only displays when >90% AND calculated to be more limiting than remaining session capacity
3. Tray icon turns yellow/red if ANY limit (session or weekly) hits threshold
4. App launches correctly on Windows startup (not bare electron.exe window)
5. Manual launch still works as before

**Technical Notes:**
- Display logic: 1 session ≈ 10% weekly, so final 10% weekly = ~1 session worth
- Icon color: Keep existing threshold logic but apply to all limits independently
- Auto-start: Likely registry entry pointing to wrong path; needs app path not electron.exe

**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md — Create display logic utility and fix auto-start dev mode
- [x] 05-02-PLAN.md — Integrate display logic into tray and popup

**Dependencies:** None (v1.0 foundation complete)

---

## Coverage Validation

**v1.1 Requirements:** 4
**Mapped to phases:** 4
**Unmapped:** 0 ✓

All requirements covered.

---
*Roadmap created: 2026-01-31*
