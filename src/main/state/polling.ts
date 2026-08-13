import { refreshUsageData } from './usage'
import { getSettings } from './settings'

let pollingTimer: NodeJS.Timeout | null = null
let isPolling = false

async function poll(): Promise<void> {
  if (!isPolling) {
    return // Allows stopping
  }

  try {
    // refreshUsageData handles per-provider errors internally; a failed
    // fetch just keeps the last known data until the next poll.
    await refreshUsageData()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Polling] Error during poll:', errorMsg)
  }

  // Schedule next poll regardless of success/failure
  if (isPolling) {
    const settings = getSettings()
    const intervalMs = settings.pollingIntervalMinutes * 60 * 1000
    pollingTimer = setTimeout(poll, intervalMs)
  }
}

export function startPolling(): void {
  if (isPolling) {
    console.log('[Polling] Already polling, ignoring start request')
    return
  }

  isPolling = true
  console.log('[Polling] Started')
  poll() // Start immediately
}

export function stopPolling(): void {
  if (!isPolling) {
    return
  }

  isPolling = false
  if (pollingTimer !== null) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
  console.log('[Polling] Stopped')
}

export function restartPolling(): void {
  stopPolling()
  startPolling()
}
