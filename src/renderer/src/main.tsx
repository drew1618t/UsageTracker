import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('root') as HTMLElement

function renderStartupError(message: string): void {
  rootElement.innerHTML = `
    <div style="
      padding: 16px;
      font-family: Segoe UI, sans-serif;
      background: #111827;
      color: #f9fafb;
      min-height: 100vh;
      box-sizing: border-box;
    ">
      <h1 style="font-size:16px;margin:0 0 12px;">AI Usage failed to start</h1>
      <pre style="
        white-space: pre-wrap;
        word-break: break-word;
        background: #1f2937;
        padding: 12px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.5;
      ">${message.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] || char))}</pre>
    </div>
  `
}

window.addEventListener('error', (event) => {
  renderStartupError(event.error?.stack || event.message || 'Unknown renderer error')
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  renderStartupError(
    reason instanceof Error ? reason.stack || reason.message : String(reason)
  )
})

try {
  if (!window.electronAPI) {
    throw new Error('window.electronAPI is undefined. Preload script did not initialize.')
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  renderStartupError(error instanceof Error ? error.stack || error.message : String(error))
}
