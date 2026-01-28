# Phase 2: Browser Authentication - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log in via browser and maintain authenticated session. Login opens Claude.ai in the system browser, session cookies are persisted in Electron's built-in storage, and the app detects when re-authentication is needed. Creating or modifying usage data display is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Login trigger & flow
- Full browser window (system default browser) opens to Claude.ai login page
- Login accessible from both popup window AND context menu
- Popup shows loading indicator ("Waiting for login...") while login is in progress
- Claude's discretion on callback mechanism (custom protocol handler vs polling vs other)

### Session detection
- Session cookie presence confirms login success
- Proactive cookie check to detect expiry (before API calls fail)
- No distinction between "not logged in" and "session expired" — both show "Please log in"
- Claude's discretion on what user identifier to display (email, name, or just "Logged in" based on what's available)

### Persistence strategy
- Use Electron's built-in session/cookie storage (Chromium standard)
- Logout option available in both popup and context menu
- Session preserved through app updates
- No app-side timeout — trust Claude.ai's session expiry

### Re-auth experience
- Both tray icon AND popup indicate logged-out state
- Gray/muted tray icon when not logged in
- Auto-prompt login on first launch only, never after
- Logged-out popup shows minimal UI: just "Log in to see usage" with button

### Claude's Discretion
- Login callback mechanism (protocol handler, polling, or other reliable approach)
- User identifier format in popup after login
- Exact cookie names/patterns to check for session validity
- Timing of proactive session checks

</decisions>

<specifics>
## Specific Ideas

- Login should feel native — opens real browser, not embedded webview
- Keep logged-out state minimal and non-intrusive
- Gray icon is a gentle "hey, you need to log in" without being alarming

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-browser-authentication*
*Context gathered: 2026-01-28*
