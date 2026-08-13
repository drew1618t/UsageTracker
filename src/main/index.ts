import { app, ipcMain } from 'electron'
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
import { acknowledgeUsageLimit, getUsageDashboardData, refreshUsageData } from './state/usage'
import { initSettings, getSettings, setPollingInterval, setAutoStart } from './state/settings'
import { startPolling, stopPolling } from './state/polling'

app.disableHardwareAcceleration()

// Check if launched at startup (hidden mode)
const isHiddenLaunch = process.argv.includes('--hidden')
if (isHiddenLaunch) {
  console.log('[Startup] Launched in hidden mode (auto-start)')
}

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

  // Keep the app (and tray icon) alive when all windows are closed.
  // Not calling app.quit() here is what prevents the default exit.
  app.on('window-all-closed', () => {})

  // Prevent app from quitting on macOS
  app.on('activate', () => {
    if (tray) {
      togglePopupWindow(tray.getBounds())
    }
  })

  // Initialize app when ready
  app.whenReady().then(async () => {
    try {
      // Small delay on auto-start to let Windows fully initialize
      if (isHiddenLaunch) {
        console.log('[Startup] Waiting for Windows APIs...')
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

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
      ipcMain.handle('usage:get-all', () => getUsageDashboardData())
      ipcMain.handle('usage:refresh-all', async () => {
        await refreshUsageData()
        return getUsageDashboardData()
      })
      ipcMain.handle(
        'usage:acknowledge-limit',
        async (_event, providerId: 'claude' | 'codex', limitKey: string, resetAt: string) => {
          return acknowledgeUsageLimit(providerId, limitKey, resetAt)
        }
      )

      // Settings IPC handlers
      ipcMain.handle('settings:get', () => getSettings())
      ipcMain.handle('settings:set-polling-interval', (_event, minutes: number) => {
        setPollingInterval(minutes)
      })
      ipcMain.handle('settings:set-auto-start', (_event, enabled: boolean) => {
        setAutoStart(enabled)
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
    } catch (error) {
      console.error('[Startup] Failed to initialize:', error)
      // Don't quit on error - tray app should stay alive
    }
  })

  // Clean up before quit
  app.on('before-quit', () => {
    stopPolling()
    console.log('App quitting...')
  })
}
