import { formatDistanceToNow } from 'date-fns'
import { ProgressBar } from './ProgressBar'
import './UsageDisplay.css'
import type {
  ProviderCredits,
  ProviderId,
  ProviderUsageState,
  UsageDashboardState
} from '../../../shared/types'

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

            {data.credits && <CreditsBar credits={data.credits} />}
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

/**
 * Extra-usage credits shown as a spend meter. The API reports no reset for
 * these, so the footer carries the dollar figures instead of a reset time.
 */
function CreditsBar({ credits }: { credits: ProviderCredits }) {
  const used = formatMoney(credits.usedMinor, credits)
  const limit = formatMoney(credits.limitMinor, credits)
  const note = credits.isEnabled ? `${used} of ${limit}` : `${used} of ${limit}, off`

  return (
    <ProgressBar
      label="Credits"
      percentage={credits.percentage}
      current={credits.usedMinor}
      total={credits.limitMinor}
      footerNote={note}
      valueLabel={`${used} of ${limit}`}
    />
  )
}

/** Formats a minor-unit amount (cents) using the currency's exponent */
function formatMoney(amountMinor: number, credits: ProviderCredits): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: credits.currency,
    minimumFractionDigits: credits.decimalPlaces,
    maximumFractionDigits: credits.decimalPlaces
  }).format(amountMinor / 10 ** credits.decimalPlaces)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}
