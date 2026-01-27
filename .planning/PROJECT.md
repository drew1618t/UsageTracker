# Claude Usage Tray Widget

## What This Is

A Windows system tray application that displays Claude.ai usage limits at a glance. Instead of opening a browser and navigating to the usage page, the user sees a color-coded tray icon reflecting their tightest usage limit, and can click to expand a panel showing all three limits with progress bars and reset countdowns.

## Core Value

See how close you are to your Claude usage limits without leaving what you're doing — one glance at the system tray tells you if you're good, getting close, or tapped out.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] System tray icon that changes color (green/yellow/red) based on the most limiting usage limit
- [ ] Click-to-expand panel showing all 3 limits: session, weekly all-models, weekly Sonnet-only
- [ ] Each limit displays a progress bar and time until reset
- [ ] Background polling every few minutes to keep data fresh
- [ ] Manual refresh option
- [ ] Browser-based login flow to authenticate with Claude.ai
- [ ] Color transitions reflect proximity to limits (green → yellow → red)

### Out of Scope

- Toast/popup notifications — user wants visual-only indication via color, no interruptions
- Multi-platform support — Windows only
- Historical usage tracking or graphs — just current state
- Cost/billing information — focus is on rate limits only
- Claude API key management — this reads the web UI usage, not API usage

## Context

- The usage page at https://claude.ai/settings/usage shows three rate limits:
  1. **Session limit** — resets after a shorter window
  2. **Weekly all-models limit** — total usage across all models in a week
  3. **Weekly Sonnet-only limit** — Sonnet-specific weekly cap
- Each limit has a current usage level and a reset time
- Authentication requires a logged-in Claude.ai session
- The widget needs to extract structured data from the usage page (either by scraping the rendered page or calling underlying APIs that the page uses)

## Constraints

- **Platform**: Windows only — must integrate with Windows system tray
- **Auth**: Must use browser login flow (no manual cookie/token pasting)
- **UX**: No popups, toasts, or modal dialogs for alerts — color changes only
- **Data source**: Claude.ai web usage page (not the Anthropic API console)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Windows system tray widget | User wants always-visible, non-intrusive usage display | — Pending |
| Browser login over cookie pasting | Better UX, no manual dev tools steps | — Pending |
| Color-coded alerts only (no popups) | User explicitly wants no interruptions | — Pending |
| Show most-limiting limit on icon | Quick triage — the tightest constraint is what matters | — Pending |

---
*Last updated: 2026-01-27 after initialization*
