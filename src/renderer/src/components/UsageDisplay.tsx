import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ProgressBar } from './ProgressBar'
import './UsageDisplay.css'

// Types matching the API types
interface UsageLimit {
  current: number
  total: number
  percentage: number
  resetAt: string  // ISO timestamp
}

interface UsageData {
  sessionLimit: UsageLimit
  weeklyAllModels: UsageLimit
  weeklySonnet: UsageLimit
  fetchedAt: string
}

interface UsageDisplayProps {
  data: UsageData | null
  lastUpdated: Date | null
  error: string | null
  isLoading: boolean
  onRefresh: () => void
}

// Human-readable labels for each limit type
const LIMIT_LABELS: Record<string, string> = {
  sessionLimit: 'Session Limit',
  weeklyAllModels: 'Weekly (All Models)',
  weeklySonnet: 'Weekly (Sonnet)'
}

/**
 * Selects the primary limit to display, defaulting to session but switching to weekly
 * when weekly is >90% AND more limiting in session-equivalent units.
 * (Renderer-side copy of displayLogic.selectPrimaryLimit)
 */
function selectPrimaryLimit(
  sessionLimit: UsageLimit,
  weeklyLimit: UsageLimit
): { limit: UsageLimit; type: 'session' | 'weekly' } {
  // Default to session
  if (weeklyLimit.percentage <= 90) {
    return { limit: sessionLimit, type: 'session' }
  }

  // Weekly is >90%, check if it's more limiting in final 10%
  // Validate totals to avoid division by zero
  if (weeklyLimit.total <= 0 || sessionLimit.total <= 0) {
    return { limit: sessionLimit, type: 'session' }
  }

  const weeklyRemaining = weeklyLimit.total - weeklyLimit.current
  const sessionRemaining = sessionLimit.total - sessionLimit.current

  // Convert weekly remaining to session-equivalent units
  // Formula: weekly remaining sessions = weekly remaining / (weekly total / 10 sessions)
  const weeklyRemainingInSessions = weeklyRemaining / (weeklyLimit.total / 10)

  if (weeklyRemainingInSessions < sessionRemaining) {
    return { limit: weeklyLimit, type: 'weekly' }
  }

  return { limit: sessionLimit, type: 'session' }
}

export function UsageDisplay({
  data,
  lastUpdated,
  error,
  isLoading,
  onRefresh
}: UsageDisplayProps) {
  // Loading state
  if (isLoading && !data) {
    return (
      <div className="usage-display">
        <div className="loading-state">Loading usage data...</div>
      </div>
    )
  }

  // No data state
  if (!data) {
    return (
      <div className="usage-display">
        <div className="no-data-state">
          <p>No usage data available.</p>
          <button className="refresh-button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load Usage Data'}
          </button>
        </div>
      </div>
    )
  }

  // Determine which limit is primary (session-first with smart weekly override)
  const { type: primaryType } = selectPrimaryLimit(
    data.sessionLimit,
    data.weeklyAllModels
  )

  // Determine which key should be marked as limiting
  const limitingKey = primaryType === 'session' ? 'sessionLimit' : 'weeklyAllModels'

  // Fixed order: Session first, then Weekly (All Models), then Weekly (Sonnet)
  const limits = [
    { key: 'sessionLimit', ...data.sessionLimit },
    { key: 'weeklyAllModels', ...data.weeklyAllModels },
    { key: 'weeklySonnet', ...data.weeklySonnet }
  ]

  return (
    <div className="usage-display">
      {/* Error indicator (shows stale data warning) */}
      {error && (
        <div className="stale-indicator">
          Could not refresh. {lastUpdated && (
            <span>Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
          )}
        </div>
      )}

      {/* Progress bars for each limit */}
      <div className="usage-limits">
        {limits.map((limit) => (
          <ProgressBar
            key={limit.key}
            label={LIMIT_LABELS[limit.key]}
            percentage={limit.percentage}
            current={limit.current}
            total={limit.total}
            resetAt={new Date(limit.resetAt)}
            isLimiting={limit.key === limitingKey}
          />
        ))}
      </div>

      {/* Refresh button */}
      <div className="usage-footer">
        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
