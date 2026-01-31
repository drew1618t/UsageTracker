# Claude Usage Tray Widget

## What This Is

A Windows system tray application that displays Claude.ai usage limits at a glance with color-coded indicators, browser-based authentication, and configurable background polling. The tray icon reflects the most limiting usage constraint, and clicking it reveals a popup with three progress bars showing session, weekly all-models, and weekly Sonnet limits with reset countdowns.

## Core Value

See how close you are to your Claude usage limits without leaving what you're doing — one glance at the system tray tells you if you're good, getting close, or tapped out.

## Requirements

### Validated

- ✓ TRAY-01: Persistent system tray icon surviving Explorer restarts — v1.0
- ✓ TRAY-02: Tray icon color reflects most limiting usage (green/yellow/red) — v1.0
- ✓ TRAY-03: Tooltip shows current usage summary — v1.0
- ✓ TRAY-04: Right-click context menu with Refresh, Settings, Login, Exit — v1.0
- ✓ AUTH-01: Browser login flow to Claude.ai — v1.0
- ✓ AUTH-02: Session persistence across app restarts — v1.0
- ✓ AUTH-03: Expired session detection with re-auth prompt — v1.0
- ✓ DATA-01: Three progress bars (session, weekly all-models, weekly Sonnet) — v1.0
- ✓ DATA-02: Reset countdown display for each limit — v1.0
- ✓ DATA-03: Most limiting constraint visually emphasized — v1.0
- ✓ DATA-04: Stale data indicator when offline — v1.0
- ✓ POLL-01: Background polling on configurable interval — v1.0
- ✓ POLL-02: Manual refresh from popup and context menu — v1.0
- ✓ POLL-03: Configurable polling interval (1-30 min) — v1.0
- ✓ POLL-04: Auto-start with Windows boot — v1.0

### Active

**Current Milestone: v1.1 Polish & Fixes**

- [ ] DISPLAY-01: Session limit shown by default; weekly only when >90% or more limiting in final 10%
- [ ] DISPLAY-02: Tray icon color still reflects weekly thresholds for early warning
- [ ] FIX-01: Auto-start launches app correctly (not bare electron.exe)

### Out of Scope

- Toast/popup notifications — user wants visual-only indication via color, no interruptions
- Multi-platform support — Windows only for v1
- Historical usage tracking or graphs — just current state
- Cost/billing information — focus is on rate limits only
- Claude API key management — this reads the web UI usage, not API usage

## Context

**Current state:** Shipped v1.0 with ~1,829 LOC TypeScript.

**Tech stack:** Electron + electron-vite, React, TypeScript, electron-store, exponential-backoff, date-fns.

**Architecture:**
- Main process: tray management, auth session handling, usage API polling, settings persistence
- Preload: secure IPC bridge via contextBridge
- Renderer: React popup with usage display and settings UI

**API endpoint:** `https://claude.ai/api/organizations/{org_id}/usage` (org_id from lastActiveOrg cookie)

## Constraints

- **Platform**: Windows only — must integrate with Windows system tray
- **Auth**: Must use browser login flow (no manual cookie/token pasting)
- **UX**: No popups, toasts, or modal dialogs for alerts — color changes only
- **Data source**: Claude.ai web usage page (not the Anthropic API console)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Windows system tray widget | User wants always-visible, non-intrusive usage display | ✓ Good |
| Browser login over cookie pasting | Better UX, no manual dev tools steps | ✓ Good |
| Color-coded alerts only (no popups) | User explicitly wants no interruptions | ✓ Good |
| Show most-limiting limit on icon | Quick triage — the tightest constraint is what matters | ✓ Good |
| electron-vite over webpack | Modern Vite-based tooling, faster dev experience | ✓ Good |
| BrowserWindow for login (not shell.openExternal) | System browser cookies separate from Electron session | ✓ Good |
| Cookie polling for auth detection | Simpler than deep-linking, sufficient for use case | ✓ Good |
| net.request with useSessionCookies | Reliable cookie handling with custom session partitions | ✓ Good |
| electron-store for settings | De-facto standard for Electron, simple persistence | ✓ Good |
| Recursive setTimeout for polling | Allows dynamic interval changes without restart | ✓ Good |
| Exponential backoff with auth error detection | Prevents aggressive retry loops on auth failures | ✓ Good |
| Session-first display logic | Session is the day-to-day constraint; weekly only matters when nearly exhausted | — Pending |

---
*Last updated: 2026-01-31 after v1.1 milestone start*
