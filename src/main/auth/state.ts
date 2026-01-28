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
 */
export function setAuthState(state: AuthState): void {
  authState = { ...state }

  // Notify all renderer windows
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    win.webContents.send('auth-state-changed', authState)
  })

  // Update tray icon for auth state (dynamic import to avoid circular dependency)
  import('../tray').then(({ updateTrayForAuthState, rebuildContextMenu }) => {
    updateTrayForAuthState(state.isAuthenticated)
    rebuildContextMenu()
  }).catch(err => {
    console.error('Failed to update tray for auth state:', err)
  })
}
