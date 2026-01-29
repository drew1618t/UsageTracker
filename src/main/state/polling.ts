import { backOff } from 'exponential-backoff'
import { refreshUsageData } from './usage'
import { getSettings } from './settings'

let pollingTimer: NodeJS.Timeout | null = null
let isPolling = false

async function fetchWithRetry(): Promise<void> {
  await backOff(
    async () => {
      await refreshUsageData()
    },
    {
      numOfAttempts: 5,
      startingDelay: 1000,
      timeMultiple: 2,
      maxDelay: 60000,
      jitter: 'full',
      retry: (error: Error, attemptNumber: number) => {
        const errorMsg = error.message

        // Don't retry auth errors - stop immediately
        if (
          errorMsg.includes('Not authenticated') ||
          errorMsg.includes('401') ||
          errorMsg.includes('403')
        ) {
          console.log('[Polling] Auth error detected, stopping retries')
          return false
        }

        console.log(`[Polling] Retry attempt ${attemptNumber}: ${errorMsg}`)
        return true
      }
    }
  )
}

async function poll(): Promise<void> {
  if (!isPolling) {
    return // Allows stopping
  }

  try {
    await fetchWithRetry()
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
