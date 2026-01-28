import { contextBridge, ipcRenderer } from 'electron'

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
  }
})
