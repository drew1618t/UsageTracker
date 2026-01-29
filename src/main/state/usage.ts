import { BrowserWindow } from 'electron'
import { fetchUsageData } from '../api/usage'
import type { UsageData, UsageState } from '../api/types'

let state: UsageState = {
  data: null,
  lastUpdated: null,
  error: null,
  isLoading: false
}

export function getUsageData(): UsageState {
  return { ...state }
}

export function getLastError(): string | null {
  return state.error
}

export async function refreshUsageData(): Promise<UsageData> {
  state.isLoading = true
  state.error = null

  try {
    const data = await fetchUsageData()
    state.data = data
    state.lastUpdated = new Date()
    state.error = null

    // Notify all renderer windows of the update
    notifyUsageDataChanged(data)

    return data
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    state.error = errorMsg
    // Keep existing data on error (stale data pattern)
    throw error
  } finally {
    state.isLoading = false
  }
}

function notifyUsageDataChanged(data: UsageData): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('usage-data-changed', data)
  })
}
