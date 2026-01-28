# Requirements: Claude Usage Tray Widget

**Defined:** 2026-01-27
**Core Value:** See how close you are to your Claude usage limits without leaving what you're doing

## v1 Requirements

### Tray Shell

- [x] **TRAY-01**: App creates a persistent system tray icon that survives Explorer restarts
- [ ] **TRAY-02**: Tray icon color reflects the most limiting usage limit (green < 70%, yellow 70-90%, red >= 90%)
- [ ] **TRAY-03**: Hovering over tray icon shows tooltip with current usage summary
- [x] **TRAY-04**: Right-click tray icon shows context menu (Refresh, Settings, Login, Exit)

### Authentication

- [ ] **AUTH-01**: User can log in via browser window that opens Claude.ai sign-in page
- [ ] **AUTH-02**: Authenticated session persists across app restarts (no re-login each launch)
- [ ] **AUTH-03**: App detects expired session and prompts user to re-authenticate

### Data Display

- [ ] **DATA-01**: Clicking tray icon opens panel showing 3 progress bars (session limit, weekly all-models, weekly Sonnet-only)
- [ ] **DATA-02**: Each limit shows a countdown until reset ("Resets in 2h 34m")
- [ ] **DATA-03**: The most limiting constraint is visually emphasized in the expanded panel
- [ ] **DATA-04**: When offline or fetch fails, panel shows last-known data with a stale indicator

### Polling & Refresh

- [ ] **POLL-01**: App polls Claude.ai for usage data on a regular background interval (default 5 min)
- [ ] **POLL-02**: User can trigger manual refresh from panel or context menu
- [ ] **POLL-03**: User can configure the polling interval via settings
- [ ] **POLL-04**: App can be set to auto-start when Windows boots

## v2 Requirements

### Notifications

- **NOTF-01**: User receives toast notification at configurable threshold (80%, 90%, 100%)
- **NOTF-02**: Notification includes which limit was hit and when it resets

### Historical Data

- **HIST-01**: App tracks usage over time and stores locally
- **HIST-02**: User can view usage trends as a simple chart

### Multi-Account

- **ACCT-01**: User can switch between multiple Claude.ai accounts
- **ACCT-02**: Each account maintains its own session and usage data

### Polish

- **UX-01**: Dark mode support for the popup panel
- **UX-02**: Keyboard shortcuts for common actions
- **UX-03**: Predictive alerts ("At current rate, you'll hit limit in X hours")

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-platform (macOS/Linux) | Windows-only scope for v1 |
| Claude API usage tracking | Focused on web UI rate limits, not API console |
| Cost/billing information | Focus is on rate limits only |
| Historical usage graphs | High complexity, requires data persistence architecture |
| Toast/popup notifications | User explicitly wants no interruptions — color only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRAY-01 | Phase 1 | Complete |
| TRAY-02 | Phase 3 | Pending |
| TRAY-03 | Phase 3 | Pending |
| TRAY-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| POLL-01 | Phase 4 | Pending |
| POLL-02 | Phase 3 | Pending |
| POLL-03 | Phase 4 | Pending |
| POLL-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 (100% coverage achieved)

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-28 after Phase 1 completion*
