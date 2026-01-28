# Roadmap: Claude Usage Tray Widget

## Overview

Build a Windows system tray application that displays Claude.ai usage limits at a glance. The journey starts with establishing the tray shell and Electron foundation, adds browser-based authentication to access usage data, implements data fetching and visual display with color-coded progress bars, and finishes with background polling to keep limits current. Each phase delivers complete, verifiable capabilities building toward a monitoring tool that shows usage status without requiring browser navigation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Electron Shell + Tray Foundation** - Establish tray icon infrastructure and basic UI
- [ ] **Phase 2: Browser Authentication** - Implement login flow with session persistence
- [ ] **Phase 3: Data Fetching + Display** - Fetch usage data and display with visual indicators
- [ ] **Phase 4: Background Polling + Settings** - Automatic updates and user configuration

## Phase Details

### Phase 1: Electron Shell + Tray Foundation
**Goal**: Users see a persistent system tray icon with basic interaction
**Depends on**: Nothing (first phase)
**Requirements**: TRAY-01, TRAY-02, TRAY-03, TRAY-04
**Success Criteria** (what must be TRUE):
  1. System tray icon appears and persists after Windows Explorer restarts
  2. Hovering over tray icon shows tooltip with application name
  3. Right-clicking tray icon displays context menu with Refresh, Settings, Login, and Exit options
  4. Clicking tray icon opens a popup window positioned near the tray
  5. App enforces single instance (prevents multiple tray icons if launched twice)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold project with electron-vite, create tray icon assets, implement main process with tray and single instance
- [x] 01-02-PLAN.md — Implement popup window with positioning, toggle, and basic UI shell

### Phase 2: Browser Authentication
**Goal**: Users can log in via browser and maintain authenticated session
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can click Login option and browser window opens to Claude.ai sign-in page
  2. After user completes login, auth window closes and app shows "Logged in as [email]" in popup
  3. User closes app and relaunches without needing to log in again (session persists)
  4. When session expires, app detects this and prompts user to re-authenticate from popup
**Plans**: TBD

Plans:
- [ ] 02-01: [To be created during phase planning]

### Phase 3: Data Fetching + Display
**Goal**: Users see their current usage limits with visual indicators
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, POLL-02
**Success Criteria** (what must be TRUE):
  1. Clicking tray icon shows popup with three progress bars (session limit, weekly all-models, weekly Sonnet-only)
  2. Each limit displays current usage percentage, numerical values (e.g., "45/100"), and countdown until reset
  3. Tray icon color reflects most limiting constraint (green < 70%, yellow 70-90%, red >= 90%)
  4. User can click Refresh in popup or context menu to manually update data
  5. When network fails, popup shows last-known data with "Last updated X minutes ago" indicator
  6. The most limiting metric is visually emphasized in popup (highlighted or positioned first)
**Plans**: TBD

Plans:
- [ ] 03-01: [To be created during phase planning]

### Phase 4: Background Polling + Settings
**Goal**: Usage data stays fresh automatically with user control over behavior
**Depends on**: Phase 3
**Requirements**: POLL-01, POLL-03, POLL-04
**Success Criteria** (what must be TRUE):
  1. App fetches usage data in background every 5 minutes (default) without user action
  2. Tray icon color and popup data update automatically when new data arrives
  3. User can open Settings dialog and change polling interval (1 min to 30 min range)
  4. User can enable/disable "Start with Windows" from Settings, and app respects this on next boot
  5. App implements exponential backoff when network errors occur (prevents aggressive retry loops)
**Plans**: TBD

Plans:
- [ ] 04-01: [To be created during phase planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Electron Shell + Tray Foundation | 2/2 | ✓ Complete | 2026-01-28 |
| 2. Browser Authentication | 0/? | Not started | - |
| 3. Data Fetching + Display | 0/? | Not started | - |
| 4. Background Polling + Settings | 0/? | Not started | - |
