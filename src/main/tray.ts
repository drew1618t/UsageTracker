import { Tray, nativeImage, Menu, app } from 'electron'
import path from 'path'
import { togglePopupWindow } from './window'
import { getAuthState } from './auth/state'
import { openLoginPage, logout, setAuthState } from './auth'
import type { UsageData } from './api/types'

export let tray: Tray | null = null

export function createTray(): Tray {
  // Check initial auth state to set correct icon
  const authState = getAuthState()
  const iconName = authState.isAuthenticated ? 'tray-green.ico' : 'tray-gray.ico'
  console.log('createTray - authState:', authState, 'iconName:', iconName)

  // Resolve icon path based on environment (dev vs production)
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/${iconName}`)
    : path.join(process.resourcesPath, `icons/${iconName}`)

  console.log('createTray - iconPath:', iconPath)
  const icon = nativeImage.createFromPath(iconPath)
  console.log('createTray - icon isEmpty:', icon.isEmpty())

  // Create tray (removed GUID to avoid Windows icon caching issues)
  tray = new Tray(icon)

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
      click: async () => {
        const { refreshUsageData } = await import('./state/usage')
        try {
          await refreshUsageData()
        } catch (error) {
          console.error('Refresh failed:', error)
        }
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
  console.log('updateTrayForAuthState called with:', isAuthenticated)
  if (!tray) {
    console.log('updateTrayForAuthState - tray is null, skipping')
    return
  }

  // Determine icon based on auth state
  // When authenticated, use green (or yellow/red based on usage in future)
  // When not authenticated, use gray
  const iconName = isAuthenticated ? 'tray-green.ico' : 'tray-gray.ico'
  console.log('updateTrayForAuthState - setting icon to:', iconName)

  // Resolve icon path
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/${iconName}`)
    : path.join(process.resourcesPath, `icons/${iconName}`)

  const icon = nativeImage.createFromPath(iconPath)
  console.log('updateTrayForAuthState - icon isEmpty:', icon.isEmpty())
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

/**
 * Update tray icon and tooltip based on usage data
 */
export function updateTrayForUsage(data: UsageData): void {
  if (!tray || tray.isDestroyed()) return

  // Find most limiting constraint (highest percentage)
  const limits = [
    { name: 'Session', percentage: data.sessionLimit.percentage },
    { name: 'Weekly', percentage: data.weeklyAllModels.percentage },
    { name: 'Sonnet', percentage: data.weeklySonnet.percentage }
  ]

  // Sort by percentage descending to find most limiting
  limits.sort((a, b) => b.percentage - a.percentage)
  const mostLimiting = limits[0]

  // Determine icon color based on thresholds
  let iconColor: 'green' | 'yellow' | 'red'
  if (mostLimiting.percentage >= 90) {
    iconColor = 'red'
  } else if (mostLimiting.percentage >= 70) {
    iconColor = 'yellow'
  } else {
    iconColor = 'green'
  }

  // Update icon
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/tray-${iconColor}.ico`)
    : path.join(process.resourcesPath, `icons/tray-${iconColor}.ico`)

  const icon = nativeImage.createFromPath(iconPath)
  tray.setImage(icon)

  // Update tooltip with usage summary - show which limit is highest
  const tooltip = `Claude: ${mostLimiting.name} ${Math.round(mostLimiting.percentage)}%`
  tray.setToolTip(tooltip)
}
