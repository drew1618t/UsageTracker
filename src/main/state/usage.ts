import { BrowserWindow } from 'electron'
import { fetchCodexUsageData } from '../api/codex'
import { fetchClaudeUsageData } from '../api/usage'
import type {
  ProviderId,
  ProviderLimit,
  ProviderUsageData,
  ProviderUsageState,
  UsageDashboardState
} from '../../shared/types'
import { selectPrimaryClaudeLimit } from '../utils/displayLogic'
import { acknowledgeLimitUntilReset, isLimitAcknowledged } from './settings'

const DEFAULT_PROVIDER_STATE: ProviderUsageState = {
  data: null,
  lastUpdated: null,
  error: null,
  isLoading: false,
  statusLabel: 'No usage data.'
}

let state: UsageDashboardState = {
  providers: {
    claude: { ...DEFAULT_PROVIDER_STATE, statusLabel: 'Claude not logged in.' },
    codex: { ...DEFAULT_PROVIDER_STATE, statusLabel: 'No recent Codex usage found.' }
  }
}

export function getUsageDashboardData(): UsageDashboardState {
  return {
    providers: {
      claude: cloneProviderState(state.providers.claude),
      codex: cloneProviderState(state.providers.codex)
    }
  }
}

export async function refreshUsageData(): Promise<UsageDashboardState> {
  state.providers.claude.isLoading = true
  state.providers.codex.isLoading = true

  await Promise.allSettled([refreshClaudeUsage(), refreshCodexUsage()])

  notifyUsageDataChanged(getUsageDashboardData())

  const { updateTrayForUsage } = await import('../tray')
  updateTrayForUsage(getUsageDashboardData())

  return getUsageDashboardData()
}

export async function acknowledgeUsageLimit(
  providerId: ProviderId,
  limitKey: string,
  resetAt: string
): Promise<UsageDashboardState> {
  acknowledgeLimitUntilReset(providerId, limitKey, resetAt)

  const providerData = state.providers[providerId].data
  if (providerData) {
    updateProviderState(providerId, {
      data: applyAcknowledgements(providerData)
    })
  }

  notifyUsageDataChanged(getUsageDashboardData())

  const { updateTrayForUsage } = await import('../tray')
  updateTrayForUsage(getUsageDashboardData())

  return getUsageDashboardData()
}

async function refreshClaudeUsage(): Promise<void> {
  try {
    const data = applyAcknowledgements(await fetchClaudeUsageData())
    updateProviderState('claude', {
      data,
      lastUpdated: new Date().toISOString(),
      error: null,
      statusLabel: 'Connected to Claude.ai.'
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    updateProviderState('claude', {
      error: errorMsg,
      statusLabel: errorMsg.includes('Not authenticated')
        ? 'Claude not logged in.'
        : 'Using last known Claude data.'
    })
  } finally {
    state.providers.claude.isLoading = false
  }
}

async function refreshCodexUsage(): Promise<void> {
  try {
    const result = await fetchCodexUsageData()
    const data = result.data ? applyAcknowledgements(result.data) : null
    updateProviderState('codex', {
      data,
      lastUpdated: data?.fetchedAt ?? new Date().toISOString(),
      error: result.isStale ? 'Codex data is stale.' : null,
      statusLabel: result.statusLabel
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    updateProviderState('codex', {
      error: errorMsg,
      statusLabel: 'Could not read Codex local usage data.'
    })
  } finally {
    state.providers.codex.isLoading = false
  }
}

function updateProviderState(
  providerId: ProviderId,
  updates: Partial<Omit<ProviderUsageState, 'isLoading'>> & {
    data?: ProviderUsageData | null
  }
): void {
  state.providers[providerId] = {
    ...state.providers[providerId],
    ...updates
  }
}

function applyAcknowledgements(data: ProviderUsageData): ProviderUsageData {
  const limits = data.limits.map((limit) => ({
    ...limit,
    isAcknowledged: isLimitAcknowledged(data.providerId, limit.key, limit.resetAt)
  }))

  return {
    ...data,
    limits,
    primaryLimitKey: selectPrimaryLimitKey(data.providerId, limits)
  }
}

function selectPrimaryLimitKey(
  providerId: ProviderId,
  limits: ProviderLimit[]
): string | null {
  const activeLimits = limits.filter((limit) => !limit.isAcknowledged)
  if (activeLimits.length === 0) {
    return null
  }

  if (providerId === 'claude') {
    return selectPrimaryClaudeLimit(activeLimits)?.key ?? null
  }

  return activeLimits.sort((a, b) => b.percentage - a.percentage)[0]?.key ?? null
}

function cloneProviderState(providerState: ProviderUsageState): ProviderUsageState {
  return {
    ...providerState,
    data: providerState.data
      ? {
          ...providerState.data,
          limits: providerState.data.limits.map((limit) => ({ ...limit }))
        }
      : null
  }
}

function notifyUsageDataChanged(data: UsageDashboardState): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('usage-data-changed', data)
  })
}
