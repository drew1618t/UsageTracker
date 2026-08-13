import { contextBridge, ipcRenderer } from 'electron'
import type {
  AuthState,
  ProviderId,
  SettingsSchema,
  UsageDashboardState
} from '../shared/types'

// Expose secure IPC bridge to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getVersion: (): Promise<string> => {
    return ipcRenderer.invoke('app:get-version')
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
