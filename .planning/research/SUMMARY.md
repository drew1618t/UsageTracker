# Project Research Summary

**Project:** Claude Usage Monitor (Windows System Tray Widget)
**Domain:** Windows desktop system tray application with browser authentication
**Researched:** 2026-01-27
**Confidence:** MEDIUM

## Executive Summary

This is a Windows system tray utility that monitors Claude.ai API usage limits in real-time, displaying rate limit status via a color-coded icon (green/yellow/red) with detailed progress bars in a popup panel. The recommended approach uses Electron for cross-platform desktop framework capabilities, Playwright for browser-based authentication, and a main/renderer process architecture separating background logic from UI rendering.

The core technical challenge lies in web scraping authenticated Claude.ai pages without a public API. The optimal architecture uses a main process managing authentication sessions, periodic polling, and tray integration, with separate renderer processes for the authentication window and popup display. This separation ensures responsive UI while maintaining background data fetching.

Key risks center on three areas: fragile HTML parsing (Claude.ai structure changes break scraping), session management (detecting expired authentication and triggering re-login), and Windows tray icon lifecycle (avoiding ghost icons after crashes). Mitigation requires multiple parsing fallback strategies, proactive session validation, and proper cleanup handlers for all application exit paths.

## Key Findings

### Recommended Stack

The technology stack prioritizes rapid development with proven tools over lightweight alternatives. Electron provides mature system tray APIs, built-in Chromium for authentication flows, and excellent Windows support despite its larger footprint (150-200MB installed). Playwright outperforms Puppeteer for authentication through superior persistent context management, enabling session reuse across app restarts without repeated logins.

**Core technologies:**
- **Electron (~33.x)**: Desktop framework — Industry standard with first-class system tray support, built-in browser for auth flows, and mature Windows integration
- **Playwright (~1.48.x)**: Browser automation — Superior persistent context support for saving authenticated sessions, better than Puppeteer for OAuth/login flows
- **React (~18.3.x) + Material-UI (~6.x)**: UI framework — Component model fits progress bars, cards, and panels well; pre-built components save development time
- **Zustand (~5.x)**: State management — Lightweight, TypeScript-friendly alternative to Redux with minimal boilerplate for small apps
- **node-cron (~3.x)**: Background polling — Simple cron syntax for scheduled fetching with drift correction and pause/resume handling

**Critical decision:** Playwright over manual cookie management. Automated browser login provides dramatically better UX than asking users to manually extract cookies from DevTools, despite the complexity overhead.

### Expected Features

System tray monitoring widgets have well-established user expectations. Missing table stakes features cause users to perceive the product as incomplete or broken, while differentiators create competitive advantage.

**Must have (table stakes):**
- **Persistent tray icon** — Core identity; must survive Windows Explorer restarts
- **Visual status at-a-glance** — Color-coding visible without clicking (green/yellow/red)
- **Click to expand details** — Standard pattern: icon summary, click for full data
- **Tooltip on hover** — Instant context without opening full panel
- **Context menu (right-click)** — Settings, Refresh, Exit minimum
- **Manual refresh** — User control when data seems stale
- **Error state indication** — Visual differentiation from depleted vs offline/error
- **Automatic startup** — Monitoring tools run on boot unless user disables
- **Settings persistence** — Config survives restarts (polling interval, preferences)
- **Minimal resource usage** — Idle CPU < 1%, memory < 50MB expected

**Should have (competitive):**
- **Reset countdown timers** — High value, low complexity; reduces uncertainty about quota replenishment
- **Multi-level visual encoding** — Color + icon variations for faster cognitive processing
- **Silent monitoring** — No popup notifications (users value this in system tray apps)
- **Browser-based auth** — More secure and better UX than manual token pasting
- **Offline resilience** — Display last-known-good data when network unavailable

**Defer (v2+):**
- **Historical trends** — High complexity; requires data persistence architecture and charting
- **Multi-account switching** — Complex credential management not needed for MVP
- **Predictive alerts** — Requires historical data first ("you'll hit limit in X hours")
- **Keyboard shortcuts** — Nice-to-have, not critical for system tray utility
- **Dark mode support** — Polish phase feature, not foundational

### Architecture Approach

The recommended architecture uses process separation between background logic (Electron main process) and UI rendering (renderer processes) to maintain responsiveness and security isolation. This pattern prevents UI freezes from blocking background polling and isolates renderer crashes from the core application.

**Major components:**
1. **State Manager** (main process) — Central state store with observer pattern; single source of truth for auth tokens, rate limit data, and settings. Persists state to JSON file for cross-session continuity.
2. **Auth Manager** (main process) — Orchestrates browser window lifecycle; launches Playwright for login, extracts cookies/tokens via JavaScript injection, handles session expiry detection and re-auth triggers.
3. **Data Fetcher** (main process) — Scheduled background polling using node-cron; makes authenticated HTTP requests (API if available, DOM scraping as fallback), parses responses, implements exponential backoff on errors.
4. **System Tray Integration** (main process) — Creates/updates native tray icon, handles click events, manages icon color based on usage thresholds, calculates most limiting metric across three rate limits.
5. **Auth Window** (renderer process) — Hidden browser context for login flow; navigates to Claude.ai, captures user authentication, sends token back to main process via IPC, self-destructs after success.
6. **Popup Window** (renderer process) — On-demand display for detailed data; shows progress bars, countdown timers, and manual refresh button; positioned near tray icon, auto-hides on blur.

**Key pattern:** IPC (Inter-Process Communication) bridges main and renderer processes. Main process never directly manipulates DOM; renderer processes never store auth tokens or perform network operations. This enforces security boundaries and prevents common pitfalls like storing sensitive data in less-trusted renderer contexts.

### Critical Pitfalls

1. **Tray icon lifecycle mismanagement** — Windows doesn't automatically remove tray icons on process crash, leaving "ghost icons" until explorer.exe restarts. Prevention: Implement proper cleanup in `before-quit` handlers, handle Windows-specific quit behavior, ensure single instance enforcement.

2. **Session expiration without detection** — Claude.ai sessions expire (likely 7-30 days) but application continues silently failing or parsing login redirect pages as data. Prevention: Validate every response for redirect indicators, check actual content matches expected structure before parsing, proactively detect 401/auth failures and trigger re-login flow.

3. **Browser auth window lifecycle confusion** — Auth window doesn't close automatically after login (poor UX) or closes too early before token capture (broken auth). Prevention: Monitor URL changes for success patterns, watch for auth cookies appearing, implement timeout fallback with manual "I've logged in" button.

4. **Aggressive polling triggers rate limiting** — Too-frequent requests get application IP-banned by Cloudflare or Claude.ai rate limits. Prevention: Conservative default interval (5 minutes), exponential backoff on errors, detect 429 status codes and respect Retry-After headers, allow user configuration.

5. **HTML parsing fragility** — Claude.ai updates break scraping when CSS selectors or page structure changes. Prevention: Multiple fallback parsing strategies (data attributes → ARIA labels → class names → text content), validate parsed data for sanity (used ≤ limit, reset date valid), graceful degradation showing stale data on parse failure.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Electron Shell + Tray Foundation
**Rationale:** Establish application skeleton and core identity (the tray icon) first. All other features depend on this foundation. Cannot test auth or data fetching without basic tray infrastructure in place.
**Delivers:** Electron app launches, creates persistent system tray icon with static graphic, handles clicks to log events, shows/hides blank popup window.
**Addresses:** Table stakes features (persistent tray icon, tooltip, context menu, click to expand)
**Avoids:** Pitfall #1 (tray lifecycle) by implementing proper cleanup from start; establishes single-instance enforcement to prevent multiple icons.
**Dependencies:** None (foundational phase)
**Complexity:** LOW — Electron boilerplate and Tray API are well-documented

### Phase 2: Browser Authentication Flow
**Rationale:** Authentication blocks all data fetching. Must come before Phase 3 (data fetching). Browser-based auth is complex; getting it working early validates feasibility and prevents late-stage surprises.
**Delivers:** Playwright integration launches browser window for Claude.ai login, user completes OAuth/email login, application extracts session cookies/tokens, persists credentials to encrypted storage, displays "Logged in as [email]" in popup.
**Addresses:** Table stakes (error state indication during auth failures), competitive features (browser-based auth vs manual token pasting)
**Avoids:** Pitfall #2 (session expiration) by building validation from start; Pitfall #3 (auth window lifecycle) through URL monitoring and cookie detection.
**Dependencies:** Phase 1 (need popup window for "Login" button)
**Complexity:** HIGH — Requires reverse-engineering Claude.ai auth mechanism; token extraction strategy uncertain until tested.
**Research flag:** May need `/gsd:research-phase` if Claude.ai uses httpOnly cookies (JavaScript can't read them) or has complex OAuth flow.

### Phase 3: Data Fetching + Parsing
**Rationale:** With auth working, can now fetch real usage data. This phase validates whether Claude.ai has JSON API (preferred) or requires HTML scraping (fallback). Parsing strategy depends on endpoint discovery.
**Delivers:** HTTP client fetches `/settings/usage` or equivalent, parses rate limit data (session limit, weekly all-models, weekly Sonnet), stores structured data in State Manager, handles network errors gracefully.
**Addresses:** Core functional requirement (displaying usage data); table stakes (error state for network failures)
**Avoids:** Pitfall #5 (HTML parsing fragility) by implementing multiple parsing strategies; Pitfall #6 (no offline handling) through stale data caching.
**Dependencies:** Phase 2 (needs auth tokens to make requests)
**Complexity:** MEDIUM-HIGH — Unknown whether API exists; HTML parsing requires resilience to structure changes.
**Research flag:** Needs API endpoint discovery via browser DevTools network inspector during early implementation.

### Phase 4: UI Data Display + Visual Status
**Rationale:** With data fetching working, make it visible. This phase delivers core user value: seeing rate limits and knowing current status at a glance.
**Delivers:** Popup window shows three progress bars (session, weekly all, weekly Sonnet) with current/total values, tray icon color changes based on highest usage percentage (green < 70%, yellow 70-90%, red ≥ 90%), tooltip shows summary text.
**Addresses:** Table stakes (visual status at-a-glance, click to expand details); competitive features (multi-level visual encoding, multiple metric tracking)
**Avoids:** Pitfall #4 (dynamic icon rendering performance) through icon caching and throttled updates; proper high-DPI handling for Windows.
**Dependencies:** Phase 3 (needs data to display)
**Complexity:** LOW-MEDIUM — React components and icon generation are straightforward; Windows DPI handling requires testing.

### Phase 5: Background Polling + Auto-Update
**Rationale:** Manual refresh works but isn't sufficient for monitoring tool. Automatic background polling delivers the "always up-to-date" expectation users have for system tray utilities.
**Delivers:** node-cron schedules data fetches every 5 minutes (configurable), updates tray icon and popup in real-time, implements exponential backoff on errors, detects session expiration and triggers re-auth.
**Addresses:** Table stakes (automatic updates, minimal resource usage); competitive features (silent monitoring)
**Avoids:** Pitfall #4 (aggressive polling) through conservative intervals and backoff; Pitfall #10 (memory leaks) via proper timer cleanup.
**Dependencies:** Phase 3 (data fetching), Phase 4 (visual updates)
**Complexity:** MEDIUM — Polling logic straightforward, but rate limit detection and error handling require careful design.

### Phase 6: Countdown Timers + Polish
**Rationale:** Basic functionality complete; now add competitive differentiators that reduce user anxiety about quota replenishment.
**Delivers:** Each rate limit card shows "Resets in: 2h 34m" or "Resets: Mon Jan 29, 12:00", countdown updates every minute in open popup, Settings dialog for configurable poll interval and startup behavior.
**Addresses:** Competitive features (reset countdown timers, threshold customization); table stakes (settings persistence)
**Avoids:** Pitfall #13 (no settings persistence) through electron-store integration
**Dependencies:** Phase 4 (UI display), Phase 5 (background updates)
**Complexity:** LOW — Countdown logic is simple date math; settings UI is standard form.

### Phase 7: Packaging + Distribution
**Rationale:** Functional app complete; now make it installable and updatable for real users.
**Delivers:** electron-builder creates Windows .exe installer with auto-updater integration, code signing for Windows Defender compatibility, auto-start registry entry (user-configurable), uninstaller.
**Addresses:** Table stakes (automatic startup), future-proofing (update mechanism)
**Avoids:** Pitfall #14 (no update path) by building electron-updater from start; Pitfall #8 (startup performance) through lazy loading and fast tray initialization.
**Dependencies:** All previous phases (packaging final product)
**Complexity:** MEDIUM — electron-builder config straightforward, code signing requires certificate setup.

### Phase Ordering Rationale

- **Foundation-first approach:** Phase 1 (tray shell) must come first; all other components depend on it. Cannot develop auth or polling without basic app infrastructure.
- **Auth before data:** Phase 2 (authentication) blocks Phase 3 (data fetching). Wrong to attempt data fetching first and mock auth; auth complexity often reveals architectural issues that affect data layer.
- **Data before display:** Phase 3 (fetching) before Phase 4 (UI). Can test data fetching with console logs before building full UI; allows iteration on parsing strategy without UI coupling.
- **Manual before automatic:** Phase 4 (manual refresh) before Phase 5 (auto-polling). Validates data flow in simpler context before adding scheduling complexity.
- **Features before packaging:** Phases 1-6 deliver functionality; Phase 7 (packaging) comes last. Premature packaging creates deployment overhead during rapid iteration.

**Critical path dependencies:**
```
Phase 1 (Tray) → Phase 2 (Auth) → Phase 3 (Data) → Phase 4 (Display) → Phase 5 (Polling)
                                                          ↓
                                                    Phase 6 (Polish) → Phase 7 (Package)
```

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Auth):** Claude.ai authentication mechanism uncertain; may use httpOnly cookies (JavaScript can't read), complex OAuth flow, or token-based auth. Needs live testing against actual Claude.ai login to determine extraction strategy. Consider `/gsd:research-phase` if initial approach fails.
- **Phase 3 (Data Parsing):** Unknown if Claude.ai exposes JSON API or requires HTML scraping. API discovery during early implementation might reveal different endpoint structure than assumed. Fallback parsing strategies depend on actual HTML structure.

**Phases with standard patterns (skip additional research):**
- **Phase 1 (Tray Shell):** Electron Tray API well-documented; standard boilerplate sufficient.
- **Phase 4 (UI Display):** React progress bars and Material-UI components follow established patterns; no novel research needed.
- **Phase 5 (Polling):** node-cron usage straightforward; background scheduling patterns well-understood.
- **Phase 6 (Countdown Timers):** Standard JavaScript date math; no research required.
- **Phase 7 (Packaging):** electron-builder documentation comprehensive; standard Windows packaging workflow.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **MEDIUM** | Electron, Playwright, React choices are sound based on 2024-2025 best practices, but version numbers should be verified against current official docs. Zustand and node-cron less critical but proven for use case. |
| Features | **MEDIUM-HIGH** | System tray conventions are stable patterns; table stakes features unlikely to change. Differentiators identified through competitive analysis patterns. Confidence docked because 2026-specific trends unavailable (WebSearch disabled). |
| Architecture | **MEDIUM** | Main/renderer separation is established Electron pattern. Component boundaries and IPC contracts follow best practices. Confidence limited by unknown Claude.ai API details (might require architecture adjustments based on actual endpoints). |
| Pitfalls | **MEDIUM** | Tray lifecycle, session management, and HTML parsing fragility are well-documented challenges. Windows-specific gotchas (DPI, icon cleanup) based on training knowledge. Claude.ai-specific behavior (rate limits, session duration, Cloudflare protection) needs validation. |

**Overall confidence:** MEDIUM

Research is grounded in established patterns for Windows desktop development, browser automation, and system tray utilities. Core architectural decisions are sound. Uncertainty stems primarily from Claude.ai-specific details (authentication mechanism, API availability, rate limiting behavior, session duration) that cannot be verified without live testing.

### Gaps to Address

**CRITICAL gaps (must resolve during Phase 2-3):**
- **Claude.ai authentication token format:** Training data doesn't reveal exact cookie names, token format, or whether httpOnly cookies prevent JavaScript extraction. Must inspect actual login flow via browser DevTools during Phase 2.
- **API endpoint existence:** Unknown if Claude.ai exposes `/api/usage` JSON endpoint or requires HTML scraping. Network inspector during Phase 3 will reveal actual data source. Architecture assumes API-first with HTML fallback; if only HTML available, parsing strategy becomes more complex.
- **Session expiration duration:** Training data suggests typical session lengths (7-30 days) but Claude.ai-specific timeout unknown. Affects re-auth UX frequency. Test by logging in and waiting to see how long session lasts.

**MEDIUM gaps (validate during implementation):**
- **Rate limit thresholds:** Assumptions about when Claude.ai triggers 429 responses or Cloudflare challenges need validation. Start with conservative 5-minute polling and monitor for rate limit signals.
- **HTML structure stability:** If API unavailable, scraping reliability depends on how often Claude.ai redesigns `/settings/usage` page. Multiple parsing fallbacks mitigate but can't eliminate risk.
- **Windows icon rendering performance:** High DPI handling and icon update performance should be tested on actual Windows 10/11 machines with various scale factors (100%, 150%, 200%).

**LOW gaps (nice to verify but not blocking):**
- **Electron version compatibility:** Assumed Electron 33.x with Node 20 LTS; verify latest stable versions during project setup.
- **Playwright context persistence on Windows:** Assumed `storageState` works reliably; test early in Phase 2 to validate session saving/loading.

**Mitigation strategy:** Gaps primarily affect Phase 2 (auth) and Phase 3 (data fetching). Recommend rapid prototyping approach for these phases: build minimal implementation, test against live Claude.ai, iterate based on findings. Don't spend excessive time planning auth flow before validating actual token extraction mechanism works.

## Sources

### Primary (Training Data)
- **Electron framework patterns** (HIGH confidence) — System tray API usage, main/renderer process separation, IPC communication, lifecycle management
- **Playwright documentation** (HIGH confidence) — Persistent browser contexts, cookie extraction, authentication automation superiority over Puppeteer
- **Windows desktop development conventions** (HIGH confidence) — Tray icon lifecycle, DPI handling, notification area behavior, startup integration

### Secondary (Domain Patterns)
- **System tray monitoring tools** (MEDIUM confidence) — Table stakes features, interaction patterns, performance expectations based on training data about resource monitors and quota trackers
- **Web scraping authentication challenges** (MEDIUM confidence) — Session expiration detection, token extraction strategies, rate limiting prevention based on general web scraping knowledge
- **React + Electron integration** (MEDIUM confidence) — UI framework patterns, state management approaches, component architecture for desktop apps

### Tertiary (Requires Validation)
- **Claude.ai specific behavior** (LOW confidence) — Authentication mechanism, API endpoints, rate limits, session duration are UNKNOWN. All assumptions need validation during implementation.
- **2026 ecosystem state** (LOW confidence) — WebSearch unavailable; library versions and best practices based on 2024-2025 training data may have changed. Verify current documentation before implementation.

### Recommended Verification Sources
- Electron official docs: https://www.electronjs.org/docs/latest/
- Playwright official docs: https://playwright.dev/
- electron-vite template: https://github.com/electron-vite/electron-vite-react
- Claude.ai network traffic (DevTools): Inspect actual authentication flow and usage data endpoints during Phase 2-3

---
*Research completed: 2026-01-27*
*Ready for roadmap: yes*
