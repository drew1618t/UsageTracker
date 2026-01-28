import React, { useEffect, useState } from 'react'
import './App.css'

interface AuthState {
  isAuthenticated: boolean
  userIdentifier: string | null
}

function App() {
  const [version, setVersion] = useState<string>('...')
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userIdentifier: null
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)

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
    const cleanup = window.electronAPI.onAuthStateChanged((state) => {
      setAuthState(state)
      setIsLoggingIn(false)
    })

    return cleanup
  }, [])

  const handleLogin = async () => {
    setIsLoggingIn(true)
    await window.electronAPI.login()
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Claude Usage</h1>
        <div className="header-right">
          {authState.isAuthenticated && <span className="user-badge">Logged in</span>}
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
        ) : (
          <div className="placeholder-message">
            <p>No usage data yet.</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        {authState.isAuthenticated && <p>Logged in</p>}
      </footer>
    </div>
  )
}

export default App
