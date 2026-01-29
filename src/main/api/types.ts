export interface UsageLimit {
  current: number // Current usage value
  total: number // Maximum allowed
  percentage: number // Calculated percentage (0-100)
  resetAt: string // ISO timestamp when limit resets
}

export interface UsageData {
  sessionLimit: UsageLimit
  weeklyAllModels: UsageLimit
  weeklySonnet: UsageLimit
  fetchedAt: string // ISO timestamp when data was fetched
}

export interface UsageState {
  data: UsageData | null
  lastUpdated: Date | null
  error: string | null
  isLoading: boolean
}
