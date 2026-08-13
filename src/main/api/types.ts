export type ProviderId = 'claude' | 'codex'

export interface ProviderLimit {
  key: string
  label: string
  current: number
  total: number
  percentage: number
  resetAt: string
  isAcknowledged?: boolean
}

export interface ProviderUsageData {
  providerId: ProviderId
  providerLabel: string
  fetchedAt: string
  limits: ProviderLimit[]
  primaryLimitKey: string | null
  source: 'remote' | 'local'
  metadata?: {
    planType?: string
    totalTokens?: number
    lastTokens?: number
  }
}

export interface ProviderUsageState {
  data: ProviderUsageData | null
  lastUpdated: string | null
  error: string | null
  isLoading: boolean
  statusLabel: string
}

export interface UsageDashboardState {
  providers: Record<ProviderId, ProviderUsageState>
}
