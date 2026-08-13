export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

export interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
  acknowledgedLimits?: Record<string, string>
}

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

export interface ElectronAPI {
  getVersion: () => Promise<string>
  refreshData: () => Promise<void>
  onTrayAction: (callback: (action: string) => void) => void
  removeAllListeners: (channel: string) => void
  // Auth methods
  getAuthState: () => Promise<AuthState>
  login: () => Promise<void>
  logout: () => Promise<void>
  onAuthStateChanged: (callback: (state: AuthState) => void) => () => void
  // Usage data methods
  getUsageData: () => Promise<UsageDashboardState>
  refreshUsageData: () => Promise<UsageDashboardState>
  acknowledgeUsageLimit: (
    providerId: ProviderId,
    limitKey: string,
    resetAt: string
  ) => Promise<UsageDashboardState>
  onUsageDataChanged: (callback: (data: UsageDashboardState) => void) => () => void
  // Settings methods
  getSettings: () => Promise<SettingsSchema>
  setPollingInterval: (minutes: number) => Promise<void>
  setAutoStart: (enabled: boolean) => Promise<void>
  onSettingsChanged: (callback: (settings: SettingsSchema) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
