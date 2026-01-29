import { net, session } from 'electron'
import type { UsageData, UsageLimit } from './types'

/**
 * Fetches usage data from Claude.ai API using authenticated session cookies.
 *
 * API Endpoint: https://claude.ai/api/organizations/{org_id}/usage
 * Discovered by inspecting network requests at claude.ai/settings/usage.
 *
 * The API returns usage data for:
 * - five_hour: Session limit (5-hour rolling window)
 * - seven_day: Weekly all models (7-day usage across all models)
 * - seven_day_sonnet: Weekly Sonnet-specific usage
 *
 * Response format:
 * {
 *   "five_hour": { "utilization": 29.0, "resets_at": "2026-01-29T15:59:59.532208+00:00" },
 *   "seven_day": { "utilization": 79.0, "resets_at": "..." },
 *   "seven_day_sonnet": { "utilization": 41.0, "resets_at": "..." } | null
 * }
 *
 * @returns Promise<UsageData> - Usage data with all three limit types
 * @throws Error if not authenticated (401), network error, or invalid response
 */
export async function fetchUsageData(): Promise<UsageData> {
  try {
    const defaultSession = session.defaultSession

    // Get organization ID from cookies
    const orgId = await getOrganizationId(defaultSession)
    if (!orgId) {
      throw new Error('Could not find organization ID. Please log in to Claude.ai.')
    }

    const usageUrl = `https://claude.ai/api/organizations/${orgId}/usage`
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
      throw new Error(`Failed to fetch usage data: ${response.status}`)
    }

    // Parse JSON response
    const rawData = await response.json()
    console.log('[Usage API] Raw response:', JSON.stringify(rawData, null, 2))

    // Transform API response to UsageData structure
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
 * Gets the organization ID from cookies.
 * Claude.ai stores the last active org in 'lastActiveOrg' cookie.
 */
async function getOrganizationId(ses: Electron.Session): Promise<string | null> {
  try {
    // Try lastActiveOrg cookie first
    const cookies = await ses.cookies.get({ url: 'https://claude.ai' })

    // Look for lastActiveOrg cookie
    const orgCookie = cookies.find((c) => c.name === 'lastActiveOrg')
    if (orgCookie?.value) {
      console.log('[Usage API] Found org ID from lastActiveOrg cookie')
      return orgCookie.value
    }

    // Fallback: try to get from organizations endpoint
    console.log('[Usage API] lastActiveOrg cookie not found, trying /api/organizations')
    const response = await net.fetch('https://claude.ai/api/organizations', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      session: ses
    })

    if (response.ok) {
      const orgs = await response.json()
      // Return first org's UUID if available
      if (Array.isArray(orgs) && orgs.length > 0 && orgs[0].uuid) {
        console.log('[Usage API] Found org ID from /api/organizations')
        return orgs[0].uuid
      }
    }

    return null
  } catch (error) {
    console.error('[Usage API] Error getting organization ID:', error)
    return null
  }
}

/**
 * Transforms the Claude.ai API response into our UsageData structure.
 *
 * API response format:
 * {
 *   "five_hour": { "utilization": 29.0, "resets_at": "ISO-timestamp" },
 *   "seven_day": { "utilization": 79.0, "resets_at": "ISO-timestamp" },
 *   "seven_day_sonnet": { "utilization": 41.0, "resets_at": "ISO-timestamp" } | null
 * }
 */
function transformUsageResponse(rawData: any): UsageData {
  // Helper to create UsageLimit from API data
  // Note: API provides utilization as percentage (0-100), not current/total
  const createLimit = (
    data: { utilization: number; resets_at: string } | null
  ): UsageLimit => {
    if (!data) {
      // Return zero limit if not available
      return {
        current: 0,
        total: 100,
        percentage: 0,
        resetAt: new Date().toISOString()
      }
    }

    // API gives utilization as percentage directly
    const percentage = Math.round(data.utilization)

    return {
      // Estimate current/total from percentage (API doesn't provide absolute values)
      current: percentage,
      total: 100,
      percentage,
      resetAt: data.resets_at
    }
  }

  // Map API fields to our structure
  return {
    sessionLimit: createLimit(rawData.five_hour),
    weeklyAllModels: createLimit(rawData.seven_day),
    weeklySonnet: createLimit(rawData.seven_day_sonnet),
    fetchedAt: new Date().toISOString()
  }
}
