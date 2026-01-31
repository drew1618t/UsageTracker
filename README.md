# Claude Usage Tracker

A Windows system tray application that displays your Claude.ai usage limits at a glance. Color-coded indicators show whether you're good, getting close, or tapped out — without interrupting your workflow.

## Features

- **System Tray Integration** — Lives in your Windows system tray, always visible but never intrusive
- **Color-Coded Status** — Green/yellow/red icon reflects your most constraining limit
- **Three Usage Limits** — Session, Weekly (All Models), and Weekly (Sonnet) with progress bars
- **Reset Countdowns** — See when each limit resets
- **Browser Authentication** — Log in via Claude.ai, no manual cookie pasting
- **Background Polling** — Configurable refresh interval (1-30 minutes)
- **Auto-Start** — Optionally launch with Windows
- **Session Persistence** — Stay logged in across app restarts

## Screenshot

*Coming soon*

## Installation

### From Releases

1. Download the latest installer from [Releases](https://github.com/drew1618t/UsageTracker/releases)
2. Run the installer
3. Launch from Start Menu or let it auto-start with Windows

### From Source

```bash
# Clone the repository
git clone https://github.com/drew1618t/UsageTracker.git
cd UsageTracker

# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
npm run dist
```

## Usage

1. **First Launch** — Click the tray icon and log in to Claude.ai
2. **View Usage** — Hover for quick summary, click for detailed popup
3. **Refresh** — Right-click menu or button in popup
4. **Settings** — Configure polling interval and auto-start

### Tray Icon Colors

| Color | Meaning |
|-------|---------|
| Green | All limits under 70% |
| Yellow | Any limit between 70-89% |
| Red | Any limit at 90% or above |
| Gray | Not logged in |

### Display Logic

- **Session limit** shown by default (your day-to-day constraint)
- **Weekly limit** takes priority only when >90% used AND more limiting than remaining session capacity

## Tech Stack

- Electron + electron-vite
- React 19
- TypeScript
- electron-store (settings persistence)
- date-fns (time formatting)

## Requirements

- Windows 10/11
- Claude.ai Pro or Team subscription (to have usage limits)

## License

ISC

## Acknowledgments

Built with [Claude Code](https://claude.ai/code)
