import { useEffect, useState } from 'react'
import './App.css'
import { UsageDisplay } from './components/UsageDisplay'
import { Settings } from './components/Settings'
import type { AuthState, UsageDashboardState } from '../../shared/types'

function App() {
  const [version, setVersion] = useState<string>('...')
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userIdentifier: null
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [usageState, setUsageState] = useState<UsageDashboardState>({
    providers: {
      claude: {
        data: null,
        lastUpdated: null,
        error: null,
        isLoading: false,
        statusLabel: 'Claude not logged in.'
      },
      codex: {
        data: null,
        lastUpdated: null,
        error: null,
        isLoading: false,
        statusLabel: 'No recent Codex usage found.'
      }
    }
  })

  useEffect(() => {
    window.electronAPI.getVersion().then((v) => {
      setVersion(v)
    })

    window.electronAPI.getAuthState().then((state) => {
      setAuthState(state)
    })

    const cleanupAuth = window.electronAPI.onAuthStateChanged((state) => {
      setAuthState(state)
      setIsLoggingIn(false)
    })

    window.electronAPI.getUsageData().then((state) => {
      setUsageState(state)
    })

    const cleanupUsage = window.electronAPI.onUsageDataChanged((data) => {
      setUsageState(data)
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
    setUsageState((prev) => ({
      providers: {
        claude: { ...prev.providers.claude, isLoading: true },
        codex: { ...prev.providers.codex, isLoading: true }
      }
    }))

    try {
      const result = await window.electronAPI.refreshUsageData()
      setUsageState(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh'
      setUsageState((prev) => ({
        providers: {
          claude: { ...prev.providers.claude, error: message, isLoading: false },
          codex: { ...prev.providers.codex, error: message, isLoading: false }
        }
      }))
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">AI Usage</h1>
        <div className="header-right">
          {authState.isAuthenticated && <span className="user-badge">Claude connected</span>}
          {authState.isAuthenticated && (
            <button
              className="settings-button"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              [=]
            </button>
          )}
          <span className="app-version">v{version}</span>
        </div>
      </header>

      <main className="app-content">
        {isLoggingIn ? (
          <div className="waiting-message">
            <p>Waiting for Claude login...</p>
          </div>
        ) : showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <div className="dashboard-shell">
            {!authState.isAuthenticated && (
              <div className="login-prompt">
                <p className="login-message">Claude is not connected yet.</p>
                <button
                  className="login-button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                >
                  Log in with Claude.ai
                </button>
              </div>
            )}

            <UsageDisplay dashboard={usageState} onRefresh={handleRefresh} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>{authState.isAuthenticated ? 'Claude connected' : 'Claude not connected'}</p>
      </footer>
    </div>
  )
}

export default App
