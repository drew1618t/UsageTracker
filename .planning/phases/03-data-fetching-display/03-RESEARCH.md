# Phase 3: Data Fetching + Display - Research

**Researched:** 2026-01-28
**Domain:** Electron HTTP requests with session cookies, React progress bars with gradients, usage data fetching
**Confidence:** MEDIUM

## Summary

Phase 3 requires fetching usage data from Claude.ai's web interface using authenticated session cookies, displaying three progress bars with smooth gradient color transitions, and updating the tray icon color based on the most limiting constraint. The standard approach uses Electron's native `net.fetch()` API with session cookie support, CSS linear-gradient for smooth color transitions in progress bars, and `date-fns` for formatting reset countdown times.

The primary technical challenge is discovering and calling Claude.ai's internal usage API endpoint, which is not publicly documented. This will require inspecting network traffic in a browser's developer tools to identify the endpoint, headers, and response structure.

**Primary recommendation:** Use Electron's `net.fetch()` with `useSessionCookies: true` to make authenticated requests from the main process, build simple CSS-based progress bars with linear-gradient (avoiding library overhead), and use IPC to push usage updates from main to renderer with proper TypeScript interfaces.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron net.fetch() | Built-in (v32+) | HTTP requests from main process | Native Chromium network stack with session cookie support |
| date-fns | ^4.x | Time formatting and countdowns | Lightweight, tree-shakeable, comprehensive date utilities with TypeScript support |
| React useState/useEffect | Built-in (19.2.4) | State management and data refresh | Standard React primitives for component state and side effects |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS linear-gradient | Native | Progress bar gradients | Simple smooth color transitions without library overhead |
| Electron IPC (ipcMain/ipcRenderer) | Built-in | Main-to-renderer data push | Sending usage updates to UI when data refreshes |
| contextBridge | Built-in | Secure API exposure | Exposing IPC methods to renderer with type safety |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS linear-gradient | react-progressbar-fancy, react-gradient-progress | Libraries add bundle size but provide animations; CSS is sufficient for static gradients |
| date-fns | day.js, moment.js | day.js is smaller but date-fns has better TypeScript support; moment.js is deprecated |
| net.fetch() | electron-fetch, axios | Third-party libraries work but net.fetch() is native and uses Chromium network stack directly |

**Installation:**
```bash
npm install date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── api/              # Claude.ai API client
│   │   ├── usage.ts      # Fetch usage data from claude.ai
│   │   └── types.ts      # Usage data TypeScript interfaces
│   ├── auth/             # Existing auth module
│   ├── state/            # Application state management
│   │   └── usage.ts      # Usage data state and cache
│   └── tray.ts           # Existing tray management (update icon color)
├── renderer/src/
│   ├── components/
│   │   ├── ProgressBar.tsx      # Reusable progress bar with gradient
│   │   └── UsageDisplay.tsx     # Three progress bars + reset times
│   └── App.tsx                   # Existing app (integrate usage display)
└── preload/
    └── index.ts          # Existing preload (add usage IPC methods)
```

### Pattern 1: Authenticated Fetch with Session Cookies
**What:** Use Electron's net.fetch() to make HTTP requests that automatically include session cookies
**When to use:** Fetching data from authenticated web APIs where login was done in a BrowserWindow
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/net
import { net, session } from 'electron'

async function fetchUsageData(): Promise<UsageData> {
  const response = await net.fetch('https://claude.ai/api/usage', {
    method: 'GET',
    credentials: 'include', // Sends cookies from session
    session: session.defaultSession
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}
```

**Note on useSessionCookies (MEDIUM confidence):**
Per GitHub PR #22704 and electron-fetch docs, `useSessionCookies: true` flag exists but behavior varies by Electron version. For Electron >= 11, using `credentials: 'include'` is the recommended approach. Fallback: if cookies aren't sent automatically, use `session.defaultSession.cookies.get()` to manually retrieve and set Cookie header.

### Pattern 2: CSS Linear Gradient Progress Bars
**What:** Use CSS linear-gradient for smooth color transitions from green to yellow to red
**When to use:** Progress bars that need to show status via color gradient
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient
interface ProgressBarProps {
  percentage: number
  label: string
}

function ProgressBar({ percentage, label }: ProgressBarProps) {
  // Calculate gradient color based on percentage
  const getGradientColor = (pct: number) => {
    if (pct < 70) return 'linear-gradient(to right, #22c55e, #22c55e)' // green
    if (pct < 90) return 'linear-gradient(to right, #22c55e, #eab308)' // green to yellow
    return 'linear-gradient(to right, #eab308, #ef4444)' // yellow to red
  }

  return (
    <div className="progress-container">
      <div className="progress-label">{label}</div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            background: getGradientColor(percentage)
          }}
        />
      </div>
      <div className="progress-percentage">{percentage}%</div>
    </div>
  )
}
```

**Alternative approach with continuous gradient:**
```css
/* Full gradient from green to yellow to red */
.progress-bar-fill {
  background: linear-gradient(to right,
    #22c55e 0%,    /* green at start */
    #eab308 70%,   /* yellow at 70% */
    #ef4444 100%   /* red at end */
  );
  /* Clip to actual percentage using width */
  width: var(--percentage);
}
```

### Pattern 3: Time Formatting with date-fns
**What:** Format reset timestamps as absolute times and relative durations
**When to use:** Displaying countdown timers and reset times
**Example:**
```typescript
// Source: https://date-fns.org/docs/format
import { format, formatDistanceToNow } from 'date-fns'

interface ResetTimeProps {
  resetAt: Date
}

function ResetTime({ resetAt }: ResetTimeProps) {
  // Primary: absolute time "Resets at 3:00 PM"
  const absoluteTime = format(resetAt, 'h:mm a')

  // Hover tooltip: relative duration "in 2 hours"
  const relativeTime = formatDistanceToNow(resetAt, { addSuffix: true })

  return (
    <div className="reset-time" title={relativeTime}>
      Resets at {absoluteTime}
    </div>
  )
}
```

### Pattern 4: IPC Data Push (Main to Renderer)
**What:** Push usage data updates from main process to renderer using IPC events
**When to use:** Notifying UI when background data refresh completes
**Example:**
```typescript
// Preload script
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing methods...
  getUsageData: () => ipcRenderer.invoke('usage:get'),
  refreshUsageData: () => ipcRenderer.invoke('usage:refresh'),
  onUsageDataChanged: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('usage-data-changed', subscription)
    return () => ipcRenderer.removeListener('usage-data-changed', subscription)
  }
})

// Main process
import { BrowserWindow, ipcMain } from 'electron'

ipcMain.handle('usage:refresh', async () => {
  const data = await fetchUsageData()

  // Notify all renderer windows
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('usage-data-changed', data)
  })

  // Update tray icon color based on data
  updateTrayIcon(data)

  return data
})
```

### Pattern 5: Stale Data Indicator
**What:** Show "Last updated X minutes ago" when data couldn't be refreshed
**When to use:** Network errors or offline mode
**Example:**
```typescript
// Source: https://date-fns.org/docs/formatDistanceToNow
interface UsageDisplayProps {
  data: UsageData | null
  lastUpdated: Date | null
  error: Error | null
}

function UsageDisplay({ data, lastUpdated, error }: UsageDisplayProps) {
  if (error && data) {
    // Show stale data with indicator
    const staleness = lastUpdated
      ? formatDistanceToNow(lastUpdated, { addSuffix: true })
      : 'unknown'

    return (
      <div>
        <div className="stale-indicator">
          ⚠️ Last updated {staleness}
        </div>
        {/* Render data with visual indication it's stale */}
        <UsageMetrics data={data} stale />
      </div>
    )
  }

  if (!data) {
    return <div>No usage data yet.</div>
  }

  return <UsageMetrics data={data} />
}
```

### Anti-Patterns to Avoid
- **Polling in React with setInterval:** Don't poll from renderer - this duplicates requests if multiple windows exist. Poll from main process and push updates to renderer.
- **Manual cookie header construction:** Don't manually get/set cookies in HTTP headers - use `credentials: 'include'` to let Electron handle it automatically.
- **Heavy progress bar libraries:** Don't install libraries for simple linear gradients - CSS is sufficient and keeps bundle small.
- **Blocking main process during fetch:** Don't use synchronous requests - always use async/await to prevent UI freezes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date/time formatting | Custom "2h 34m" parser | date-fns formatDistanceToNow | Handles edge cases (singular/plural, internationalization, DST) |
| HTTP client | Custom net.request wrapper | Built-in net.fetch() | Modern fetch API with session integration, better than reinventing |
| State management for simple updates | Redux, Zustand, etc. | useState + IPC events | Over-engineering for 3 metrics; React state + IPC push is sufficient |
| Progress bar animations | Custom requestAnimationFrame loop | CSS transitions | CSS handles smooth width changes without JS overhead |

**Key insight:** This phase has simple data flow (fetch → display) without complex state requirements. Existing Electron APIs (net.fetch, IPC) and React primitives (useState/useEffect) handle the core patterns. Libraries should only be added where they meaningfully reduce code (date-fns for time formatting).

## Common Pitfalls

### Pitfall 1: Cookie Sending Configuration
**What goes wrong:** Fetch requests return 401 Unauthorized even though user is logged in via browser
**Why it happens:** By default, Electron's net.fetch() does NOT send cookies unless explicitly configured with `credentials: 'include'` or `useSessionCookies: true`
**How to avoid:** Always set `credentials: 'include'` when calling net.fetch() for authenticated endpoints. Verify cookies are sent by checking request headers in network inspector.
**Warning signs:** Fetch succeeds from browser dev tools but fails from Electron; 401/403 errors despite valid session

### Pitfall 2: Unknown Claude.ai API Endpoint
**What goes wrong:** No public documentation exists for Claude.ai's usage data endpoint
**Why it happens:** Claude.ai's web interface uses internal/private APIs not intended for third-party access
**How to avoid:**
1. Open claude.ai/settings/usage in Chrome DevTools
2. Go to Network tab, filter by Fetch/XHR
3. Reload page or trigger data refresh
4. Identify the request that returns usage data (look for JSON responses with limit information)
5. Note the endpoint URL, HTTP method, required headers, and response structure
6. Test endpoint from Electron using same session cookies
**Warning signs:** Cannot find usage data in response; endpoint returns HTML instead of JSON; CORS errors

### Pitfall 3: Gradient Color Clipping in Progress Bars
**What goes wrong:** Progress bar gradient stretches/squishes as percentage changes, making colors inconsistent
**Why it happens:** Applying gradient directly to the fill element means 0% always starts green and 100% of fill always ends at current color
**How to avoid:** Use fixed gradient across entire track, or calculate gradient breakpoints based on percentage thresholds (0-70% green, 70-90% yellow transition, 90-100% red)
**Warning signs:** A 50% bar shows different colors than expected; gradient "moves" as percentage changes

### Pitfall 4: Stale Data Not Cached
**What goes wrong:** Network error causes UI to show "No data" instead of last-known values
**Why it happens:** Fetch failure overwrites state with null/undefined instead of preserving previous successful data
**How to avoid:** Separate data state from error state. On fetch failure, keep existing data and set error flag. Only clear data when user logs out.
**Warning signs:** UI flickers between data and empty state; user loses information when network is temporarily unavailable

### Pitfall 5: Tray Icon Update Race Condition
**What goes wrong:** Tray icon color doesn't update immediately after data refresh
**Why it happens:** Async fetch completes but tray update happens before renderer state updates, or update isn't triggered at all
**How to avoid:** Update tray icon synchronously in the same function that processes fetch response, before sending IPC event to renderer. Don't rely on renderer to notify main about color changes.
**Warning signs:** Popup shows updated data but tray icon stays old color; manual refresh needed to sync

### Pitfall 6: TypeScript Interface Mismatches
**What goes wrong:** Runtime errors when Claude.ai API response structure doesn't match TypeScript interfaces
**Why it happens:** Interfaces are written based on assumptions, not actual API responses
**How to avoid:** Inspect actual API response in browser DevTools, copy the JSON, and generate TypeScript interfaces from real data (use tools like json2ts). Add runtime validation (e.g., Zod) if API structure might change.
**Warning signs:** `Cannot read property 'X' of undefined`; type assertions needed everywhere; frequent null checks

## Code Examples

Verified patterns from official sources:

### Fetching Usage Data with Session Cookies
```typescript
// Source: https://www.electronjs.org/docs/latest/api/net
// src/main/api/usage.ts

import { net, session } from 'electron'

export interface UsageLimit {
  current: number
  total: number
  percentage: number
  resetAt: string // ISO timestamp
}

export interface UsageData {
  sessionLimit: UsageLimit
  weeklyAllModels: UsageLimit
  weeklySonnet: UsageLimit
  fetchedAt: string // ISO timestamp
}

/**
 * Fetch usage data from Claude.ai
 * Requires authenticated session (cookies from browser login)
 */
export async function fetchUsageData(): Promise<UsageData> {
  // NOTE: This endpoint is discovered via browser DevTools
  // Replace with actual endpoint after inspection
  const response = await net.fetch('https://claude.ai/api/account/usage', {
    method: 'GET',
    credentials: 'include', // Include session cookies
    session: session.defaultSession,
    headers: {
      'Accept': 'application/json',
      // Add any required headers discovered from DevTools
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch usage: ${response.status} ${response.statusText}`)
  }

  const rawData = await response.json()

  // Transform API response to UsageData structure
  // (Actual transformation depends on API response format)
  return {
    sessionLimit: parseLimit(rawData.session),
    weeklyAllModels: parseLimit(rawData.weeklyAll),
    weeklySonnet: parseLimit(rawData.weeklySonnet),
    fetchedAt: new Date().toISOString()
  }
}

function parseLimit(raw: any): UsageLimit {
  return {
    current: raw.current ?? 0,
    total: raw.total ?? 100,
    percentage: Math.round((raw.current / raw.total) * 100),
    resetAt: raw.resetAt ?? new Date().toISOString()
  }
}
```

### Progress Bar Component with Gradient
```typescript
// Source: CSS gradient patterns from MDN
// src/renderer/src/components/ProgressBar.tsx

import React from 'react'
import './ProgressBar.css'

interface ProgressBarProps {
  label: string
  percentage: number
  current: number
  total: number
  resetAt: Date
  isLimiting?: boolean // Most limiting constraint
}

export function ProgressBar({
  label,
  percentage,
  current,
  total,
  resetAt,
  isLimiting = false
}: ProgressBarProps) {
  // Calculate gradient based on percentage thresholds
  const getBarColor = (pct: number) => {
    if (pct < 70) return '#22c55e' // green
    if (pct < 90) return '#eab308' // yellow
    return '#ef4444' // red
  }

  const getGradient = (pct: number) => {
    if (pct < 70) {
      // All green
      return 'linear-gradient(to right, #22c55e, #22c55e)'
    } else if (pct < 90) {
      // Green to yellow transition
      const yellowStart = ((70 / pct) * 100).toFixed(0)
      return `linear-gradient(to right, #22c55e ${yellowStart}%, #eab308 100%)`
    } else {
      // Yellow to red transition
      const yellowStart = ((70 / pct) * 100).toFixed(0)
      const redStart = ((90 / pct) * 100).toFixed(0)
      return `linear-gradient(to right, #22c55e ${yellowStart}%, #eab308 ${redStart}%, #ef4444 100%)`
    }
  }

  return (
    <div className={`progress-bar-container ${isLimiting ? 'limiting' : ''}`}>
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-percentage">{percentage}%</span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            background: getGradient(percentage)
          }}
        />
      </div>

      <div className="progress-footer" title={`${current} / ${total}`}>
        <ResetTime resetAt={resetAt} />
      </div>
    </div>
  )
}
```

### Reset Time Formatting
```typescript
// Source: https://date-fns.org/docs/format, https://date-fns.org/docs/formatDistanceToNow
// src/renderer/src/components/ResetTime.tsx

import React from 'react'
import { format, formatDistanceToNow } from 'date-fns'

interface ResetTimeProps {
  resetAt: Date
}

export function ResetTime({ resetAt }: ResetTimeProps) {
  const absoluteTime = format(resetAt, 'h:mm a') // "3:00 PM"
  const relativeTime = formatDistanceToNow(resetAt, { addSuffix: true }) // "in 2 hours"

  return (
    <div className="reset-time" title={relativeTime}>
      Resets at {absoluteTime}
    </div>
  )
}
```

### IPC Methods for Usage Data
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc
// src/preload/index.ts (addition to existing file)

export interface UsageData {
  sessionLimit: UsageLimit
  weeklyAllModels: UsageLimit
  weeklySonnet: UsageLimit
  fetchedAt: string
}

export interface ElectronAPI {
  // ... existing methods

  // Usage data methods
  getUsageData: () => Promise<UsageData | null>
  refreshUsageData: () => Promise<UsageData>
  onUsageDataChanged: (callback: (data: UsageData) => void) => () => void
}

// In preload implementation:
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing

  getUsageData: () => ipcRenderer.invoke('usage:get'),
  refreshUsageData: () => ipcRenderer.invoke('usage:refresh'),
  onUsageDataChanged: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('usage-data-changed', handler)
    return () => ipcRenderer.removeListener('usage-data-changed', handler)
  }
})
```

### Tray Icon Color Update
```typescript
// Source: Existing tray.ts pattern
// src/main/tray.ts (additions)

import { nativeImage } from 'electron'
import type { UsageData } from './api/types'

/**
 * Update tray icon color based on most limiting constraint
 */
export function updateTrayForUsage(data: UsageData): void {
  // Find the most limiting constraint (highest percentage)
  const percentages = [
    data.sessionLimit.percentage,
    data.weeklyAllModels.percentage,
    data.weeklySonnet.percentage
  ]

  const maxPercentage = Math.max(...percentages)

  let iconColor: 'green' | 'yellow' | 'red'
  if (maxPercentage >= 90) {
    iconColor = 'red'
  } else if (maxPercentage >= 70) {
    iconColor = 'yellow'
  } else {
    iconColor = 'green'
  }

  const iconPath = path.join(__dirname, '../../resources', `tray-icon-${iconColor}.png`)
  const icon = nativeImage.createFromPath(iconPath)

  if (tray && !tray.isDestroyed()) {
    tray.setImage(icon)
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| axios in renderer | net.fetch() in main process | Electron 23+ (2023) | Better security (no nodeIntegration), automatic cookie handling |
| moment.js | date-fns | ~2020 | Smaller bundle (date-fns is tree-shakeable), moment is now in maintenance mode |
| Custom fetch wrappers | Native fetch API | Electron 23+ | Less code to maintain, uses Chromium's network stack |
| Heavy UI libraries (Material-UI, Ant Design) | CSS + simple components | Modern trend | Smaller bundle, faster startup for simple UIs |

**Deprecated/outdated:**
- **electron-fetch package**: Native `net.fetch()` is now available in Electron 23+, making third-party fetch wrappers unnecessary
- **moment.js**: Officially in maintenance mode; date-fns or day.js are recommended alternatives
- **nodeIntegration: true**: Security risk; modern apps use contextBridge instead

## Open Questions

Things that couldn't be fully resolved:

1. **Claude.ai Usage API Endpoint Structure**
   - What we know: Claude.ai has a settings/usage page that fetches data; endpoint is not publicly documented
   - What's unclear: Exact endpoint URL, required headers, authentication mechanism, response schema
   - Recommendation: First step of implementation MUST be inspecting network traffic in browser DevTools to discover the endpoint. Document findings in code comments.

2. **Session Cookie Expiration Handling**
   - What we know: Phase 2 implemented session persistence with 30-day cookie expiration
   - What's unclear: How Claude.ai handles expired sessions (401 response? Redirect? Specific error code?)
   - Recommendation: Test fetch with expired session and implement detection based on observed behavior. May need to check response.status === 401 or look for specific error message in JSON.

3. **Rate Limiting on Usage Endpoint**
   - What we know: Claude.ai has rate limits on actual usage
   - What's unclear: Whether the usage API endpoint itself has rate limits (could it block if polled too aggressively?)
   - Recommendation: Start with conservative refresh intervals (manual only in Phase 3; automated in Phase 4 with 5-minute default). Monitor for 429 responses.

4. **Gradient Color Breakpoints**
   - What we know: CONTEXT.md delegates exact gradient thresholds to Claude's discretion
   - What's unclear: Should gradient be continuous across entire bar, or should it change only at threshold percentages?
   - Recommendation: Use threshold-based approach (discrete color zones) for clearer visual indication. If user prefers continuous gradient during testing, easy to switch in getGradient() function.

## Sources

### Primary (HIGH confidence)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc) - IPC patterns for main-to-renderer communication
- [Electron Net Module](https://www.electronjs.org/docs/latest/api/net) - net.fetch() API and session integration
- [Electron Tray API](https://www.electronjs.org/docs/latest/api/tray) - Dynamic icon updates with setImage()
- [CSS linear-gradient (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient) - Gradient syntax and color stops
- [date-fns Documentation](https://date-fns.org/docs/format) - format(), formatDistanceToNow(), formatRelative()

### Secondary (MEDIUM confidence)
- [Electron PR #22704: Cookie store support](https://github.com/electron/electron/pull/22704) - useSessionCookies flag implementation
- [electron-fetch npm package](https://www.npmjs.com/package/electron-fetch) - Third-party fetch with cookie support (now superseded by native net.fetch)
- [React Countdown Timer Libraries 2026](https://blog.croct.com/post/best-react-countdown-timer-libraries) - Comparison of timer/countdown approaches
- [TypeScript Type Safety in React 2026](https://www.nucamp.co/blog/typescript-fundamentals-in-2026-why-every-full-stack-developer-needs-type-safety) - Modern TS patterns for React props

### Tertiary (LOW confidence - requires verification)
- [Claude.ai Usage Limits Overview](https://claudelog.com/faqs/claude-limit/) - General information about usage limits (not technical API details)
- [Reverse Engineering Claude Code](https://medium.com/@liranyoffe/reverse-engineering-claude-code-web-tools-1409249316c3) - Network inspection techniques (not specific to usage endpoint)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Electron net.fetch(), date-fns, and React patterns are well-documented
- Architecture: HIGH - IPC patterns and component structure follow established Electron best practices
- Pitfalls: MEDIUM - Cookie configuration and gradient clipping are known issues; Claude.ai endpoint discovery is unverified

**Research date:** 2026-01-28
**Valid until:** 2026-02-27 (30 days - Electron and React are stable ecosystems)

**Critical next step:** Before planning, inspect claude.ai/settings/usage in browser DevTools to discover the actual API endpoint. All planning depends on knowing the endpoint URL and response structure.
