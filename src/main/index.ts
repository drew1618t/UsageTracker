import { app, BrowserWindow, ipcMain } from 'electron'
import { createTray, tray } from './tray'
import { getPopupWindow, togglePopupWindow } from './window'
import {
  initSession,
  checkAuthState,
  openLoginPage,
  logout,
  setAuthState,
  getAuthState,
  persistSessionCookies
} from './auth'
import { getUsageData, refreshUsageData } from './state/usage'
import { initSettings } from './state/settings'
import { startPolling, stopPolling } from './state/polling'

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this instance
  app.quit()
} else {
  // This is the first/primary instance

  // Handle second instance attempts
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Focus existing popup window or toggle it open
    const popup = getPopupWindow()
    if (popup) {
      if (popup.isMinimized()) popup.restore()
      popup.show()
      popup.focus()
    } else if (tray) {
      togglePopupWindow(tray.getBounds())
    }
  })

  // Prevent app from quitting when all windows are closed
  // This keeps the tray icon alive
  app.on('window-all-closed', (e) => {
    e.preventDefault()
  })

  // Prevent app from quitting on macOS
  app.on('activate', () => {
    if (tray) {
      togglePopupWindow(tray.getBounds())
    }
  })

  // Initialize app when ready
  app.whenReady().then(async () => {
    // Initialize settings
    initSettings()

    // Initialize auth session with callback for when auth cookies are detected
    initSession(async () => {
      console.log('Auth cookies detected')
      await persistSessionCookies()
      const authStateResult = await checkAuthState()
      setAuthState({
        isAuthenticated: authStateResult.isAuthenticated,
        userIdentifier: authStateResult.userEmail || null
      })
      // Start polling when auth cookies detected
      startPolling()
    })

    // Register IPC handlers
    ipcMain.handle('app:get-version', () => app.getVersion())
    ipcMain.handle('app:refresh-data', async () => {
      // Placeholder for future implementation
      return null
    })

    // Register auth IPC handlers
    ipcMain.handle('auth:get-state', () => getAuthState())
    ipcMain.handle('auth:login', async () => {
      await openLoginPage()
    })
    ipcMain.handle('auth:logout', async () => {
      stopPolling()
      await logout()
      setAuthState({ isAuthenticated: false, userIdentifier: null })
    })

    // Register usage IPC handlers
    ipcMain.handle('usage:get', () => getUsageData())
    ipcMain.handle('usage:refresh', async () => {
      await refreshUsageData()
      return getUsageData()
    })

    // Create system tray
    createTray()
    console.log('Tray created successfully')

    // Check initial auth state
    const authStateResult = await checkAuthState()
    setAuthState({
      isAuthenticated: authStateResult.isAuthenticated,
      userIdentifier: authStateResult.userEmail || null
    })
    console.log('Initial auth state:', authStateResult)

    // Start polling if already authenticated
    if (authStateResult.isAuthenticated) {
      startPolling()
    }
  })

  // Clean up before quit
  app.on('before-quit', () => {
    stopPolling()
    console.log('App quitting...')
  })
}
