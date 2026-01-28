import { BrowserWindow, session } from 'electron'

const LOGIN_URL = 'https://claude.ai/login'

let loginWindow: BrowserWindow | null = null

/**
 * Open Claude.ai login page in a BrowserWindow
 * Uses the same session partition so cookies are captured
 */
export async function openLoginPage(): Promise<void> {
  // If login window already exists, focus it
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus()
    return
  }

  // Validate URL for security (should always be HTTPS Claude.ai)
  if (!LOGIN_URL.startsWith('https://claude.ai')) {
    throw new Error('Invalid login URL')
  }

  // Create login window using the same session partition
  loginWindow = new BrowserWindow({
    width: 500,
    height: 700,
    title: 'Log in to Claude',
    webPreferences: {
      // Use same session partition so cookies are captured
      partition: 'persist:main',
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    resizable: true,
    minimizable: true,
    maximizable: false
  })

  // Load login page
  await loginWindow.loadURL(LOGIN_URL)

  // Clean up reference when window is closed
  loginWindow.on('closed', () => {
    loginWindow = null
  })

  // Auto-close window when navigated to main Claude page (login complete)
  loginWindow.webContents.on('did-navigate', (_event, url) => {
    // If we navigated to the main Claude page (not login), user is logged in
    if (
      url.startsWith('https://claude.ai') &&
      !url.includes('/login') &&
      !url.includes('/signup') &&
      !url.includes('/oauth')
    ) {
      // Small delay to ensure cookies are fully set
      setTimeout(() => {
        if (loginWindow && !loginWindow.isDestroyed()) {
          loginWindow.close()
        }
      }, 500)
    }
  })
}

/**
 * Close login window if open
 */
export function closeLoginWindow(): void {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close()
    loginWindow = null
  }
}
