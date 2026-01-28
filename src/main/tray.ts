import { Tray, nativeImage, Menu, app } from 'electron'
import path from 'path'
import { togglePopupWindow } from './window'
import { getAuthState } from './auth/state'
import { openLoginPage, logout, setAuthState } from './auth'

export let tray: Tray | null = null

export function createTray(): Tray {
  // Check initial auth state to set correct icon
  const authState = getAuthState()
  const iconName = authState.isAuthenticated ? 'tray-green.ico' : 'tray-gray.ico'

  // Resolve icon path based on environment (dev vs production)
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/${iconName}`)
    : path.join(process.resourcesPath, `icons/${iconName}`)

  const icon = nativeImage.createFromPath(iconPath)

  // Create tray with GUID for persistent positioning in Windows tray
  tray = new Tray(icon, '7c3e8f2a-4b6d-9e1f-a5c0-d8b7f6324198')

  // Set tooltip based on auth state
  const tooltip = authState.isAuthenticated
    ? 'Claude Usage Widget'
    : 'Claude Usage - Not logged in'
  tray.setToolTip(tooltip)

  // Build context menu
  rebuildContextMenu()

  tray.setContextMenu(buildContextMenu())

  // Add click handler to toggle popup window
  tray.on('click', () => {
    if (tray) {
      togglePopupWindow(tray.getBounds())
    }
  })

  // Handle tray destruction (e.g., Windows Explorer restart)
  // Recreate the tray when it's destroyed
  tray.on('destroyed', () => {
    console.log('Tray destroyed, recreating...')
    setTimeout(() => {
      if (!tray || tray.isDestroyed()) {
        createTray()
      }
    }, 1000)
  })

  return tray
}

/**
 * Build context menu based on current auth state
 */
function buildContextMenu(): Menu {
  const authState = getAuthState()

  return Menu.buildFromTemplate([
    {
      label: 'Refresh',
      click: () => {
        // Placeholder for future implementation
        console.log('Refresh clicked')
      }
    },
    {
      label: 'Settings',
      click: () => {
        // Placeholder for future implementation
        console.log('Settings clicked')
      }
    },
    {
      label: authState.isAuthenticated ? 'Logout' : 'Login',
      click: async () => {
        if (authState.isAuthenticated) {
          // Logout
          await logout()
          setAuthState({ isAuthenticated: false, userIdentifier: null })
        } else {
          // Login
          await openLoginPage()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit()
      }
    }
  ])
}

/**
 * Rebuild context menu (called when auth state changes)
 */
export function rebuildContextMenu(): void {
  if (!tray) return
  tray.setContextMenu(buildContextMenu())
}

/**
 * Update tray icon and tooltip based on authentication state
 */
export function updateTrayForAuthState(isAuthenticated: boolean): void {
  if (!tray) return

  // Determine icon based on auth state
  // When authenticated, use green (or yellow/red based on usage in future)
  // When not authenticated, use gray
  const iconName = isAuthenticated ? 'tray-green.ico' : 'tray-gray.ico'

  // Resolve icon path
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/${iconName}`)
    : path.join(process.resourcesPath, `icons/${iconName}`)

  const icon = nativeImage.createFromPath(iconPath)
  tray.setImage(icon)

  // Update tooltip
  const tooltip = isAuthenticated
    ? 'Claude Usage Widget'
    : 'Claude Usage - Not logged in'
  tray.setToolTip(tooltip)
}

export function updateTrayIcon(status: 'green' | 'yellow' | 'red'): void {
  if (!tray) return

  // Resolve icon path for the requested status
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/tray-${status}.ico`)
    : path.join(process.resourcesPath, `icons/tray-${status}.ico`)

  const icon = nativeImage.createFromPath(iconPath)
  tray.setImage(icon)
}
