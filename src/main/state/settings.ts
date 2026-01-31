import { app, BrowserWindow } from 'electron'
// Using require for electron-store due to ESM/CJS compatibility
const ElectronStoreModule = require('electron-store')
const ElectronStore = ElectronStoreModule.default || ElectronStoreModule

interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
}

const schema = {
  pollingIntervalMinutes: {
    type: 'number',
    minimum: 1,
    maximum: 30,
    default: 5
  },
  autoStartEnabled: {
    type: 'boolean',
    default: false
  }
} as const

const store = new ElectronStore<SettingsSchema>({
  schema,
  defaults: {
    pollingIntervalMinutes: 5,
    autoStartEnabled: false
  }
})

export function getSettings(): SettingsSchema {
  return {
    pollingIntervalMinutes: store.get('pollingIntervalMinutes'),
    autoStartEnabled: store.get('autoStartEnabled')
  }
}

export function setPollingInterval(minutes: number): void {
  if (minutes < 1 || minutes > 30) {
    throw new Error('Polling interval must be between 1 and 30 minutes')
  }
  store.set('pollingIntervalMinutes', minutes)
  notifySettingsChanged()
}

export function setAutoStart(enabled: boolean): void {
  const isDev = !app.isPackaged
  store.set('autoStartEnabled', enabled)

  // Skip auto-start in development mode to prevent electron.exe registry entries
  if (isDev) {
    console.log('[Settings] Skipping auto-start in dev mode')
    notifySettingsChanged()
    return
  }

  // Update Windows auto-start setting
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
    path: process.execPath
  })

  notifySettingsChanged()
}

export function initSettings(): void {
  const isDev = !app.isPackaged

  // Skip syncing Windows registry in dev mode (registry state is unreliable in dev)
  if (!isDev) {
    // Sync Windows auto-start state on startup
    const loginItemSettings = app.getLoginItemSettings()
    const currentAutoStart = store.get('autoStartEnabled')

    // If Windows setting differs from stored setting, update stored setting to match reality
    if (loginItemSettings.openAtLogin !== currentAutoStart) {
      store.set('autoStartEnabled', loginItemSettings.openAtLogin)
    }
  }

  console.log('[Settings] Initialized:', getSettings())
}

function notifySettingsChanged(): void {
  const settings = getSettings()
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('settings-changed', settings)
  })
}

// Watch for polling interval changes and restart polling
store.onDidChange('pollingIntervalMinutes', async () => {
  console.log('[Settings] Polling interval changed, restarting polling...')
  const { restartPolling } = await import('./polling')
  restartPolling()
})
