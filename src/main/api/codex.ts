import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { ProviderLimit, ProviderUsageData } from '../../shared/types'

const CODEX_STALE_MS = 24 * 60 * 60 * 1000
const SESSION_SCAN_LIMIT = 20

interface CodexTokenUsage {
  total_tokens?: number
}

interface CodexRateLimitWindow {
  used_percent: number
  window_minutes: number
  resets_at: number
}

interface CodexRateLimits {
  limit_id?: string
  primary?: CodexRateLimitWindow
  secondary?: CodexRateLimitWindow
  plan_type?: string | null
}

interface CodexTokenCountPayload {
  type?: string
  info?: {
    total_token_usage?: CodexTokenUsage
    last_token_usage?: CodexTokenUsage
  } | null
  rate_limits?: CodexRateLimits | null
}

interface CodexEventLine {
  timestamp?: string
  type?: string
  payload?: CodexTokenCountPayload
}

interface CodexUsageResult {
  data: ProviderUsageData | null
  statusLabel: string
  isStale: boolean
}

export async function fetchCodexUsageData(): Promise<CodexUsageResult> {
  const sessionFiles = await getRecentSessionFiles()

  for (const filePath of sessionFiles) {
    const result = await parseCodexSessionFile(filePath)
    if (result) {
      return result
    }
  }

  return {
    data: null,
    statusLabel: 'No recent Codex usage found. Open Codex to populate local usage data.',
    isStale: false
  }
}

async function getRecentSessionFiles(): Promise<string[]> {
  const rootDir = path.join(os.homedir(), '.codex', 'sessions')
  const files: Array<{ path: string; mtimeMs: number }> = []

  async function walk(dirPath: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
          return
        }

        if (!entry.isFile() || path.extname(entry.name) !== '.jsonl') {
          return
        }

        try {
          const stats = await fs.stat(fullPath)
          files.push({ path: fullPath, mtimeMs: stats.mtimeMs })
        } catch {
          // Ignore files that disappear mid-scan.
        }
      })
    )
  }

  await walk(rootDir)

  return files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, SESSION_SCAN_LIMIT)
    .map((file) => file.path)
}

async function parseCodexSessionFile(filePath: string): Promise<CodexUsageResult | null> {
  let content: string

  try {
    content = await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }

  const lines = content.split(/\r?\n/).filter(Boolean)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    let entry: CodexEventLine

    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (entry.type !== 'event_msg' || entry.payload?.type !== 'token_count') {
      continue
    }

    const rateLimits = entry.payload.rate_limits
    if (!rateLimits || rateLimits.limit_id !== 'codex') {
      continue
    }

    const limits = createCodexLimits(rateLimits, Date.now())
    if (limits.length === 0) {
      continue
    }

    const fetchedAt = entry.timestamp ?? new Date().toISOString()
    const fetchedAtMs = new Date(fetchedAt).getTime()
    const isStale =
      Number.isFinite(fetchedAtMs) && Date.now() - fetchedAtMs > CODEX_STALE_MS

    return {
      data: {
        providerId: 'codex',
        providerLabel: 'Codex',
        fetchedAt,
        limits,
        primaryLimitKey: selectHighestLimit(limits)?.key ?? null,
        source: 'local',
        metadata: {
          planType: rateLimits.plan_type ?? undefined,
          totalTokens: entry.payload.info?.total_token_usage?.total_tokens,
          lastTokens: entry.payload.info?.last_token_usage?.total_tokens
        }
      },
      statusLabel: isStale ? 'Codex data is stale.' : 'Using local Codex session data.',
      isStale
    }
  }

  return null
}

function createCodexLimits(rateLimits: CodexRateLimits, nowMs: number): ProviderLimit[] {
  const limits: ProviderLimit[] = []

  if (rateLimits.primary && isActiveCodexLimit(rateLimits.primary, nowMs)) {
    limits.push(createCodexLimit('primary', rateLimits.primary))
  }

  if (rateLimits.secondary && isActiveCodexLimit(rateLimits.secondary, nowMs)) {
    limits.push(createCodexLimit('secondary', rateLimits.secondary))
  }

  return limits
}

function isActiveCodexLimit(limit: CodexRateLimitWindow, nowMs: number): boolean {
  return limit.resets_at * 1000 > nowMs
}

function createCodexLimit(key: string, limit: CodexRateLimitWindow): ProviderLimit {
  return {
    key,
    label: formatCodexLimitLabel(limit.window_minutes),
    current: limit.used_percent,
    total: 100,
    percentage: Math.round(limit.used_percent),
    resetAt: new Date(limit.resets_at * 1000).toISOString()
  }
}

function formatCodexLimitLabel(windowMinutes: number): string {
  if (windowMinutes === 300) {
    return 'Session (5h)'
  }

  if (windowMinutes === 10080) {
    return 'Weekly (7d)'
  }

  return `${windowMinutes} min`
}

function selectHighestLimit(limits: ProviderLimit[]): ProviderLimit | null {
  if (limits.length === 0) {
    return null
  }

  return limits.reduce((highest, current) =>
    current.percentage > highest.percentage ? current : highest
  )
}
