import { Tray, nativeImage, Menu, app } from 'electron'
import path from 'path'
import { togglePopupWindow } from './window'

export let tray: Tray | null = null

export function createTray(): Tray {
  // Resolve icon path based on environment (dev vs production)
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, '../../resources/icons/tray-green.ico')
    : path.join(process.resourcesPath, 'icons/tray-green.ico')

  const icon = nativeImage.createFromPath(iconPath)

  // Create tray with GUID for persistent positioning in Windows tray
  tray = new Tray(icon, '7c3e8f2a-4b6d-9e1f-a5c0-d8b7f6324198')

  // Set tooltip
  tray.setToolTip('Claude Usage Widget')

  // Build and set context menu
  const contextMenu = Menu.buildFromTemplate([
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
      label: 'Login',
      click: () => {
        // Placeholder for future implementation
        console.log('Login clicked')
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

  tray.setContextMenu(contextMenu)

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
