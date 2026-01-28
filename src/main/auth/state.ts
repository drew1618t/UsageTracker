import { BrowserWindow } from 'electron'

export interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

let authState: AuthState = {
  isAuthenticated: false,
  userIdentifier: null
}

/**
 * Get current authentication state
 */
export function getAuthState(): AuthState {
  return { ...authState }
}

/**
 * Update authentication state
 * Notifies all renderer windows and updates tray icon
 * Note: Tray updates are handled by tray.ts importing and calling this
 */
export function setAuthState(state: AuthState): void {
  authState = { ...state }

  // Notify all renderer windows
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    win.webContents.send('auth-state-changed', authState)
  })
}
