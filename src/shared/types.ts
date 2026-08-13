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

/**
 * Extra-usage credits, billed in money rather than a rolling percentage window.
 * The usage API reports no reset timestamp for these, so none is tracked.
 */
export interface ProviderCredits {
  usedMinor: number
  limitMinor: number
  currency: string
  decimalPlaces: number
  percentage: number
  isEnabled: boolean
  disabledReason?: string
}

export interface ProviderUsageData {
  providerId: ProviderId
  providerLabel: string
  fetchedAt: string
  limits: ProviderLimit[]
  primaryLimitKey: string | null
  source: 'remote' | 'local'
  // Kept out of `limits` so a maxed-out credit balance never drives tray colour
  credits?: ProviderCredits | null
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
