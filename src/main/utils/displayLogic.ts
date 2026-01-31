import { UsageLimit } from '../api/types'

/**
 * Selects the primary limit to display, defaulting to session but switching to weekly
 * when weekly is >90% AND more limiting in session-equivalent units.
 *
 * @param sessionLimit - Current session usage limit
 * @param weeklyLimit - Current weekly usage limit
 * @returns Object with the selected limit and its type
 */
export function selectPrimaryLimit(
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

/**
 * Determines tray icon color based on the most limiting threshold across all limits.
 * Evaluates session, weekly all-models, and weekly Sonnet independently.
 *
 * @param sessionLimit - Current session usage limit
 * @param weeklyAllModels - Current weekly all-models usage limit
 * @param weeklySonnet - Current weekly Sonnet usage limit
 * @returns Color code for tray icon
 */
export function determineTrayIconColor(
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
