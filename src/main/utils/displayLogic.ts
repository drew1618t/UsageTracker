import { ProviderLimit, ProviderUsageData } from '../../shared/types'

/**
 * Selects the primary limit to display, defaulting to session but switching to weekly
 * when weekly is >90% AND more limiting in session-equivalent units.
 *
 * @param sessionLimit - Current session usage limit
 * @param weeklyLimit - Current weekly usage limit
 * @returns Object with the selected limit and its type
 */
export function selectPrimaryLimit(
  sessionLimit: ProviderLimit,
  weeklyLimit: ProviderLimit
): { limit: ProviderLimit; type: 'session' | 'weekly' } {
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
 * Determines tray icon color from the highest unacknowledged limit across
 * all providers. Green under 70%, yellow 70-89%, red at 90%+.
 */
export function determineTrayIconColor(
  ...limits: ProviderLimit[]
): 'green' | 'yellow' | 'red' {
  const activeLimits = limits.filter((limit) => !limit.isAcknowledged)
  if (activeLimits.length === 0) {
    return 'green'
  }

  const maxPercentage = Math.max(...activeLimits.map((limit) => limit.percentage))

  if (maxPercentage >= 90) return 'red'
  if (maxPercentage >= 70) return 'yellow'
  return 'green'
}

export function selectPrimaryClaudeLimit(limits: ProviderLimit[]): ProviderLimit | null {
  const sessionLimit = limits.find((limit) => limit.key === 'sessionLimit')
  const weeklyAllModels = limits.find((limit) => limit.key === 'weeklyAllModels')

  if (!sessionLimit) {
    return weeklyAllModels ?? limits[0] ?? null
  }

  if (!weeklyAllModels) {
    return sessionLimit
  }

  return selectPrimaryLimit(sessionLimit, weeklyAllModels).limit
}

export function selectHighestUsageLimit(
  providers: ProviderUsageData[]
): { provider: ProviderUsageData; limit: ProviderLimit } | null {
  const providerLimits = providers
    .flatMap((provider) =>
      provider.limits
        .filter((limit) => !limit.isAcknowledged)
        .map((limit) => ({ provider, limit }))
    )
    .sort((a, b) => b.limit.percentage - a.limit.percentage)

  return providerLimits[0] ?? null
}
