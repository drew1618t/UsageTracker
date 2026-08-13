import { Tray, nativeImage, Menu, app } from 'electron'
import path from 'path'
import { togglePopupWindow } from './window'
import { getAuthState } from './auth/state'
import { openLoginPage, logout, setAuthState } from './auth'
import type { ProviderLimit, UsageDashboardState } from '../shared/types'
import { determineTrayIconColor, selectHighestUsageLimit } from './utils/displayLogic'

export let tray: Tray | null = null

/**
 * Resolve the on-disk path for a tray icon, which differs between
 * dev (repo resources folder) and packaged builds (resourcesPath).
 */
function resolveIconPath(iconName: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, `icons/${iconName}`)
    : path.join(__dirname, `../../resources/icons/${iconName}`)
}

/**
 * Create the system tray icon with click handler and context menu
 */
export function createTray(): Tray {
  // Check initial auth state to set correct icon
  const authState = getAuthState()
  const iconName = authState.isAuthenticated ? 'tray-green.ico' : 'tray-gray.ico'

  const icon = nativeImage.createFromPath(resolveIconPath(iconName))

  // Create tray (no GUID to avoid Windows icon caching issues)
  tray = new Tray(icon)

  const tooltip = authState.isAuthenticated
    ? 'AI Usage'
    : 'AI Usage - Claude not logged in'
  tray.setToolTip(tooltip)

  rebuildContextMenu()

  // Left click toggles the popup window
  tray.on('click', () => {
    if (tray) {
      togglePopupWindow(tray.getBounds())
    }
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
      label: authState.isAuthenticated ? 'Logout' : 'Login',
      click: async () => {
        if (authState.isAuthenticated) {
          await logout()
          setAuthState({ isAuthenticated: false, userIdentifier: null })
        } else {
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
 * Update tray icon and tooltip when authentication state changes.
 * Logged out shows gray; logged in defers to usage data so a red/yellow
 * icon is not overwritten with green.
 */
export async function updateTrayForAuthState(isAuthenticated: boolean): Promise<void> {
  if (!tray || tray.isDestroyed()) return

  if (!isAuthenticated) {
    tray.setImage(nativeImage.createFromPath(resolveIconPath('tray-gray.ico')))
    tray.setToolTip('AI Usage - Claude not logged in')
    return
  }

  // Dynamic import to avoid a circular dependency with state/usage
  const { getUsageDashboardData } = await import('./state/usage')
  updateTrayForUsage(getUsageDashboardData())
}

/**
 * Update tray icon color and tooltip based on current usage data
 */
export function updateTrayForUsage(state: UsageDashboardState): void {
  if (!tray || tray.isDestroyed()) return

  const availableProviders = Object.values(state.providers)
    .map((providerState) => providerState.data)
    .filter((provider): provider is NonNullable<typeof provider> => Boolean(provider))

  const allLimits = availableProviders.flatMap((provider) => provider.limits)
  const iconColor = determineTrayIconColor(...allLimits)
  tray.setImage(nativeImage.createFromPath(resolveIconPath(`tray-${iconColor}.ico`)))

  const highest = selectHighestUsageLimit(availableProviders)

  let tooltip = 'AI Usage - No usage data'
  if (highest) {
    tooltip = `AI Usage: ${highest.provider.providerLabel} ${formatTrayLimitLabel(highest.limit)} ${Math.round(highest.limit.percentage)}%`
  } else if (!getAuthState().isAuthenticated) {
    tooltip = 'AI Usage - Claude not logged in'
  }

  tray.setToolTip(tooltip)
}

/**
 * Shorten a limit label so the tooltip stays compact
 */
function formatTrayLimitLabel(limit: ProviderLimit): string {
  return limit.label
    .replace(' Limit', '')
    .replace(' (All Models)', '')
}
