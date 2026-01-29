import { net, session } from 'electron'
import type { UsageData, UsageLimit } from './types'

/**
 * Fetches usage data from Claude.ai API using authenticated session cookies.
 *
 * API Endpoint Discovery:
 * The Claude.ai usage API endpoint is not publicly documented. This implementation
 * uses the endpoint discovered by inspecting network requests at claude.ai/settings/usage.
 *
 * Current endpoint: https://api.claude.ai/api/organizations/{org_id}/usage
 * Alternative endpoint (if above fails): https://claude.ai/api/usage
 *
 * The API returns usage data for:
 * - Session limit (per-session message count)
 * - Weekly all models (combined weekly usage across all models)
 * - Weekly Sonnet (weekly usage for Claude 3.5 Sonnet specifically)
 *
 * @returns Promise<UsageData> - Usage data with all three limit types
 * @throws Error if not authenticated (401), network error, or invalid response
 */
export async function fetchUsageData(): Promise<UsageData> {
  try {
    // Get the session to access cookies
    const defaultSession = session.defaultSession

    // Fetch organization ID from cookies or storage
    // For now, we'll attempt to fetch from a common endpoint that doesn't require org_id
    // If this fails, we may need to extract org_id from auth cookies or a separate API call
    const usageUrl = 'https://claude.ai/api/usage'

    console.log('[Usage API] Fetching usage data from:', usageUrl)

    // Fetch usage data with session cookies
    const response = await net.fetch(usageUrl, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      session: defaultSession
    })

    console.log('[Usage API] Response status:', response.status)

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new Error('Not authenticated. Please log in to Claude.ai.')
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Usage API] Error response:', errorText)
      throw new Error(`Failed to fetch usage data: ${response.status} ${response.statusText}`)
    }

    // Parse JSON response
    const rawData = await response.json()
    console.log('[Usage API] Raw response:', JSON.stringify(rawData, null, 2))

    // Transform API response to UsageData structure
    // Note: The actual API response structure may differ from this assumption
    // This will need to be adjusted based on the real API response
    const usageData = transformUsageResponse(rawData)

    console.log('[Usage API] Transformed usage data:', usageData)

    return usageData
  } catch (error) {
    console.error('[Usage API] Error fetching usage data:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error fetching usage data')
  }
}

/**
 * Transforms the raw Claude.ai API response into our UsageData structure.
 * This function will need to be adjusted based on the actual API response format.
 */
function transformUsageResponse(rawData: any): UsageData {
  // Calculate percentage helper
  const calcPercentage = (current: number, total: number): number => {
    if (total === 0) return 0
    return Math.min(100, Math.round((current / total) * 100))
  }

  // Helper to create UsageLimit from raw data
  const createLimit = (
    current: number,
    total: number,
    resetAt: string
  ): UsageLimit => ({
    current,
    total,
    percentage: calcPercentage(current, total),
    resetAt
  })

  // Try to extract data from common API response patterns
  // Pattern 1: Direct limit objects
  if (rawData.sessionLimit && rawData.weeklyAllModels && rawData.weeklySonnet) {
    return {
      sessionLimit: createLimit(
        rawData.sessionLimit.current,
        rawData.sessionLimit.total,
        rawData.sessionLimit.resetAt
      ),
      weeklyAllModels: createLimit(
        rawData.weeklyAllModels.current,
        rawData.weeklyAllModels.total,
        rawData.weeklyAllModels.resetAt
      ),
      weeklySonnet: createLimit(
        rawData.weeklySonnet.current,
        rawData.weeklySonnet.total,
        rawData.weeklySonnet.resetAt
      ),
      fetchedAt: new Date().toISOString()
    }
  }

  // Pattern 2: Nested under 'usage' or 'data' key
  const data = rawData.usage || rawData.data || rawData
  if (data.sessionLimit || data.session) {
    const session = data.sessionLimit || data.session
    const weeklyAll = data.weeklyAllModels || data.weekly_all || data.weekly
    const weeklySonnet = data.weeklySonnet || data.weekly_sonnet

    return {
      sessionLimit: createLimit(
        session.current || session.used || 0,
        session.total || session.limit || 0,
        session.resetAt || session.reset_at || new Date().toISOString()
      ),
      weeklyAllModels: createLimit(
        weeklyAll?.current || weeklyAll?.used || 0,
        weeklyAll?.total || weeklyAll?.limit || 0,
        weeklyAll?.resetAt || weeklyAll?.reset_at || new Date().toISOString()
      ),
      weeklySonnet: createLimit(
        weeklySonnet?.current || weeklySonnet?.used || 0,
        weeklySonnet?.total || weeklySonnet?.limit || 0,
        weeklySonnet?.resetAt || weeklySonnet?.reset_at || new Date().toISOString()
      ),
      fetchedAt: new Date().toISOString()
    }
  }

  // If we can't parse the response, throw an error with the raw data for debugging
  throw new Error(
    `Unable to parse usage data from API response. Raw data: ${JSON.stringify(rawData)}`
  )
}
