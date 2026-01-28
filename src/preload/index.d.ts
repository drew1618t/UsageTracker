export interface ElectronAPI {
  getVersion: () => Promise<string>
  refreshData: () => Promise<void>
  onTrayAction: (callback: (action: string) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
