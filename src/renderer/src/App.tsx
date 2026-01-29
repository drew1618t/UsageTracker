import React, { useEffect, useState } from 'react'
import './App.css'
import { UsageDisplay } from './components/UsageDisplay'
import { Settings } from './components/Settings'

interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

interface UsageLimit {
  current: number
  total: number
  percentage: number
  resetAt: string
}

interface UsageData {
  sessionLimit: UsageLimit
  weeklyAllModels: UsageLimit
  weeklySonnet: UsageLimit
  fetchedAt: string
}

interface UsageState {
  data: UsageData | null
  lastUpdated: Date | null
  error: string | null
  isLoading: boolean
}

function App() {
  const [version, setVersion] = useState<string>('...')
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userIdentifier: null
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [usageState, setUsageState] = useState<UsageState>({
    data: null,
    lastUpdated: null,
    error: null,
    isLoading: false
  })

  useEffect(() => {
    // Fetch app version on mount
    window.electronAPI.getVersion().then((v) => {
      setVersion(v)
    })

    // Get initial auth state
    window.electronAPI.getAuthState().then((state) => {
      setAuthState(state)
    })

    // Subscribe to auth state changes
    const cleanupAuth = window.electronAPI.onAuthStateChanged((state) => {
      setAuthState(state)
      setIsLoggingIn(false)
    })

    // Get initial usage data
    window.electronAPI.getUsageData().then((state) => {
      setUsageState({
        data: state.data,
        lastUpdated: state.lastUpdated,
        error: state.error,
        isLoading: false
      })
    })

    // Subscribe to usage data changes
    const cleanupUsage = window.electronAPI.onUsageDataChanged((data) => {
      setUsageState((prev) => ({
        ...prev,
        data,
        lastUpdated: new Date(),
        error: null,
        isLoading: false
      }))
    })

    return () => {
      cleanupAuth()
      cleanupUsage()
    }
  }, [])

  const handleLogin = async () => {
    setIsLoggingIn(true)
    await window.electronAPI.login()
  }

  const handleRefresh = async () => {
    setUsageState((prev) => ({ ...prev, isLoading: true }))
    try {
      const result = await window.electronAPI.refreshUsageData()
      setUsageState({
        data: result.data,
        lastUpdated: result.lastUpdated,
        error: result.error,
        isLoading: false
      })
    } catch (error) {
      setUsageState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh',
        isLoading: false
      }))
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Claude Usage</h1>
        <div className="header-right">
          {authState.isAuthenticated && <span className="user-badge">Logged in</span>}
          {authState.isAuthenticated && (
            <button
              className="settings-button"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙
            </button>
          )}
          <span className="app-version">v{version}</span>
        </div>
      </header>

      <main className="app-content">
        {isLoggingIn ? (
          <div className="waiting-message">
            <p>Waiting for login...</p>
          </div>
        ) : !authState.isAuthenticated ? (
          <div className="login-prompt">
            <p className="login-message">Log in to see usage</p>
            <button
              className="login-button"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              Log in with Claude.ai
            </button>
          </div>
        ) : showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <UsageDisplay
            data={usageState.data}
            lastUpdated={usageState.lastUpdated}
            error={usageState.error}
            isLoading={usageState.isLoading}
            onRefresh={handleRefresh}
          />
        )}
      </main>

      <footer className="app-footer">
        {authState.isAuthenticated && <p>Logged in</p>}
      </footer>
    </div>
  )
}

export default App
