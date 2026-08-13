import { Tray, nativeImage, Menu, app } from 'electron'
import path from 'path'
import { togglePopupWindow } from './window'
import { getAuthState } from './auth/state'
import { openLoginPage, logout, setAuthState } from './auth'
import type { ProviderLimit, UsageDashboardState } from './api/types'
import { determineTrayIconColor, selectHighestUsageLimit } from './utils/displayLogic'

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
    ? 'AI Usage'
    : 'AI Usage - Claude not logged in'
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
    ? 'AI Usage'
    : 'AI Usage - Claude not logged in'
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
export function updateTrayForUsage(state: UsageDashboardState): void {
  if (!tray || tray.isDestroyed()) return

  const availableProviders = Object.values(state.providers)
    .map((providerState) => providerState.data)
    .filter((provider): provider is NonNullable<typeof provider> => Boolean(provider))

  const allLimits = availableProviders.flatMap((provider) => provider.limits)
  const iconColor = determineTrayIconColor(...allLimits)

  // Update icon
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, `../../resources/icons/tray-${iconColor}.ico`)
    : path.join(process.resourcesPath, `icons/tray-${iconColor}.ico`)

  const icon = nativeImage.createFromPath(iconPath)
  tray.setImage(icon)

  const highest = selectHighestUsageLimit(availableProviders)

  let tooltip = 'AI Usage - No usage data'
  if (highest) {
    tooltip = `AI Usage: ${highest.provider.providerLabel} ${formatTrayLimitLabel(highest.limit)} ${Math.round(highest.limit.percentage)}%`
  } else if (!getAuthState().isAuthenticated) {
    tooltip = 'AI Usage - Claude not logged in'
  }

  tray.setToolTip(tooltip)
}

function formatTrayLimitLabel(limit: ProviderLimit): string {
  return limit.label
    .replace(' Limit', '')
    .replace(' (All Models)', '')
}
