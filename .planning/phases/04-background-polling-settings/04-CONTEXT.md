# Phase 4: Background Polling + Settings - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatic background fetching of usage data with user configuration. Users can adjust polling interval and enable/disable start-with-Windows behavior. The app keeps data fresh without manual refresh.

</domain>

<decisions>
## Implementation Decisions

### Settings UI
- Settings location: Claude's discretion (inline in popup or separate modal — whatever fits the existing UI best)
- Controls: Polling interval slider + Start with Windows toggle (minimal, essential settings only)
- Polling interval control: Slider with labels showing values like 1m, 5m, 15m, 30m with current value displayed
- Changes apply immediately — no save button needed (auto-save pattern)

### Claude's Discretion
- Whether settings appear inline or as modal window
- Exact slider implementation and visual design
- Where settings button/link appears in the UI
- Polling feedback indicators (if any)
- Error handling UX for network failures
- Default polling interval value
- Exponential backoff parameters

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-background-polling-settings*
*Context gathered: 2026-01-29*
