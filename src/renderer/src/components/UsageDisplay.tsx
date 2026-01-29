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

  // Sort limits by percentage (most-limiting first)
  const limits = [
    { key: 'sessionLimit', ...data.sessionLimit },
    { key: 'weeklyAllModels', ...data.weeklyAllModels },
    { key: 'weeklySonnet', ...data.weeklySonnet }
  ].sort((a, b) => b.percentage - a.percentage)

  // The first one after sorting is the most limiting
  const mostLimitingKey = limits[0].key

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
            isLimiting={limit.key === mostLimitingKey}
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
