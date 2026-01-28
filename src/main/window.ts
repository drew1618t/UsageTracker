import { BrowserWindow, screen, app } from 'electron'
import path from 'path'

let popupWindow: BrowserWindow | null = null
let lastBlurTime = 0

export function getPopupWindow(): BrowserWindow | null {
  return popupWindow
}

export function createPopupWindow(trayBounds: Electron.Rectangle): BrowserWindow {
  // If window already exists and is not destroyed, return it
  if (popupWindow && !popupWindow.isDestroyed()) {
    return popupWindow
  }

  // Define window dimensions
  const width = 380
  const height = 480

  // Calculate position near tray icon
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2)
  let y = Math.round(trayBounds.y - height)

  // Clamp to screen bounds
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  x = Math.max(0, Math.min(x, screenWidth - width))
  y = Math.max(0, Math.min(y, screenHeight - height))

  // Create popup window
  popupWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    show: false, // Prevent flash
    frame: false, // Frameless popup
    resizable: false,
    skipTaskbar: true, // Don't show in taskbar
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  // Hide on focus loss (auto-hide when clicking outside)
  popupWindow.on('blur', () => {
    lastBlurTime = Date.now()
    popupWindow?.hide()
  })

  // Clean up reference on close
  popupWindow.on('closed', () => {
    popupWindow = null
  })

  // Show after render (prevents white flash)
  popupWindow.once('ready-to-show', () => {
    popupWindow?.show()
  })

  // Load renderer
  const isDev = process.env.ELECTRON_RENDERER_URL !== undefined
  if (isDev) {
    popupWindow.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
  } else {
    popupWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return popupWindow
}

export function togglePopupWindow(trayBounds: Electron.Rectangle): void {
  // If window is visible, hide it
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.hide()
    return
  }

  // Prevent flicker: if blur just happened, don't immediately show
  // (blur fires when clicking tray icon to hide, then click handler fires)
  if (Date.now() - lastBlurTime < 200) {
    return
  }

  // If window exists but is hidden, reposition and show
  if (popupWindow && !popupWindow.isDestroyed()) {
    // Recalculate position
    const width = 380
    const height = 480
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2)
    let y = Math.round(trayBounds.y - height)

    // Clamp to screen bounds
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    x = Math.max(0, Math.min(x, screenWidth - width))
    y = Math.max(0, Math.min(y, screenHeight - height))

    popupWindow.setPosition(x, y)
    popupWindow.show()
    popupWindow.focus()
    return
  }

  // No window exists, create it
  createPopupWindow(trayBounds)
}
