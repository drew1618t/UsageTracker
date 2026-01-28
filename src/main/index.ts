import { app, BrowserWindow } from 'electron'
import { createTray, tray } from './tray'
import { getPopupWindow, togglePopupWindow } from './window'

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

  // Initialize app when ready
  app.whenReady().then(() => {
    // Create system tray
    createTray()
    console.log('Tray created successfully')
  })

  // Clean up before quit
  app.on('before-quit', () => {
    console.log('App quitting...')
  })
}
