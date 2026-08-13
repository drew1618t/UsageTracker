// Type declaration for the IPC bridge exposed on window.electronAPI.
// Shapes live in src/shared/types.ts; this file only declares the API surface.
import type {
  AuthState,
  ProviderId,
  SettingsSchema,
  UsageDashboardState
} from '../shared/types'

export interface ElectronAPI {
  getVersion: () => Promise<string>
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
