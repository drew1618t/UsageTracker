import React, { useEffect, useState } from 'react'

interface SettingsSchema {
  pollingIntervalMinutes: number
  autoStartEnabled: boolean
}

interface SettingsProps {
  onClose: () => void
}

const INTERVAL_PRESETS = [1, 5, 10, 15, 30]

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsSchema>({
    pollingIntervalMinutes: 5,
    autoStartEnabled: false
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s)
      setIsLoading(false)
    })

    const cleanup = window.electronAPI.onSettingsChanged((s) => {
      setSettings(s)
    })

    return cleanup
  }, [])

  const handleIntervalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10)
    setSettings((prev) => ({ ...prev, pollingIntervalMinutes: minutes }))
    await window.electronAPI.setPollingInterval(minutes)
  }

  const handleAutoStartChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked
    setSettings((prev) => ({ ...prev, autoStartEnabled: enabled }))
    await window.electronAPI.setAutoStart(enabled)
  }

  if (isLoading) {
    return <div className="settings-panel">Loading...</div>
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="close-button" onClick={onClose}>
          x
        </button>
      </div>

      <div className="settings-content">
        <div className="setting-group">
          <label className="setting-label">
            Refresh every {settings.pollingIntervalMinutes} min
          </label>
          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="30"
              value={settings.pollingIntervalMinutes}
              onChange={handleIntervalChange}
              className="interval-slider"
            />
            <div className="slider-labels">
              {INTERVAL_PRESETS.map((val) => (
                <span
                  key={val}
                  className={settings.pollingIntervalMinutes === val ? 'active' : ''}
                >
                  {val}m
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-row">
            <span>Start with Windows</span>
            <input
              type="checkbox"
              checked={settings.autoStartEnabled}
              onChange={handleAutoStartChange}
              className="toggle-checkbox"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
