# Phase 3: Data Fetching + Display - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fetch usage data from Claude.ai and display it visually in the tray popup. Show three limits (session, weekly all-models, weekly Sonnet) with progress bars, percentages, and reset times. Tray icon color reflects the most-limiting constraint. Manual refresh available. Background polling is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Progress bar styling
- Smooth filled bar (continuous, not segmented)
- Percentage displayed to the right of the bar
- Gradual gradient color transition: green→yellow→red as usage increases
- Show percentage only (not absolute values) in main display

### Information hierarchy
- Most-limiting metric emphasized both ways: positioned first AND visually highlighted
- Standard density: bar + percentage + limit name + reset time per row
- Hover tooltip for additional details (absolute values like "45/100")
- No click-to-expand needed

### Reset countdown display
- Both formats available: absolute time primary, relative duration on hover
- Show "Resets at 3:00 PM" by default, hover reveals "2h 15m remaining"
- Static display (no live tick-down while popup open) — refresh button updates
- No special treatment for imminent resets

### Claude's Discretion
- Exact label text for the three limit types (short vs descriptive based on layout)
- Tooltip styling and positioning
- Gradient color breakpoints (exact thresholds for color shifts)
- Stale data handling (network failure UX, last-updated indicator)

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

*Phase: 03-data-fetching-display*
*Context gathered: 2026-01-28*
