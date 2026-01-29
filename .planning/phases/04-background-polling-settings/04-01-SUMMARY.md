---
phase: 04-background-polling-settings
plan: 01
subsystem: background-polling
tags: [electron-store, exponential-backoff, polling, settings, persistence]

# Dependency graph
requires:
  - phase: 03-data-fetching-display
    provides: refreshUsageData function for automatic polling
provides:
  - Background polling with 5-minute default interval
  - Settings persistence across app restarts with electron-store
  - Exponential backoff on network errors (1s to 60s with jitter)
  - Polling lifecycle management (start on auth, stop on logout/quit)
affects: [phase-05-settings-ui, future-polling-features]

# Tech tracking
tech-stack:
  added: [electron-store, exponential-backoff]
  patterns: [recursive setTimeout for polling, dynamic imports to avoid circular dependencies, ESM/CJS compatibility pattern for electron-store]

key-files:
  created:
    - src/main/state/settings.ts
    - src/main/state/polling.ts
  modified:
    - src/main/index.ts
    - package.json

key-decisions:
  - "Use electron-store for settings persistence (de-facto standard for Electron apps)"
  - "Use recursive setTimeout instead of setInterval for polling (allows dynamic interval changes)"
  - "Use exponential-backoff package with 5 attempts, 1s-60s delay, full jitter"
  - "Stop retries immediately on auth errors (401/403) to avoid aggressive loops"
  - "Use require with .default fallback for electron-store to handle ESM/CJS compatibility"
  - "Dynamic import of polling module in settings to avoid circular dependency"

patterns-established:
  - "Polling lifecycle: start on authenticated, stop on logout/quit"
  - "Settings watcher pattern: onDidChange triggers dynamic import and restart"
  - "ESM/CJS module compatibility: const Module = require('pkg'); const Pkg = Module.default || Module"

# Metrics
duration: 4.5min
completed: 2026-01-29
---

# Phase 04 Plan 01: Background Polling + Settings Summary

**Automatic 5-minute usage polling with exponential backoff, electron-store persistence, and Windows auto-start integration**

## Performance

- **Duration:** 4.5 min
- **Started:** 2026-01-29T13:42:53Z
- **Completed:** 2026-01-29T13:47:23Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Settings module with electron-store for pollingIntervalMinutes and autoStartEnabled persistence
- Polling module with recursive setTimeout and exponential backoff (5 attempts, 1s-60s delay)
- Polling wired into app lifecycle: starts on auth, stops on logout/quit
- Auth error detection stops retry loops (401/403/Not authenticated)
- Windows auto-start integration with app.setLoginItemSettings()

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create settings module** - `3dc3c05` (feat)
2. **Task 2: Create polling module with exponential backoff** - `a3ab239` (feat)
3. **Task 3: Wire polling into app lifecycle** - `e7940cf` (feat)

## Files Created/Modified
- `package.json` - Added electron-store and exponential-backoff dependencies
- `src/main/state/settings.ts` - Settings persistence with electron-store, getSettings/setPollingInterval/setAutoStart/initSettings, dynamic import for polling restart
- `src/main/state/polling.ts` - Background polling with recursive setTimeout, exponential backoff with 5 attempts, auth error detection
- `src/main/index.ts` - Initialize settings on startup, start/stop polling on auth changes, cleanup on quit

## Decisions Made

**electron-store import pattern:**
- Encountered "Store is not a constructor" error due to ESM/CJS compatibility
- Solution: `const Module = require('electron-store'); const Store = Module.default || Module`
- This pattern handles both CJS and ESM module formats

**Polling architecture:**
- Recursive setTimeout instead of setInterval allows dynamic interval changes
- Exponential backoff config: 5 attempts, 1s starting delay, 2x multiplier, 60s max, full jitter
- Auth errors (401/403/Not authenticated) return false in retry callback to stop immediately

**Settings integration:**
- initSettings() syncs Windows auto-start state on startup
- onDidChange watcher for pollingIntervalMinutes uses dynamic import to avoid circular dependency
- setAutoStart() calls app.setLoginItemSettings() to update Windows registry

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed electron-store ESM/CJS compatibility**
- **Found during:** Task 1 (Settings module creation)
- **Issue:** `import Store from 'electron-store'` resulted in "Store is not a constructor" error at runtime
- **Fix:** Changed to `const Module = require('electron-store'); const Store = Module.default || Module` to handle ESM default export in CJS context
- **Files modified:** src/main/state/settings.ts
- **Verification:** App starts without errors, builds successfully
- **Committed in:** e7940cf (Task 3 commit, includes the fix iteration)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix essential for module loading. No scope creep.

## Issues Encountered

**electron-store module loading:**
- electron-store v11 is ESM-only, but electron-vite builds to CJS
- Standard `import Store from 'electron-store'` worked in TypeScript but failed at runtime
- Solution: Use require() with .default fallback pattern
- Pattern now documented for future ESM package integrations

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Background polling infrastructure complete:**
- Settings persist across app restarts in electron-store config.json
- Polling runs automatically when authenticated
- Network errors handled with exponential backoff
- Auth errors stop polling gracefully

**Ready for Phase 04 Plan 02 (Settings UI):**
- getSettings() available for displaying current settings
- setPollingInterval() and setAutoStart() ready for UI integration
- Settings changes broadcast to all windows via IPC

**No blockers or concerns.**

---
*Phase: 04-background-polling-settings*
*Completed: 2026-01-29*
