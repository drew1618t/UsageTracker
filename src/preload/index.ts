import { contextBridge, ipcRenderer } from 'electron'

// Auth state interface
export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
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
  }
})
