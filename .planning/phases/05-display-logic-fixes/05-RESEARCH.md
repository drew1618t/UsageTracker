# Phase 5: Display Logic & Fixes - Research

**Researched:** 2026-01-31
**Domain:** Electron conditional display logic, Windows auto-start registry configuration
**Confidence:** MEDIUM

## Summary

This research covers implementing session-first display logic with intelligent weekly limit prioritization, and fixing Windows auto-start issues in an Electron application. The phase addresses display logic for choosing which usage limit to show users (session vs weekly) based on smart thresholds, ensuring tray icon color reflects any approaching limit, and resolving auto-start launching electron.exe instead of the packaged application.

The standard approach for display logic involves conditional threshold checking (>90% weekly usage AND final 10% being more limiting) with separate tray icon evaluation checking all limits independently. For auto-start, NSIS installers using app.setLoginItemSettings should use process.execPath in production, but need special handling for Squirrel-based updaters which require pointing to Update.exe with --processStart arguments.

The auto-start issue stems from Windows registry entries potentially pointing to incorrect executable paths. NSIS installers place apps in Program Files with the proper executable name ("App Name.exe"), and process.execPath correctly points to this in packaged apps. However, if using Squirrel.Windows for auto-updates, the registry must point to Update.exe one directory up from the current executable.

**Primary recommendation:** Implement session-first display with calculated weekly capacity comparison in final 10%, evaluate all limits independently for tray icon color, and verify process.execPath configuration for NSIS auto-start (add Squirrel-specific path logic only if using Squirrel auto-updater).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 4.1.0 | Time calculations and formatting | Already in project, lightweight, immutable |
| electron | 40.x | Desktop framework with app.setLoginItemSettings | Current project version |
| electron-store | 11.0.2 | Settings persistence | Already in project for storing autoStartEnabled |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-builder | 26.4.0 | Packaging with NSIS installer | Current project - handles registry paths |
| auto-launch | ~5.0.6 | Cross-platform auto-start management | Consider if Squirrel auto-updater is added |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| app.setLoginItemSettings | auto-launch npm package | auto-launch handles Squirrel automatically but adds dependency; setLoginItemSettings is native but needs manual Squirrel handling |
| Manual percentage comparison | Library for complex rules | Manual logic sufficient for this simple threshold case |
| Date-fns | moment.js or day.js | date-fns already in project, tree-shakeable, modern |

**Installation:**
```bash
# Already installed in project
npm install date-fns@^4.1.0 electron-store@^11.0.2
# Optional if Squirrel auto-updater added later
npm install auto-launch
```

## Architecture Patterns

### Pattern 1: Session-First Display with Weekly Override
**What:** Show session limit by default, switch to weekly only when >90% used AND more limiting
**When to use:** When displaying single "most relevant" limit to user
**Example:**
```typescript
interface UsageLimit {
  current: number
  total: number
  percentage: number
  resetAt: string
}

function selectPrimaryLimit(
  sessionLimit: UsageLimit,
  weeklyLimit: UsageLimit
): { limit: UsageLimit; type: 'session' | 'weekly' } {
  // Default to session
  if (weeklyLimit.percentage <= 90) {
    return { limit: sessionLimit, type: 'session' }
  }

  // Weekly is >90%, check if it's more limiting in final 10%
  // Approximation: 1 session ≈ 10% weekly capacity
  const weeklyRemaining = weeklyLimit.total - weeklyLimit.current
  const sessionRemaining = sessionLimit.total - sessionLimit.current

  // Rough conversion: weekly capacity / 10 ≈ session capacity
  const weeklyRemainingInSessions = weeklyRemaining / (weeklyLimit.total / 10)

  // If weekly remaining (converted to session units) < session remaining,
  // then weekly is more limiting
  if (weeklyRemainingInSessions < sessionRemaining) {
    return { limit: weeklyLimit, type: 'weekly' }
  }

  return { limit: sessionLimit, type: 'session' }
}
```

### Pattern 2: Independent Threshold Evaluation for Tray Icon
**What:** Evaluate all limits separately, apply color if ANY limit hits threshold
**When to use:** Tray icon color should warn about any approaching limit
**Example:**
```typescript
function determineTrayIconColor(
  sessionLimit: UsageLimit,
  weeklyAllModels: UsageLimit,
  weeklySonnet: UsageLimit
): 'green' | 'yellow' | 'red' {
  const limits = [
    sessionLimit.percentage,
    weeklyAllModels.percentage,
    weeklySonnet.percentage
  ]

  const maxPercentage = Math.max(...limits)

  if (maxPercentage >= 90) return 'red'
  if (maxPercentage >= 70) return 'yellow'
  return 'green'
}

// This ensures early warning - if ANY limit approaches threshold,
// user sees color change even if it's not the "primary" displayed limit
```

### Pattern 3: Windows Auto-Start with NSIS (Standard Build)
**What:** Configure auto-start for NSIS-packaged Electron app
**When to use:** Standard electron-builder NSIS target without Squirrel auto-updater
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app
import { app } from 'electron'

export function setAutoStart(enabled: boolean): void {
  // NSIS installs to: C:\Program Files\App Name\App Name.exe
  // In production, process.execPath points to the correct executable
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
    path: process.execPath  // Correct for NSIS builds
  })
}

// Verify auto-start is correctly configured
export function getAutoStartStatus(): boolean {
  const loginItemSettings = app.getLoginItemSettings()
  return loginItemSettings.openAtLogin
}
```

### Pattern 4: Windows Auto-Start with Squirrel (If Using Auto-Updater)
**What:** Configure auto-start for Squirrel.Windows auto-updater
**When to use:** Only if implementing Squirrel-based auto-updates
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

function isSquirrelInstall(): boolean {
  const updateExe = path.resolve(
    path.dirname(process.execPath),
    '..',
    'Update.exe'
  )
  return fs.existsSync(updateExe)
}

export function setAutoStart(enabled: boolean): void {
  if (isSquirrelInstall()) {
    // Squirrel.Windows requires pointing to Update.exe
    const appFolder = path.dirname(process.execPath)
    const updateExe = path.resolve(appFolder, '..', 'Update.exe')
    const exeName = path.basename(process.execPath)

    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: updateExe,
      args: [
        '--processStart', `"${exeName}"`,
        '--process-start-args', '"--hidden"'
      ]
    })
  } else {
    // NSIS or development
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false,
      path: process.execPath
    })
  }
}
```

### Pattern 5: Tooltip Display Priority Logic
**What:** Update tooltip to show session by default, weekly when prioritized
**When to use:** Tooltip should match popup's primary display
**Example:**
```typescript
export function updateTrayTooltip(
  sessionLimit: UsageLimit,
  weeklyLimit: UsageLimit
): void {
  const { limit, type } = selectPrimaryLimit(sessionLimit, weeklyLimit)

  const percentage = Math.round(limit.percentage)
  const label = type === 'session' ? 'Session' : 'Weekly'

  const tooltip = `Claude: ${label} ${percentage}%`
  tray.setToolTip(tooltip)
}
```

### Anti-Patterns to Avoid
- **Coupling tray color to displayed limit:** Icon color should reflect ANY limit approaching threshold, not just the one being displayed
- **Hardcoded registry paths:** Never manually write to Windows registry; use app.setLoginItemSettings API
- **Ignoring Squirrel detection:** If Update.exe exists, must use Squirrel-specific path; process.execPath won't work on startup
- **Percentage-only comparison:** In final 10%, compare absolute remaining capacity (converted to same units) not just percentages
- **Assuming development == production paths:** process.execPath differs significantly; always test in packaged builds

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auto-start registry management | Direct registry writes via Windows API | app.setLoginItemSettings | Handles all Windows versions, UAC permissions, and registry structure automatically |
| Cross-platform auto-launch | Platform-specific registry/LaunchAgents code | auto-launch npm package | Handles Windows (registry), macOS (LaunchAgents), Linux (autostart) with single API |
| Time until reset calculation | Manual date math with timezones | date-fns formatDistanceToNow | Handles DST, leap years, timezone conversions, i18n |
| Squirrel detection | File system checks across app | electron-squirrel-startup | Standard package for Squirrel event handling and detection |

**Key insight:** Windows auto-start registry management is complex (different paths for NSIS vs Squirrel, UAC permissions, registry key structure). Electron's app.setLoginItemSettings abstracts this, but requires correct path parameter. Using process.execPath works for NSIS; Squirrel requires Update.exe. The auto-launch package handles both cases automatically.

## Common Pitfalls

### Pitfall 1: Auto-Start Launches electron.exe Instead of App
**What goes wrong:** Windows startup launches a bare electron.exe window instead of the branded application.
**Why it happens:** Registry entry points to electron.exe (development path) instead of the packaged application executable. This occurs if app.setLoginItemSettings is called during development with process.execPath, and that registry entry persists even after installing production build.
**How to avoid:**
- During development, app.setLoginItemSettings creates registry entry pointing to local electron.exe (e.g., node_modules/electron/dist/electron.exe)
- Uninstall/reinstall app to clear old registry entries
- In production NSIS build, process.execPath correctly points to "C:\Program Files\App Name\App Name.exe"
- Verify registry entry at: `HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
**Warning signs:** App launches correctly when double-clicked, but Windows startup shows electron.exe window with different icon.

### Pitfall 2: Weekly Display Switching Too Early
**What goes wrong:** Weekly limit displayed when session is still more relevant (e.g., at 80% weekly).
**Why it happens:** Logic checks weekly >90% but doesn't verify it's actually MORE limiting than session.
**How to avoid:** Two-condition check: (1) weekly >90% AND (2) weekly remaining capacity < session remaining capacity (in comparable units).
**Warning signs:** User sees weekly limit when they have plenty of session capacity left.

### Pitfall 3: Tray Icon Stays Green Despite Weekly Warning
**What goes wrong:** Tray icon shows green even though weekly limit is at 85% (yellow threshold).
**Why it happens:** Tray color based only on the "primary displayed limit" instead of evaluating all limits.
**How to avoid:** Separate functions: selectPrimaryLimit() for display, determineTrayIconColor() checking ALL limits independently.
**Warning signs:** User hits weekly limit unexpectedly because icon didn't warn them.

### Pitfall 4: Squirrel Auto-Start Fails Silently
**What goes wrong:** Auto-start checkbox enabled, registry entry created, but app doesn't launch on Windows startup.
**Why it happens:** Using process.execPath with Squirrel installs; registry points to old version path, Squirrel can't find it.
**How to avoid:** Detect Squirrel via Update.exe existence, use Update.exe path with --processStart arguments.
**Warning signs:** getLoginItemSettings shows openAtLogin: true, but app doesn't launch on startup.

### Pitfall 5: Display Logic Breaks with Edge Values
**What goes wrong:** Division by zero or negative percentages when limits are 0 or invalid API data.
**Why it happens:** Not validating API response or handling edge cases (unlimited plans, trials, etc.).
**How to avoid:** Validate limit.total > 0 before calculations, handle null/undefined gracefully, default to session on error.
**Warning signs:** App crashes or shows NaN when API returns unexpected data structure.

## Code Examples

Verified patterns from current codebase and official sources:

### Current Auto-Start Implementation (Needs Fix for NSIS)
```typescript
// Source: src/main/state/settings.ts (current codebase)

export function setAutoStart(enabled: boolean): void {
  store.set('autoStartEnabled', enabled)

  // Current implementation - works in dev, may cause electron.exe issue
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
    path: process.execPath  // This is correct for NSIS, wrong for Squirrel
  })

  notifySettingsChanged()
}

// Fix: Add Squirrel detection if auto-updater is implemented
// Current project uses NSIS only, so process.execPath should work
// Issue likely from development registry entries persisting
```

### Display Logic Integration Points
```typescript
// Location: src/main/tray.ts - updateTrayForUsage function

export function updateTrayForUsage(data: UsageData): void {
  if (!tray || tray.isDestroyed()) return

  // BEFORE (v1.0): Find most limiting by percentage
  const limits = [
    { name: 'Session', percentage: data.sessionLimit.percentage },
    { name: 'Weekly', percentage: data.weeklyAllModels.percentage },
    { name: 'Sonnet', percentage: data.weeklySonnet.percentage }
  ]
  limits.sort((a, b) => b.percentage - a.percentage)
  const mostLimiting = limits[0]

  // AFTER (v1.1): Use session-first with smart weekly override
  const { limit, type } = selectPrimaryLimit(
    data.sessionLimit,
    data.weeklyAllModels
  )
  const displayName = type === 'session' ? 'Session' : 'Weekly'

  // Icon color: Still check ALL limits independently
  const iconColor = determineTrayIconColor(
    data.sessionLimit,
    data.weeklyAllModels,
    data.weeklySonnet
  )

  // Update icon and tooltip
  const iconPath = /* ... */
  tray.setImage(icon)
  tray.setToolTip(`Claude: ${displayName} ${Math.round(limit.percentage)}%`)
}
```

### UsageDisplay Component Priority Logic
```typescript
// Location: src/renderer/src/components/UsageDisplay.tsx

export function UsageDisplay({ data, ... }: UsageDisplayProps) {
  if (!data) return <NoDataState />

  // BEFORE: Sort all limits by percentage
  const limits = [
    { key: 'sessionLimit', ...data.sessionLimit },
    { key: 'weeklyAllModels', ...data.weeklyAllModels },
    { key: 'weeklySonnet', ...data.weeklySonnet }
  ].sort((a, b) => b.percentage - a.percentage)

  // AFTER: Use smart selection for primary emphasis
  const primaryLimit = selectPrimaryLimit(
    data.sessionLimit,
    data.weeklyAllModels
  )

  // Still show all three bars, but mark primary as "isLimiting"
  return (
    <div className="usage-limits">
      <ProgressBar
        key="sessionLimit"
        label="Session Limit"
        {...data.sessionLimit}
        isLimiting={primaryLimit.type === 'session'}
      />
      <ProgressBar
        key="weeklyAllModels"
        label="Weekly (All Models)"
        {...data.weeklyAllModels}
        isLimiting={primaryLimit.type === 'weekly'}
      />
      <ProgressBar
        key="weeklySonnet"
        label="Weekly (Sonnet)"
        {...data.weeklySonnet}
        isLimiting={false}  // Never primary (all-models is more general)
      />
    </div>
  )
}
```

### Verifying Auto-Start Registry Entry (Manual Test)
```powershell
# Check Windows registry for auto-start entry
Get-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" | Format-List

# Look for "Claude Usage Widget" entry
# Should point to: C:\Program Files\Claude Usage Widget\Claude Usage Widget.exe
# NOT: C:\path\to\dev\node_modules\electron\dist\electron.exe
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Show highest percentage limit | Session-first with smart override | v1.1 (this phase) | Better UX: session is day-to-day constraint, weekly only matters when exhausted |
| auto-launch npm package | app.setLoginItemSettings (native) | Electron 6.0+ (2019) | Native API preferred; auto-launch still useful for Squirrel detection |
| Manual registry writes | app.setLoginItemSettings | Always use native API | Security, UAC handling, cross-version compatibility |
| process.execPath for all installers | Squirrel-aware path detection | When using auto-updater | Squirrel requires Update.exe path, not app path |

**Deprecated/outdated:**
- **Direct registry manipulation:** Windows Registry API from Node should never be used; app.setLoginItemSettings handles this correctly
- **Hardcoded paths in setLoginItemSettings:** Always use process.execPath (NSIS) or Update.exe path detection (Squirrel)
- **Simple percentage sorting for display:** Doesn't account for different limit reset schedules and remaining capacity

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Weekly-to-Session Conversion Ratio**
   - What we know: Requirements state "1 session ≈ 10% weekly" as approximation
   - What's unclear: Exact API values for session limit total vs weekly limit total; conversion may vary by plan
   - Recommendation: Use (weeklyLimit.total / 10) as session-equivalent divisor; validate against real API data during testing. May need to adjust ratio based on actual observed values.

2. **Squirrel vs NSIS in Current Build**
   - What we know: electron-builder.yml shows "target: nsis", indicating NSIS installer (not Squirrel)
   - What's unclear: Whether auto-updater will be added in future (would require Squirrel)
   - Recommendation: Current implementation should use process.execPath only (NSIS). Add Squirrel detection only if auto-updater added later. The electron.exe issue is likely from development registry entries persisting; solution is to uninstall and reinstall production build.

3. **Registry Entry Persistence Across Installs**
   - What we know: NSIS uninstaller should remove registry entries, but user reports suggest otherwise
   - What's unclear: Whether electron-builder NSIS uninstaller properly cleans HKCU\...\Run entries
   - Recommendation: Test uninstall/reinstall cycle. If registry entries persist, may need to manually remove old entry before setting new one via app.getLoginItemSettings() check + app.setLoginItemSettings(false) + app.setLoginItemSettings(true).

4. **Auto-Start Behavior with "openAsHidden"**
   - What we know: Current code uses openAsHidden: false
   - What's unclear: Whether tray app should start hidden (no window, tray-only) or visible (popup opens)
   - Recommendation: Keep openAsHidden: false for now (matches current implementation). Tray apps typically start hidden, but current code doesn't auto-open popup, so behavior should be correct. Test on Windows startup to verify UX.

## Sources

### Primary (HIGH confidence)
- [Electron app.setLoginItemSettings API](https://www.electronjs.org/docs/latest/api/app) - Official documentation
- [Electron app.getLoginItemSettings API](https://www.electronjs.org/docs/latest/api/app) - Official documentation
- [date-fns formatDistanceToNow](https://date-fns.org/docs/formatDistanceToNow) - Already in use in project

### Secondary (MEDIUM confidence)
- [auto-launch npm package](https://www.npmjs.com/package/auto-launch) - Handles Squirrel detection automatically
- [electron/electron Issue #10880](https://github.com/electron/electron/issues/10880) - Disable setLoginItemSettings openAtLogin issues
- [electron-userland/electron-builder Issue #1145](https://github.com/electron-userland/electron-builder/issues/1145) - NSIS auto-start implementation
- [electron/electron Issue #25081](https://github.com/electron/electron/issues/25081) - Auto launch to system tray on startup
- [electron-userland/electron-builder NSIS docs](https://www.electron.build/nsis.html) - NSIS installer configuration

### Tertiary (LOW confidence - WebSearch only, marked for validation)
- Various Stack Overflow and GitHub issues about process.execPath vs installed path differences
- Community blog posts about conditional display logic patterns (not Electron-specific)
- Windows Registry auto-start key structure from community sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using libraries already in project (date-fns, electron-store)
- Display logic patterns: HIGH - Straightforward conditional logic based on clear requirements
- Auto-start fix: MEDIUM - Electron API documented, but Squirrel vs NSIS behavior needs testing; registry persistence issue requires validation
- Weekly-to-session conversion: LOW - Approximate ratio given in requirements; actual API values need validation

**Research date:** 2026-01-31
**Valid until:** 2026-02-28 (30 days - stable domain, Electron API unlikely to change)
