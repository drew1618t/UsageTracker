import { net, session } from 'electron'
import { selectPrimaryClaudeLimit } from '../utils/displayLogic'
import type { ProviderUsageData, ProviderLimit } from './types'

/**
 * Make an authenticated request using net.request (better cookie handling)
 */
function makeAuthenticatedRequest(
  url: string,
  ses: Electron.Session
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: 'GET',
      session: ses,
      useSessionCookies: true
    })

    request.setHeader('Accept', 'application/json')
    request.setHeader(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    )

    let responseData = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })

      response.on('end', () => {
        try {
          const data = JSON.parse(responseData)
          resolve({ status: response.statusCode, data })
        } catch {
          resolve({ status: response.statusCode, data: responseData })
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}

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
export async function fetchClaudeUsageData(): Promise<ProviderUsageData> {
  try {
    // Use the same session partition as auth module
    const ses = session.fromPartition('persist:main')

    // Get organization ID from cookies
    const orgId = await getOrganizationId(ses)
    if (!orgId) {
      throw new Error('Could not find organization ID. Please log in to Claude.ai.')
    }

    const usageUrl = `https://claude.ai/api/organizations/${orgId}/usage`
    console.log('[Usage API] Fetching usage data from:', usageUrl)

    // Fetch usage data with session cookies using net.request
    const { status, data: rawData } = await makeAuthenticatedRequest(usageUrl, ses)

    console.log('[Usage API] Response status:', status)

    // Handle authentication errors
    if (status === 401 || status === 403) {
      console.error('[Usage API] Auth error response:', rawData)
      throw new Error('Not authenticated. Please log in to Claude.ai.')
    }

    // Handle other HTTP errors
    if (status < 200 || status >= 300) {
      console.error('[Usage API] Error response:', rawData)
      throw new Error(`Failed to fetch usage data: ${status}`)
    }

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

    // Debug: log all cookie names
    console.log(
      '[Usage API] Available cookies:',
      cookies.map((c) => c.name)
    )

    // Look for lastActiveOrg cookie
    const orgCookie = cookies.find((c) => c.name === 'lastActiveOrg')
    if (orgCookie?.value) {
      console.log('[Usage API] Found org ID from lastActiveOrg cookie:', orgCookie.value)
      return orgCookie.value
    }

    // Fallback: try to get from organizations endpoint
    console.log('[Usage API] lastActiveOrg cookie not found, trying /api/organizations')
    const response = await net.fetch('https://claude.ai/api/organizations', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      session: ses
    })

    console.log('[Usage API] /api/organizations status:', response.status)

    if (response.ok) {
      const orgs = await response.json()
      console.log('[Usage API] /api/organizations response:', JSON.stringify(orgs, null, 2))

      // Return first org's UUID if available
      if (Array.isArray(orgs) && orgs.length > 0 && orgs[0].uuid) {
        console.log('[Usage API] Found org ID from /api/organizations:', orgs[0].uuid)
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
function transformUsageResponse(rawData: any): ProviderUsageData {
  // Helper to create UsageLimit from API data
  // Note: API provides utilization as percentage (0-100), not current/total
  const createLimit = (
    key: string,
    label: string,
    data: { utilization: number; resets_at: string } | null
  ): ProviderLimit => {
    if (!data) {
      return {
        key,
        label,
        current: 0,
        total: 100,
        percentage: 0,
        resetAt: new Date().toISOString()
      }
    }

    // API gives utilization as percentage directly
    const percentage = Math.round(data.utilization)

    return {
      key,
      label,
      current: percentage,
      total: 100,
      percentage,
      resetAt: data.resets_at
    }
  }

  const sessionLimit = createLimit('sessionLimit', 'Session Limit', rawData.five_hour)
  const weeklyAllModels = createLimit(
    'weeklyAllModels',
    'Weekly (All Models)',
    rawData.seven_day
  )
  const weeklySonnet = createLimit(
    'weeklySonnet',
    'Weekly (Sonnet)',
    rawData.seven_day_sonnet
  )
  const limits = [sessionLimit, weeklyAllModels, weeklySonnet]
  const primaryLimitKey = selectPrimaryClaudeLimit(limits)?.key ?? null

  return {
    providerId: 'claude',
    providerLabel: 'Claude',
    fetchedAt: new Date().toISOString(),
    limits,
    primaryLimitKey,
    source: 'remote'
  }
}
