# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** See how close you are to your Claude usage limits without leaving what you're doing — one glance at the system tray tells you if you're good, getting close, or tapped out.
**Current focus:** Phase 4 - Background Polling + Settings (In progress)

## Current Position

Phase: 4 of 4 (Background Polling + Settings)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-01-29 — Completed 04-02-PLAN.md

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 17 min
- Total execution time: 2.97 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-electron-shell-tray-foundation | 2 | 86 min | 43 min |
| 02-browser-authentication | 2 | 49 min | 25 min |
| 03-data-fetching-display | 3 | 30 min | 10 min |
| 04-background-polling-settings | 2 | 17 min | 8.5 min |

**Recent Trend:**
- Last 5 plans: 03-01 (3 min), 03-02 (2 min), 03-03 (25 min), 04-01 (5 min), 04-02 (12 min)
- Trend: Phase 4 completed efficiently - both plans under 15 minutes each

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Windows system tray widget chosen for always-visible, non-intrusive usage display
- Browser login flow preferred over cookie pasting for better UX
- Color-coded alerts only (no popups) to avoid interruptions
- Show most-limiting limit on icon for quick triage

**From 01-01 execution:**
- Used electron-vite for modern Vite-based build tooling instead of webpack
- Created 3 color variations of tray icon (green/yellow/red) as infrastructure for Phase 3 status display
- Prevented app quit on window-all-closed to keep tray alive
- Used contextBridge.exposeInMainWorld instead of nodeIntegration for secure renderer IPC

**From 01-02 execution:**
- Implemented 200ms debounce on blur-triggered hides to prevent toggle flicker
- Added tray 'destroyed' event handler to automatically recreate tray after Windows Explorer restart
- Used dark theme (#1a1a2e background) for native tray popup feel
- Frameless, skipTaskbar, alwaysOnTop window configuration for popup UX
- Screen bounds clamping to prevent popup from appearing off-screen

**From 02-01 execution:**
- Cookie polling with cookies.on('changed') event for auth detection (not deep-linking)
- Session cookie to persistent cookie conversion with 30-day expiration to prevent logout on restart
- Gray tray icon for logged-out state; green for logged-in (usage colors in Phase 3)
- Dynamic import pattern to avoid circular dependencies between auth/state.ts and tray.ts
- IPC handlers with auth: namespace prefix for authentication operations

**From 02-02 execution:**
- Use BrowserWindow for login instead of shell.openExternal (system browser cookies are separate from Electron)
- Only detect sessionKey/__session/auth_token as auth cookies (not Cloudflare cookies like __cf_bm)
- Don't attempt email extraction from cookies - just show "Logged in" status
- Removed tray GUID to avoid Windows icon caching issues
- Added URL polling for SPA navigation detection in login window auto-close

**From 03-01 execution:**
- Implemented flexible API endpoint transformation to handle undocumented Claude.ai usage API
- Stale data pattern: preserve cached data on fetch errors, track error separately
- Push updates architecture: broadcast usage data changes to all renderer windows
- IPC namespace pattern: usage:* prefix for all usage-related handlers (consistent with auth:*)

**From 03-02 execution:**
- Green-yellow-red gradient thresholds at 70% and 90% usage
- Most-limiting constraint highlighted with yellow border
- Absolute time display with relative duration on hover

**From 03-03 execution:**
- API endpoint: https://claude.ai/api/organizations/{org_id}/usage
- Get org_id from lastActiveOrg cookie
- Use net.request with useSessionCookies (not net.fetch) for reliable cookie handling with custom session partitions
- Tooltip shows which limit is most limiting (e.g., "Claude: Weekly 79%")

**From 04-01 execution:**
- Use electron-store for settings persistence (de-facto standard for Electron)
- Recursive setTimeout (not setInterval) for polling allows dynamic interval changes
- Exponential backoff: 5 attempts, 1s-60s delay, full jitter via exponential-backoff package
- Stop retries immediately on auth errors (401/403) to avoid aggressive loops
- ESM/CJS compatibility pattern: `const Module = require('pkg'); const Store = Module.default || Module`
- Dynamic import of polling module in settings onDidChange to avoid circular dependency
- Polling lifecycle: start on authenticated, stop on logout/quit

**From 04-02 execution:**
- Settings changes apply immediately (no save button)
- Slider shows preset labels (1, 5, 10, 15, 30 min) for quick selection
- Settings panel toggles with gear icon, replaces usage display when open
- Settings IPC pattern: settings:* namespace, get/set handlers, onChanged subscription
- TypeScript types defined in both preload bridge and component for type safety
- onSettingsChanged subscription pattern for real-time updates across windows

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-29 (plan execution)
Stopped at: Completed 04-02-PLAN.md
Resume file: None

**Project Complete:** All 4 phases complete (9 total plans). Background polling, settings UI, auto-start toggle, and all requirements from ROADMAP.md met. Ready for production use.
