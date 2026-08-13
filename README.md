# AI Usage

A Windows system tray application that shows Claude.ai and Codex subscription usage at a glance. Color-coded indicators show whether you're good, getting close, or tapped out without interrupting your workflow.

## Features

- Combined popup view for Claude and Codex usage
- Tray icon color based on the most limiting active usage
- Per-limit acknowledgement until reset so finished limits stop driving the tray color
- Claude browser authentication with persisted session cookies
- Codex local usage tracking from `%USERPROFILE%/.codex/sessions`
- Background polling with configurable refresh interval
- Windows auto-start support

## Development

```bash
npm install
npm run dev
```
