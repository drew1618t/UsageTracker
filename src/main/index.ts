import { app, BrowserWindow } from 'electron'
import { createTray } from './tray'

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this instance
  app.quit()
} else {
  // This is the first/primary instance

  // Handle second instance attempts
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Log for now - future phases will focus popup window
    console.log('Second instance attempted - single instance lock working')
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
