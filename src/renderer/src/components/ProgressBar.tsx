import { format, formatDistanceToNow } from 'date-fns'
import './ProgressBar.css'

interface ProgressBarProps {
  label: string
  percentage: number
  current: number
  total: number
  resetAt: Date
  isLimiting?: boolean  // True for most-limiting constraint
  isAcknowledged?: boolean
  canAcknowledge?: boolean
  onAcknowledge?: () => Promise<void> | void
}

export function ProgressBar({
  label,
  percentage,
  current,
  total,
  resetAt,
  isLimiting = false,
  isAcknowledged = false,
  canAcknowledge = false,
  onAcknowledge
}: ProgressBarProps) {
  // Calculate gradient based on percentage thresholds
  // Green < 70%, Yellow 70-90%, Red >= 90%
  const getGradient = (pct: number): string => {
    if (pct < 70) {
      // All green
      return 'linear-gradient(to right, #22c55e, #22c55e)'
    } else if (pct < 90) {
      // Transition from green to yellow
      const greenEnd = Math.round((70 / pct) * 100)
      return `linear-gradient(to right, #22c55e ${greenEnd}%, #eab308 100%)`
    } else {
      // Full transition: green -> yellow -> red
      const greenEnd = Math.round((70 / pct) * 100)
      const yellowEnd = Math.round((90 / pct) * 100)
      return `linear-gradient(to right, #22c55e ${greenEnd}%, #eab308 ${yellowEnd}%, #ef4444 100%)`
    }
  }

  // Format reset time
  const isWeeklyLimit = label.toLowerCase().includes('weekly')
  const absoluteTime = format(resetAt, isWeeklyLimit ? 'EEE h:mm a' : 'h:mm a')
  const relativeTime = formatDistanceToNow(resetAt, { addSuffix: true })  // "in 2 hours"

  // Tooltip text for absolute values
  const tooltipText = `${current} / ${total}`

  return (
    <div
      className={`progress-bar-container ${isLimiting ? 'limiting' : ''} ${isAcknowledged ? 'acknowledged' : ''}`}
    >
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-percentage">{percentage}%</span>
      </div>

      <div className="progress-track" title={tooltipText}>
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            background: getGradient(percentage)
          }}
        />
      </div>

      <div className="progress-footer">
        <span className="reset-time" title={relativeTime}>
          Resets at {absoluteTime}
        </span>
        {isAcknowledged && <span className="acknowledged-label">Acknowledged</span>}
        {canAcknowledge && onAcknowledge && (
          <button className="acknowledge-button" onClick={() => onAcknowledge()}>
            Ignore until reset
          </button>
        )}
      </div>
    </div>
  )
}
