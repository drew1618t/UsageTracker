# Phase 4: Background Polling + Settings - Research

**Researched:** 2026-01-29
**Domain:** Electron background timers, settings persistence, Windows auto-start
**Confidence:** HIGH

## Summary

Phase 4 adds automatic background polling of usage data with user-configurable settings. The standard approach for Electron tray apps uses recursive `setTimeout` (not `setInterval`) for reliable polling, `electron-store` for settings persistence with TypeScript support, and Electron's built-in `app.setLoginItemSettings()` for Windows auto-start. Exponential backoff for network errors prevents aggressive retry loops during API failures.

The research reveals that recursive `setTimeout` is universally recommended over `setInterval` for API polling because it prevents call queuing when network latency exceeds the polling interval. Settings storage is straightforward with `electron-store`, which provides automatic JSON persistence, TypeScript types, and change watching. Auto-start on Windows requires no external dependencies beyond Electron's native API.

**Primary recommendation:** Use recursive `setTimeout` with exponential backoff, persist settings in `electron-store` with IPC-based synchronization to renderer, and leverage Electron's `app.setLoginItemSettings()` for Windows auto-start.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-store | Latest (13.x+) | Settings persistence | De-facto standard for Electron config storage, built-in TypeScript support, atomic writes, JSON schema validation |
| Native setTimeout | ES6+ | Background polling | Browser/Node built-in, universally recommended over setInterval for API polling |
| exponential-backoff | Latest (~3.x) | Network retry logic | Lightweight (~2KB), TypeScript support, configurable backoff parameters, widely used pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| app.setLoginItemSettings | Electron 30+ | Windows auto-start | Built-in Electron API, no external dependency needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-store | localStorage/JSON files | electron-store provides atomic writes, schema validation, and is battle-tested. Hand-rolling is not worth the effort. |
| exponential-backoff package | Hand-rolled backoff | Package is tiny (2KB) and handles edge cases like jitter. Don't hand-roll unless avoiding all dependencies. |
| setTimeout | setInterval | setTimeout prevents call queuing. setInterval is wrong tool for API polling. |

**Installation:**
```bash
npm install electron-store exponential-backoff
```

## Architecture Patterns

### Recommended Project Structure
```
src/main/
├── state/
│   ├── settings.ts      # Settings state management + electron-store wrapper
│   └── usage.ts         # Existing usage state (add polling logic here)
├── api/
│   └── usage.ts         # Existing API client (add exponential backoff wrapper)
└── index.ts             # Register settings IPC handlers
```

### Pattern 1: Recursive setTimeout for Polling
**What:** Use recursive `setTimeout` instead of `setInterval` to schedule the next poll only after the current one completes.
**When to use:** All API polling scenarios where request duration can vary or exceed interval.
**Example:**
```typescript
// GOOD: Recursive setTimeout
let pollingTimer: NodeJS.Timeout | null = null

async function poll() {
  try {
    await fetchUsageData()
  } catch (error) {
    console.error('Polling error:', error)
  }

  // Schedule next poll AFTER current completes
  const interval = getPollingInterval() // Get from settings
  pollingTimer = setTimeout(poll, interval)
}

function startPolling() {
  if (pollingTimer) return // Already polling
  poll() // Start immediately
}

function stopPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
}

// BAD: setInterval (can queue calls if request takes longer than interval)
// setInterval(() => fetchUsageData(), 5 * 60 * 1000) // DON'T DO THIS
```

**Source:** Multiple authoritative sources confirm this pattern:
- [Think Twice Before Using setInterval() for API Polling](https://dev.to/igadii/think-twice-before-using-setinterval-for-api-polling-it-might-not-be-ideal-3n3)
- [Polling with SetInterval Vs SetTimeout in JavaScript](https://fadamakis.com/polling-with-setinterval-vs-settimeout-in-javascript-c20caadee1cb)
- [MDN Web Docs: setInterval best practices](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval)

### Pattern 2: Exponential Backoff with exponential-backoff Package
**What:** Wrap API calls with exponential backoff to automatically retry on network errors with increasing delays.
**When to use:** API requests that can fail transiently due to network issues or rate limits.
**Example:**
```typescript
// Source: https://github.com/coveooss/exponential-backoff
import { backOff } from 'exponential-backoff'

async function fetchUsageDataWithRetry(): Promise<UsageData> {
  return backOff(
    () => fetchUsageData(), // Existing API function
    {
      numOfAttempts: 5,        // Max 5 retries
      startingDelay: 1000,     // Start with 1 second
      timeMultiple: 2,         // Double delay each time (1s, 2s, 4s, 8s, 16s)
      maxDelay: 60000,         // Cap at 60 seconds
      jitter: 'full',          // Add randomness to prevent thundering herd
      retry: (error, attemptNumber) => {
        // Only retry on network errors, not auth failures
        if (error.message.includes('Not authenticated')) {
          return false // Don't retry auth errors
        }
        console.log(`Retry attempt ${attemptNumber} after error:`, error.message)
        return true
      }
    }
  )
}
```

**Configuration parameters (from package docs):**
- `numOfAttempts`: Max retry count (default: 10)
- `startingDelay`: Initial delay in ms (default: 100ms)
- `timeMultiple`: Delay multiplier (default: 2 for exponential)
- `maxDelay`: Cap for delay growth (default: Infinity)
- `jitter`: 'full' or 'none' - adds randomness to delays (default: 'none')
- `retry`: Custom function to decide if retry should occur based on error

**Source:** [exponential-backoff GitHub repository](https://github.com/coveooss/exponential-backoff)

### Pattern 3: electron-store for Settings Persistence
**What:** Use electron-store to persist user settings with TypeScript type safety and atomic writes.
**When to use:** All app settings, user preferences, and configuration data.
**Example:**
```typescript
// Source: https://github.com/sindresorhus/electron-store
import Store from 'electron-store'

// Define schema for type safety
interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
}

// Create store with defaults and validation
const store = new Store<SettingsSchema>({
  defaults: {
    pollingIntervalMinutes: 5,
    autoStartEnabled: false
  },
  // Optional: JSON schema for validation
  schema: {
    pollingIntervalMinutes: {
      type: 'number',
      minimum: 1,
      maximum: 30
    },
    autoStartEnabled: {
      type: 'boolean'
    }
  }
})

// Usage
export function getPollingInterval(): number {
  return store.get('pollingIntervalMinutes') * 60 * 1000 // Convert to ms
}

export function setPollingInterval(minutes: number): void {
  store.set('pollingIntervalMinutes', minutes)
}

// Watch for changes (useful for multi-window sync)
store.onDidChange('pollingIntervalMinutes', (newValue, oldValue) => {
  console.log(`Polling interval changed from ${oldValue} to ${newValue}`)
  // Restart polling with new interval
  restartPolling()
})
```

**Key features:**
- Data stored in `app.getPath('userData')/config.json` as JSON
- Atomic writes prevent corruption
- TypeScript generics for type safety
- JSON schema validation with ajv
- Change watching with `onDidChange()` and `onDidAnyChange()`
- Dot-notation for nested properties
- ESM-only (requires Electron 30+)

**Source:** [electron-store GitHub repository](https://github.com/sindresorhus/electron-store)

### Pattern 4: Windows Auto-Start with app.setLoginItemSettings
**What:** Use Electron's built-in `app.setLoginItemSettings()` to enable/disable auto-start on Windows.
**When to use:** Implementing "Start with Windows" toggle in settings.
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app
import { app } from 'electron'

export function setAutoStart(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    // On Windows, these settings ensure proper startup behavior:
    enabled: enabled, // Controls startup approved registry key
    path: process.execPath, // Path to executable
    args: [] // Optional: pass args to app on startup
  })
}

export function getAutoStartEnabled(): boolean {
  const settings = app.getLoginItemSettings()
  return settings.openAtLogin
}
```

**Windows-specific notes:**
- Creates registry entry at `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- `enabled` parameter controls Task Manager startup toggle
- No external dependencies needed
- Works with auto-updater (use Update.exe stub for Squirrel apps)

**Source:** [Electron app.setLoginItemSettings documentation](https://www.electronjs.org/docs/latest/api/app)

### Pattern 5: Settings Synchronization via IPC
**What:** Sync settings changes to renderer windows using IPC broadcasts, since electron-store doesn't auto-sync across processes.
**When to use:** Settings UI in renderer needs to react to changes made elsewhere (tray menu, other windows).
**Example:**
```typescript
// In main/state/settings.ts
import { BrowserWindow } from 'electron'
import Store from 'electron-store'

const store = new Store<SettingsSchema>(/* config */)

// Watch for changes and broadcast to all renderers
store.onDidAnyChange((newValue, oldValue) => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('settings-changed', newValue)
  })
})

// In preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods

  getSettings: (): Promise<SettingsSchema> => {
    return ipcRenderer.invoke('settings:get')
  },

  setPollingInterval: (minutes: number): Promise<void> => {
    return ipcRenderer.invoke('settings:set-polling-interval', minutes)
  },

  setAutoStart: (enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke('settings:set-auto-start', enabled)
  },

  onSettingsChanged: (callback: (settings: SettingsSchema) => void): (() => void) => {
    const listener = (_event: any, settings: SettingsSchema) => callback(settings)
    ipcRenderer.on('settings-changed', listener)
    return () => ipcRenderer.removeListener('settings-changed', listener)
  }
})
```

**Note:** This pattern is already established in the codebase for auth and usage data (see `auth-state-changed` and `usage-data-changed` events).

**Sources:**
- [Creating a synchronized store between main and renderer process in Electron](https://www.bigbinary.com/blog/sync-store-main-renderer-electron)
- [electron-store issue #39: onDidChange event not propagating to all windows](https://github.com/sindresorhus/electron-store/issues/39)

### Anti-Patterns to Avoid
- **Using setInterval for polling:** Causes call queuing when network latency > interval. Always use recursive setTimeout.
- **Hand-rolling exponential backoff:** Edge cases like jitter and max delay are subtle. Use proven library.
- **Forgetting to clear timers on app quit:** Memory leak and potential crashes. Always clean up in 'before-quit'.
- **Not handling auth errors in polling:** Auth failures should stop polling and prompt re-login, not retry infinitely.
- **Synchronous file I/O for settings:** electron-store uses atomic writes automatically. Don't bypass with fs.writeFileSync.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings persistence | Custom JSON file writing with fs.writeFileSync | electron-store | Atomic writes prevent corruption, schema validation, TypeScript support, widely used and maintained |
| Exponential backoff | Manual retry loops with setTimeout | exponential-backoff package | Handles jitter, max delay, conditional retry logic. Only 2KB. |
| Windows auto-start | Registry manipulation with node-winreg | app.setLoginItemSettings() | Built into Electron, works with auto-updater, no external dependencies |
| Multi-window settings sync | Custom event bus | IPC with store.onDidChange() | Leverages existing Electron IPC, follows established patterns in codebase |

**Key insight:** Electron background polling seems simple but has many edge cases (call queuing, network errors, timer cleanup, settings corruption). The ecosystem provides battle-tested solutions for all of these. Don't reinvent.

## Common Pitfalls

### Pitfall 1: setInterval Call Queuing
**What goes wrong:** Using `setInterval(() => fetchData(), 5000)` causes multiple concurrent requests if network latency exceeds 5 seconds. This leads to memory buildup, rate limit errors, and out-of-order responses.
**Why it happens:** `setInterval` schedules the next call regardless of whether the previous one finished. With API polling, slow network or server issues cause overlap.
**How to avoid:** Always use recursive `setTimeout` that schedules the next poll only after the current one completes (success or failure).
**Warning signs:**
- Memory usage grows over time
- Multiple concurrent network requests to same endpoint
- Out-of-order data updates
- Rate limit errors from API

**Source:** [Think Twice Before Using setInterval() for API Polling](https://dev.to/igadii/think-twice-before-using-setinterval-for-api-polling-it-might-not-be-ideal-3n3)

### Pitfall 2: Not Cleaning Up Timers
**What goes wrong:** Forgetting to `clearTimeout()` when stopping polling or app quit causes memory leaks and can crash the app during shutdown.
**Why it happens:** Timers hold references to closures which reference app state. If not cleared, garbage collector can't free memory.
**How to avoid:**
- Store timer ID: `let pollingTimer: NodeJS.Timeout | null = null`
- Clear on stop: `if (pollingTimer) clearTimeout(pollingTimer); pollingTimer = null`
- Listen to app lifecycle: `app.on('before-quit', () => stopPolling())`
**Warning signs:**
- Memory usage grows steadily during app lifetime
- Errors in console during app quit
- Polling continues after user disables it

**Sources:**
- [Top Strategies to Prevent Memory Leaks in Electron Apps](https://infinitejs.com/posts/top-strategies-prevent-memory-leaks-electron-apps/)
- [Debugging Electron Memory Usage](https://seenaburns.com/debugging-electron-memory-usage/)

### Pitfall 3: Retrying Auth Failures
**What goes wrong:** Exponential backoff retries 401/403 errors, causing many failed requests and delayed error UI.
**Why it happens:** Network error handling assumes all failures are transient. Auth failures are permanent until user re-authenticates.
**How to avoid:** Use the `retry` callback in exponential-backoff to detect auth errors and return `false` to stop retrying.
```typescript
retry: (error) => {
  if (error.message.includes('Not authenticated')) {
    // Broadcast auth lost event to UI
    notifyAuthenticationLost()
    return false // Stop retrying
  }
  return true // Retry other errors
}
```
**Warning signs:**
- User stays logged out but app keeps making requests
- Auth error toasts appear repeatedly
- Network tab shows many 401 responses

### Pitfall 4: Polling During Logout/Login
**What goes wrong:** Background polling continues during login flow or after logout, causing 401 errors and interfering with auth state transitions.
**Why it happens:** Polling is started on app ready but not stopped during auth state changes.
**How to avoid:**
- Stop polling on logout: `auth.onLogout(() => stopPolling())`
- Start polling only when authenticated: `auth.onLogin(() => startPolling())`
- Check auth state before each poll (defense in depth)
**Warning signs:**
- 401 errors in console during login flow
- Polling requests visible in network tab while logged out
- Race conditions between auth check and usage fetch

### Pitfall 5: Not Restarting Polling After Settings Change
**What goes wrong:** User changes polling interval from 5 min to 1 min, but polling continues at 5 min until next scheduled poll.
**Why it happens:** Timer was already scheduled with old interval. Changing the stored setting doesn't affect pending timers.
**How to avoid:**
- Restart polling when interval changes:
```typescript
store.onDidChange('pollingIntervalMinutes', () => {
  stopPolling()  // Cancel pending timer
  startPolling() // Start with new interval
})
```
**Warning signs:**
- Settings change has no immediate effect
- User reports polling still slow after increasing frequency

### Pitfall 6: electron-store in Renderer Without Init
**What goes wrong:** Calling `new Store()` in renderer process works in dev but fails in production with ENOENT errors.
**Why it happens:** Renderer process needs permission to access userData path. In packaged app, this requires calling `Store.initRenderer()` in main process first.
**How to avoid:**
- Use electron-store only in main process
- Expose settings via IPC to renderer (recommended approach)
- OR call `Store.initRenderer()` in main before any renderer uses Store
**Warning signs:**
- Works in electron-vite dev mode but fails in built app
- File permission errors in production logs
- Settings not persisting in packaged app

**Source:** [electron-store README - Renderer usage section](https://github.com/sindresorhus/electron-store)

## Code Examples

Verified patterns from official sources:

### Complete Polling Setup with Exponential Backoff
```typescript
// src/main/state/polling.ts
import { backOff } from 'exponential-backoff'
import { refreshUsageData } from './usage'
import { getSettings } from './settings'

let pollingTimer: NodeJS.Timeout | null = null
let isPolling = false

/**
 * Fetches usage data with exponential backoff retry logic.
 * Stops retrying on auth errors (401/403).
 */
async function fetchWithRetry(): Promise<void> {
  return backOff(
    () => refreshUsageData(),
    {
      numOfAttempts: 5,
      startingDelay: 1000,      // 1 second
      timeMultiple: 2,          // 2x growth (1s, 2s, 4s, 8s, 16s)
      maxDelay: 60000,          // Cap at 60 seconds
      jitter: 'full',           // Randomize delays to prevent thundering herd
      retry: (error) => {
        // Don't retry auth failures - user must re-login
        const errorMsg = error instanceof Error ? error.message : ''
        if (errorMsg.includes('Not authenticated') ||
            errorMsg.includes('401') ||
            errorMsg.includes('403')) {
          console.log('[Polling] Auth error detected, stopping retries')
          return false
        }
        return true
      }
    }
  )
}

/**
 * Recursive setTimeout polling pattern.
 * Schedules next poll only after current completes.
 */
async function poll(): Promise<void> {
  if (!isPolling) return

  try {
    await fetchWithRetry()
  } catch (error) {
    console.error('[Polling] Error during poll:', error)
    // Error already logged by backOff, continue polling
  }

  // Schedule next poll AFTER current completes (prevents queuing)
  const settings = getSettings()
  const intervalMs = settings.pollingIntervalMinutes * 60 * 1000
  pollingTimer = setTimeout(poll, intervalMs)
}

/**
 * Starts background polling if not already running.
 */
export function startPolling(): void {
  if (isPolling) {
    console.log('[Polling] Already running')
    return
  }

  isPolling = true
  console.log('[Polling] Started')
  poll() // Start immediately
}

/**
 * Stops background polling and clears pending timer.
 */
export function stopPolling(): void {
  if (!isPolling) return

  isPolling = false
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
  console.log('[Polling] Stopped')
}

/**
 * Restarts polling (used when interval changes).
 */
export function restartPolling(): void {
  stopPolling()
  startPolling()
}
```

### Settings State with electron-store
```typescript
// src/main/state/settings.ts
import Store from 'electron-store'
import { BrowserWindow, app } from 'electron'

interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
}

const store = new Store<SettingsSchema>({
  defaults: {
    pollingIntervalMinutes: 5,
    autoStartEnabled: false
  },
  schema: {
    pollingIntervalMinutes: {
      type: 'number',
      minimum: 1,
      maximum: 30
    },
    autoStartEnabled: {
      type: 'boolean'
    }
  }
})

/**
 * Get all settings.
 */
export function getSettings(): SettingsSchema {
  return {
    pollingIntervalMinutes: store.get('pollingIntervalMinutes'),
    autoStartEnabled: store.get('autoStartEnabled')
  }
}

/**
 * Set polling interval and restart polling.
 */
export function setPollingInterval(minutes: number): void {
  store.set('pollingIntervalMinutes', minutes)
  notifySettingsChanged()
}

/**
 * Enable/disable auto-start with Windows.
 */
export function setAutoStart(enabled: boolean): void {
  store.set('autoStartEnabled', enabled)

  // Update Windows registry
  app.setLoginItemSettings({
    openAtLogin: enabled,
    enabled: enabled,
    path: process.execPath
  })

  notifySettingsChanged()
}

/**
 * Broadcast settings changes to all renderer windows.
 */
function notifySettingsChanged(): void {
  const settings = getSettings()
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('settings-changed', settings)
  })
}

/**
 * Initialize settings on app start.
 * Syncs autoStartEnabled setting with actual Windows registry state.
 */
export function initSettings(): void {
  // Ensure Windows auto-start state matches stored setting
  const enabled = store.get('autoStartEnabled')
  app.setLoginItemSettings({
    openAtLogin: enabled,
    enabled: enabled,
    path: process.execPath
  })

  // Watch for changes and trigger polling restart
  store.onDidChange('pollingIntervalMinutes', () => {
    const { restartPolling } = require('./polling')
    restartPolling()
  })
}
```

### IPC Handlers for Settings
```typescript
// In src/main/index.ts - add to app.whenReady()
import { getSettings, setPollingInterval, setAutoStart, initSettings } from './state/settings'
import { startPolling, stopPolling } from './state/polling'

// Initialize settings (in app.whenReady())
initSettings()

// Start polling after auth check succeeds
const authStateResult = await checkAuthState()
if (authStateResult.isAuthenticated) {
  startPolling()
}

// Register settings IPC handlers
ipcMain.handle('settings:get', () => getSettings())

ipcMain.handle('settings:set-polling-interval', (_event, minutes: number) => {
  setPollingInterval(minutes)
})

ipcMain.handle('settings:set-auto-start', (_event, enabled: boolean) => {
  setAutoStart(enabled)
})

// Stop polling on logout, start on login
ipcMain.handle('auth:logout', async () => {
  stopPolling()
  await logout()
  setAuthState({ isAuthenticated: false, userIdentifier: null })
})

// In auth callback (when login succeeds)
initSession(async () => {
  console.log('Auth cookies detected')
  await persistSessionCookies()
  const authStateResult = await checkAuthState()
  setAuthState({
    isAuthenticated: authStateResult.isAuthenticated,
    userIdentifier: authStateResult.userEmail || null
  })

  // Start polling after successful login
  startPolling()
})

// Clean up timers before quit
app.on('before-quit', () => {
  stopPolling()
})
```

### Preload API Extensions
```typescript
// In src/preload/index.ts
export interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
}

// Add to contextBridge.exposeInMainWorld('electronAPI', { ... })
  // Settings methods
  getSettings: (): Promise<SettingsSchema> => {
    return ipcRenderer.invoke('settings:get')
  },

  setPollingInterval: (minutes: number): Promise<void> => {
    return ipcRenderer.invoke('settings:set-polling-interval', minutes)
  },

  setAutoStart: (enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke('settings:set-auto-start', enabled)
  },

  onSettingsChanged: (callback: (settings: SettingsSchema) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: SettingsSchema) => {
      callback(settings)
    }
    ipcRenderer.on('settings-changed', listener)
    return () => ipcRenderer.removeListener('settings-changed', listener)
  }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setInterval for polling | Recursive setTimeout | ~2015 (HTTP/2 era) | Prevents call queuing, handles variable latency |
| electron-settings (unmaintained) | electron-store | ~2017 | Better maintained, TypeScript support, schema validation |
| node-winreg for auto-start | app.setLoginItemSettings | Electron 1.0 (2016) | Built-in, works with auto-updater, cross-platform |
| localStorage in renderer | electron-store in main | ~2018 (security focus) | Secure, atomic writes, survives renderer crashes |
| Hand-rolled backoff | exponential-backoff package | ~2019 | Handles jitter, max delay, widely tested |

**Deprecated/outdated:**
- **electron-settings**: Unmaintained since 2018. Use electron-store instead.
- **localStorage for Electron settings**: Insecure, lost on cache clear. Use electron-store.
- **setInterval for API polling**: Causes call queuing. Use recursive setTimeout.
- **node-winreg for startup**: Unnecessary, Electron has built-in API since v1.0.

## Open Questions

Things that couldn't be fully resolved:

1. **Should polling continue when app window is hidden/minimized?**
   - What we know: Tray apps typically continue background work while hidden. Chrome throttles background tabs but Electron main process is not throttled.
   - What's unclear: User expectation - some users might prefer polling only when popup is open to reduce network usage.
   - Recommendation: Continue polling while app is running (hidden or not). Tray icon updates are the point of background polling. Add setting in future if users request "pause when idle" feature.

2. **What should happen if exponential backoff exhausts all retries?**
   - What we know: After 5 failed attempts with backoff, the promise rejects. Current poll() catches error and schedules next poll.
   - What's unclear: Should we stop polling entirely after multiple consecutive failures, or keep trying every interval?
   - Recommendation: Keep polling every interval. Each poll gets fresh backoff attempts. If API is down for >1 hour, better to keep trying than stop entirely. Tray icon shows last successful data with error state.

3. **Should settings include "Pause polling" toggle?**
   - What we know: Requirements specify interval control (1-30 min). No pause toggle mentioned.
   - What's unclear: Would users want to temporarily disable polling without quitting the app?
   - Recommendation: Not in Phase 4 scope. Can add in future if requested. Workaround: set interval to 30 min.

## Sources

### Primary (HIGH confidence)
- [Electron API Documentation: app.setLoginItemSettings](https://www.electronjs.org/docs/latest/api/app) - Official Electron docs for Windows auto-start
- [electron-store GitHub repository](https://github.com/sindresorhus/electron-store) - Official repo with README, API docs, TypeScript types
- [exponential-backoff GitHub repository](https://github.com/coveooss/exponential-backoff) - Official package with API documentation
- [MDN Web Docs: setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) - Browser API documentation
- [MDN Web Docs: setInterval best practices](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval) - Recommends setTimeout for long operations

### Secondary (MEDIUM confidence)
- [Think Twice Before Using setInterval() for API Polling](https://dev.to/igadii/think-twice-before-using-setinterval-for-api-polling-it-might-not-be-ideal-3n3) - Dev.to article explaining setInterval pitfalls
- [Polling with SetInterval Vs SetTimeout in JavaScript](https://fadamakis.com/polling-with-setinterval-vs-settimeout-in-javascript-c20caadee1cb) - Medium article comparing approaches
- [Top Strategies to Prevent Memory Leaks in Electron Apps](https://infinitejs.com/posts/top-strategies-prevent-memory-leaks-electron-apps/) - Timer cleanup best practices
- [Creating a synchronized store between main and renderer process in Electron](https://www.bigbinary.com/blog/sync-store-main-renderer-electron) - IPC-based settings sync pattern
- [electron-store issue #39](https://github.com/sindresorhus/electron-store/issues/39) - Discussion about multi-window synchronization
- [Electron BrowserWindow API Documentation](https://www.electronjs.org/docs/latest/api/browser-window) - Official API for modal, frameless, alwaysOnTop options

### Tertiary (LOW confidence)
- [GitHub Electron issue #4465](https://github.com/electron/electron/issues/4465) - Old issue about setInterval throttling (closed, info outdated)
- Various search results about range slider UI components - not directly applicable, standard HTML `<input type="range">` is sufficient

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - exponential-backoff and electron-store are de-facto standards with official docs. setTimeout vs setInterval is well-established best practice.
- Architecture: HIGH - Recursive setTimeout pattern is universally recommended. IPC sync pattern is established in current codebase. app.setLoginItemSettings is official Electron API.
- Pitfalls: HIGH - Call queuing, timer cleanup, and auth retry issues are well-documented with authoritative sources.

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable domain, libraries mature)
