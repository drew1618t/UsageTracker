# Requirements: Claude Usage Tray Widget

**Defined:** 2026-01-31
**Core Value:** See how close you are to your Claude usage limits without leaving what you're doing — one glance at the system tray tells you if you're good, getting close, or tapped out.

## v1.1 Requirements

Requirements for polish/fixes release. Focus on smarter display logic and bug fixes.

### Display Logic

- [ ] **DISPLAY-01**: Session limit shown by default in popup and tooltip
- [ ] **DISPLAY-02**: Weekly limit takes priority only when >90% used AND more limiting in final 10%
- [ ] **DISPLAY-03**: Tray icon color reflects ANY limit hitting thresholds (early warning)

### Bug Fixes

- [ ] **FIX-01**: Auto-start launches app correctly (not bare electron.exe)

## Future Requirements

None identified for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Toast/popup notifications | User wants visual-only indication via color, no interruptions |
| Historical usage tracking | Deferred — just current state for now |
| Multi-platform support | Windows only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISPLAY-01 | Phase 5 | Pending |
| DISPLAY-02 | Phase 5 | Pending |
| DISPLAY-03 | Phase 5 | Pending |
| FIX-01 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 4 total
- Mapped to phases: 4
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
