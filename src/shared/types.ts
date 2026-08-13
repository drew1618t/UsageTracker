// Shared types used by the main process, preload bridge, and renderer.
// This is the single source of truth - do not redefine these shapes elsewhere.

export type ProviderId = 'claude' | 'codex'

export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

export interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
  acknowledgedLimits?: Record<string, string>
}

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
