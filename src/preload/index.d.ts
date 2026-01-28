export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
