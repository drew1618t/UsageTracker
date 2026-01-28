import React, { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [version, setVersion] = useState<string>('...')

  useEffect(() => {
    // Fetch app version on mount
    window.electronAPI.getVersion().then((v) => {
      setVersion(v)
    })
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Claude Usage</h1>
        <span className="app-version">v{version}</span>
      </header>

      <main className="app-content">
        <div className="placeholder-message">
          <p>No usage data yet.</p>
          <p>Login to get started.</p>
        </div>
      </main>

      <footer className="app-footer">
        <p>Click 'Login' from tray menu to authenticate</p>
      </footer>
    </div>
  )
}

export default App
