import { contextBridge, ipcRenderer } from 'electron'

// Auth state interface
export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

// Settings interface
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

// Expose secure IPC bridge to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getVersion: (): Promise<string> => {
    return ipcRenderer.invoke('app:get-version')
  },

  // Refresh usage data
  refreshData: (): Promise<void> => {
    return ipcRenderer.invoke('app:refresh-data')
  },

  // Listen for tray actions
  onTrayAction: (callback: (action: string) => void): void => {
    ipcRenderer.on('tray:action', (_event, action) => {
      callback(action)
    })
  },

  // Remove all listeners for a channel
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel)
  },

  // Auth methods
  getAuthState: (): Promise<AuthState> => {
    return ipcRenderer.invoke('auth:get-state')
  },

  login: (): Promise<void> => {
    return ipcRenderer.invoke('auth:login')
  },

  logout: (): Promise<void> => {
    return ipcRenderer.invoke('auth:logout')
  },

  onAuthStateChanged: (callback: (state: AuthState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: AuthState) => {
      callback(state)
    }
    ipcRenderer.on('auth-state-changed', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('auth-state-changed', listener)
    }
  },

  // Usage data methods
  getUsageData: (): Promise<UsageDashboardState> => {
    return ipcRenderer.invoke('usage:get-all')
  },

  refreshUsageData: (): Promise<UsageDashboardState> => {
    return ipcRenderer.invoke('usage:refresh-all')
  },

  acknowledgeUsageLimit: (
    providerId: ProviderId,
    limitKey: string,
    resetAt: string
  ): Promise<UsageDashboardState> => {
    return ipcRenderer.invoke('usage:acknowledge-limit', providerId, limitKey, resetAt)
  },

  onUsageDataChanged: (callback: (data: UsageDashboardState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: UsageDashboardState) => {
      callback(data)
    }
    ipcRenderer.on('usage-data-changed', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('usage-data-changed', listener)
    }
  },

  // Settings methods
  getSettings: (): Promise<SettingsSchema> => {
    return ipcRenderer.invoke('settings:get')
  },

  setPollingInterval: (minutes: number): Promise<void> => {
    return ipcRenderer.invoke('settings:set-polling-interval', minutes)
  },

  setAutoStart: (enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke('settings:set-auto-start', enabled)
  },

  onSettingsChanged: (callback: (settings: SettingsSchema) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: SettingsSchema) => {
      callback(settings)
    }
    ipcRenderer.on('settings-changed', listener)
    return () => ipcRenderer.removeListener('settings-changed', listener)
  }
})
