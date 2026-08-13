import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ProgressBar } from './ProgressBar'
import './UsageDisplay.css'

type ProviderId = 'claude' | 'codex'

interface ProviderLimit {
  key: string
  label: string
  current: number
  total: number
  percentage: number
  resetAt: string
  isAcknowledged?: boolean
}

interface ProviderUsageData {
  providerId: ProviderId
  providerLabel: string
  fetchedAt: string
  limits: ProviderLimit[]
  primaryLimitKey: string | null
  source: 'remote' | 'local'
  metadata?: {
    planType?: string
    totalTokens?: number
    lastTokens?: number
  }
}

interface ProviderUsageState {
  data: ProviderUsageData | null
  lastUpdated: string | null
  error: string | null
  isLoading: boolean
  statusLabel: string
}

interface UsageDashboardState {
  providers: Record<ProviderId, ProviderUsageState>
}

interface UsageDisplayProps {
  dashboard: UsageDashboardState
  onRefresh: () => void
}

const PROVIDER_ORDER: ProviderId[] = ['claude', 'codex']

export function UsageDisplay({ dashboard, onRefresh }: UsageDisplayProps) {
  return (
    <div className="usage-display">
      <div className="providers-list">
        {PROVIDER_ORDER.map((providerId) => (
          <ProviderUsageCard
            key={providerId}
            provider={dashboard.providers[providerId]}
            fallbackTitle={providerId === 'claude' ? 'Claude' : 'Codex'}
          />
        ))}
      </div>

      <div className="usage-footer">
        <button className="refresh-button" onClick={onRefresh}>
          Refresh All
        </button>
      </div>
    </div>
  )
}

function ProviderUsageCard({
  provider,
  fallbackTitle
}: {
  provider: ProviderUsageState
  fallbackTitle: string
}) {
  const data = provider.data
  const lastUpdated = provider.lastUpdated ? new Date(provider.lastUpdated) : null

  return (
    <section className="provider-card">
      <div className="provider-header">
        <div>
          <h2 className="provider-title">{data?.providerLabel ?? fallbackTitle}</h2>
          <p className="provider-status">{provider.statusLabel}</p>
        </div>

        {data?.metadata?.planType && (
          <span className="provider-badge">Plan: {capitalize(data.metadata.planType)}</span>
        )}
      </div>

      {provider.error && (
        <div className="stale-indicator">
          {provider.error}
          {lastUpdated && (
            <span> Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
          )}
        </div>
      )}

      {provider.isLoading && !data ? (
        <div className="loading-state">Loading usage data...</div>
      ) : data ? (
        <>
          <div className="usage-limits">
            {data.limits.map((limit) => (
              <ProgressBar
                key={`${data.providerId}-${limit.key}`}
                label={limit.label}
                percentage={limit.percentage}
                current={limit.current}
                total={limit.total}
                resetAt={new Date(limit.resetAt)}
                isLimiting={limit.key === data.primaryLimitKey}
                isAcknowledged={limit.isAcknowledged}
                canAcknowledge={limit.percentage >= 90 && !limit.isAcknowledged}
                onAcknowledge={
                  limit.percentage >= 90 && !limit.isAcknowledged
                    ? async () => {
                        await window.electronAPI.acknowledgeUsageLimit(
                          data.providerId,
                          limit.key,
                          limit.resetAt
                        )
                      }
                    : undefined
                }
              />
            ))}
          </div>

          <div className="provider-meta">
            {data.metadata?.totalTokens !== undefined && (
              <span>Total tokens: {formatNumber(data.metadata.totalTokens)}</span>
            )}
            {data.metadata?.lastTokens !== undefined && (
              <span>Last request: {formatNumber(data.metadata.lastTokens)}</span>
            )}
          </div>
        </>
      ) : (
        <div className="no-data-state">
          <p>{provider.statusLabel}</p>
        </div>
      )}
    </section>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}
