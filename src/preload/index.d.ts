export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

export interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
}

export interface UsageLimit {
  current: number
  total: number
  percentage: number
  resetAt: string
}

export interface UsageData {
  sessionLimit: UsageLimit
  weeklyAllModels: UsageLimit
  weeklySonnet: UsageLimit
  fetchedAt: string
}

export interface UsageState {
  data: UsageData | null
  lastUpdated: Date | null
  error: string | null
  isLoading: boolean
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
  getUsageData: () => Promise<UsageState>
  refreshUsageData: () => Promise<UsageState>
  onUsageDataChanged: (callback: (data: UsageData) => void) => () => void
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
