# Technology Stack

**Project:** Claude Usage Monitor (Windows System Tray Widget)
**Researched:** 2026-01-27
**Research Confidence:** MEDIUM (based on training data, external verification unavailable)

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Electron** | ~33.x (latest) | Desktop application framework | Industry standard for cross-platform desktop apps with system tray support. Mature Tray API, built-in Chromium for rendering, Node.js for backend logic. Large ecosystem, extensive documentation. |
| Node.js | 20.x LTS | Runtime environment | Long-term support, stable, required by Electron |

**Rationale for Electron:**
- **Native system tray support**: `Tray` API is mature and well-documented
- **Built-in browser engine**: Chromium included, no external browser dependency
- **Windows-first**: Excellent Windows support with native window management
- **Developer experience**: Hot reload, DevTools, large community
- **Package size acceptable**: For a system tray utility (~150-200MB installed), Electron overhead is reasonable

**Alternative Considered: Tauri**
- **Why NOT Tauri**: While lighter weight (~10-20MB), Tauri requires Rust knowledge for system tray customization. For a solo developer focused on JavaScript/TypeScript, Electron's pure JS approach is faster to prototype and iterate. Tauri's webview approach can have authentication challenges with session persistence.

### Browser Automation & Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Playwright** | ~1.48.x | Browser automation for login flow | Superior to Puppeteer for authentication flows. Better cross-browser session handling, built-in wait mechanisms, persistent context support. Can launch real browser window for OAuth/login, then extract cookies programmatically. |

**Rationale for Playwright:**
- **Persistent browser contexts**: Can save authenticated session to disk, reuse across app restarts
- **Real browser window**: Users see familiar Claude.ai login (Google OAuth, email, etc.)
- **Cookie extraction**: After login, can extract session cookies for headless API calls
- **Active development**: More actively maintained than Puppeteer in 2024-2025

**Alternative Considered: Puppeteer**
- **Why NOT Puppeteer**: While lighter, Puppeteer has weaker persistent context support. Playwright's `browser.newContext({ storageState })` is superior for session reuse.

**Alternative Considered: Manual cookie input**
- **Why NOT manual**: UX is terrible. Users must manually copy cookies from DevTools, paste into app. Breaks on every session expiry (~2 weeks). Playwright automation is one-time setup with transparent re-auth.

### Web Scraping & Data Fetching
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Playwright** | ~1.48.x | Scraping authenticated pages | After authentication, use same Playwright instance with persistent context to fetch `/settings/usage` page HTML. Can parse DOM directly or extract via `page.evaluate()`. |
| Cheerio | ~1.0.x | HTML parsing (if needed) | If extracting HTML as string from Playwright, Cheerio provides jQuery-like selectors for parsing. Optional — Playwright's `page.$$eval()` may be sufficient. |
| Axios | ~1.7.x | Direct API calls (if available) | If Claude.ai exposes JSON API endpoints, Axios with cookie headers is lighter than launching browser. Investigate network tab during usage page load. |

**Scraping Strategy:**
1. **Try API first**: Inspect network requests on `/settings/usage`. If JSON endpoint exists, use Axios with session cookies (lighter weight).
2. **Fallback to Playwright DOM scraping**: If no API, use Playwright to navigate to page, extract DOM elements containing rate limit numbers.
3. **Cheerio as optional**: Only if parsing raw HTML strings. Playwright's built-in DOM methods (`page.$`, `page.$$eval`) likely sufficient.

### UI Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React** | ~18.3.x | UI component framework | De facto standard for Electron apps. Component model fits well: TrayIcon, PopupPanel, ProgressBar, CountdownTimer. Large ecosystem of pre-built components. |
| **Material-UI (MUI)** or **Ant Design** | ~6.x / ~5.x | UI component library | Pre-built progress bars, cards, typography. Saves time building from scratch. MUI has better customization, Ant Design has more polished defaults. |

**Alternative Considered: Plain HTML/CSS/JS**
- **Why NOT plain**: Building progress bars, layouts, responsive panels from scratch is slow. React + component library gets 80% of UI for 20% of effort.

**Alternative Considered: Vue.js**
- **Why NOT Vue**: React has larger Electron ecosystem. Most Electron examples/templates use React. Marginal DX difference doesn't justify smaller community.

### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Zustand** | ~5.x | Global state management | Lightweight, TypeScript-friendly, minimal boilerplate. Perfect for small apps. State shape: `{ sessionLimit, weeklyAllModels, weeklySonnet, lastUpdated, isRefreshing }`. |

**Alternative Considered: Redux**
- **Why NOT Redux**: Massive overkill for 5-10 state variables. Zustand gives 90% of Redux benefits with 10% of boilerplate.

**Alternative Considered: React Context**
- **Why NOT Context**: Works, but Zustand's DevTools integration and subscription model is cleaner for Electron main/renderer IPC scenarios.

### Background Task Scheduling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **node-cron** | ~3.x | Polling scheduler | Simple cron syntax for "fetch every 5 minutes". Lightweight, well-maintained. Example: `cron.schedule('*/5 * * * *', fetchUsageData)`. |

**Alternative Considered: `setInterval`**
- **Why NOT setInterval**: Works, but node-cron handles edge cases (drift correction, pause/resume) better. Cron syntax is more readable than millisecond math.

### Electron-Specific Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **electron-store** | ~10.x | Persistent settings storage | Store auth tokens, user preferences (polling interval, color thresholds), window positions. Simple key-value store with JSON schema validation. |
| electron-builder | ~25.x | Application packaging | Build `.exe` installer for Windows. Handles code signing, auto-updates, icon embedding. |
| electron-updater | ~6.x | Auto-update functionality | (Post-MVP) Automatic update checks and installation. Integrates with electron-builder. |

### Development Tools
| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **TypeScript** | ~5.6.x | Type safety | Essential for Electron IPC (main/renderer process communication). Prevents runtime errors when passing data between processes. |
| **Vite** | ~6.x | Build tool | Fast hot reload, modern ESM support, works well with React + Electron. electron-vite template available. |
| ESLint | ~9.x | Linting | Catch common mistakes, enforce code style. |
| Prettier | ~3.x | Code formatting | Auto-format on save. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Framework** | Electron | Tauri | Requires Rust for system tray, heavier learning curve |
| **Framework** | Electron | .NET WinForms/WPF | Windows-only, no web tech reuse, harder to scrape web content |
| **Framework** | Electron | Python (PyQt/Tkinter) | Worse packaging story, no built-in browser for auth |
| **Browser Automation** | Playwright | Puppeteer | Weaker persistent context/session management |
| **Browser Automation** | Playwright | Selenium | Heavier, slower startup, more brittle |
| **Authentication** | Playwright (real browser) | Manual cookie paste | Terrible UX, breaks frequently |
| **UI Library** | React + MUI | Plain HTML/CSS | Reinventing wheels (progress bars, layouts) |
| **State Management** | Zustand | Redux | Massive overkill for small app |
| **Polling** | node-cron | setInterval | Less reliable, harder to read |

## Installation

```bash
# Initialize Node.js project
npm init -y

# Core Electron
npm install electron
npm install -D electron-builder

# UI Framework
npm install react react-dom
npm install @mui/material @emotion/react @emotion/styled

# Browser Automation & Scraping
npm install playwright
npx playwright install chromium  # Download Chromium browser

# State Management
npm install zustand

# Utilities
npm install electron-store
npm install node-cron
npm install axios  # Optional, if API endpoint exists

# Development
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D vite electron-vite
npm install -D eslint prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

## Project Structure Recommendation

```
Usage/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App entry, tray setup
│   │   ├── auth.ts     # Playwright authentication
│   │   ├── scraper.ts  # Usage data fetching
│   │   └── store.ts    # electron-store wrapper
│   ├── renderer/       # Electron renderer process (UI)
│   │   ├── App.tsx     # React root component
│   │   ├── components/ # UI components
│   │   │   ├── PopupPanel.tsx
│   │   │   ├── LimitCard.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── CountdownTimer.tsx
│   │   └── store/      # Zustand state
│   │       └── usageStore.ts
│   └── shared/         # Types shared between main/renderer
│       └── types.ts
├── resources/          # Icons (16x16, 32x32 for tray)
├── package.json
├── tsconfig.json
└── electron-builder.yml
```

## Architecture Decisions

### Main Process vs Renderer Process

**Main Process Responsibilities:**
- System tray icon management
- Background polling (node-cron)
- Playwright authentication and scraping
- IPC communication with renderer

**Renderer Process Responsibilities:**
- UI rendering (React components)
- User interactions (click events, manual refresh)
- State display (Zustand store synced from main)

**Why this split:**
- Playwright must run in main process (Node.js APIs)
- UI must run in renderer process (Chromium rendering)
- IPC bridges the two (`ipcMain`/`ipcRenderer`)

### Authentication Flow

1. **First launch**: App checks electron-store for saved session
2. **No session**: Launch Playwright browser window (visible)
3. **User logs in**: Normal Claude.ai login (Google, email, etc.)
4. **After login**: Playwright extracts cookies, saves to persistent context
5. **Subsequent launches**: Reuse saved context (no login required)
6. **Session expired**: Detect 401/redirect to login, re-trigger auth flow

### Data Fetching Strategy

**Preferred: API endpoint (if exists)**
```typescript
// If network inspector shows JSON endpoint
const response = await axios.get('https://claude.ai/api/usage', {
  headers: { Cookie: savedCookies }
});
```

**Fallback: DOM scraping**
```typescript
// If only HTML page available
const page = await context.newPage();
await page.goto('https://claude.ai/settings/usage');
const limits = await page.$$eval('.limit-card', cards =>
  cards.map(card => ({
    type: card.querySelector('.limit-type').textContent,
    used: card.querySelector('.used').textContent,
    total: card.querySelector('.total').textContent
  }))
);
```

### Icon Color Logic

```typescript
function getTrayIconColor(limits: Limits): 'green' | 'yellow' | 'red' {
  const percentages = [
    limits.sessionLimit.used / limits.sessionLimit.total,
    limits.weeklyAllModels.used / limits.weeklyAllModels.total,
    limits.weeklySonnet.used / limits.weeklySonnet.total
  ];

  const maxUsage = Math.max(...percentages);

  if (maxUsage >= 0.9) return 'red';      // 90%+ usage
  if (maxUsage >= 0.7) return 'yellow';   // 70-90% usage
  return 'green';                          // <70% usage
}
```

## Confidence Assessment

| Technology | Confidence | Notes |
|------------|------------|-------|
| Electron | **HIGH** | Mature, well-documented, industry standard for desktop apps |
| Playwright | **HIGH** | Best-in-class browser automation as of 2024-2025 |
| React | **HIGH** | De facto standard for Electron UIs |
| Zustand | **MEDIUM** | Good for small apps, but verify latest best practices for Electron state sync |
| node-cron | **MEDIUM** | Simple and reliable, but verify if Electron has preferred scheduling approach |
| MUI/Ant Design | **MEDIUM** | Both work well, choice is aesthetic preference |

## Verification Needed

**CRITICAL: Verify these before implementation:**

1. **Claude.ai API endpoints**: Inspect network tab on `/settings/usage`. If JSON API exists, prefer over DOM scraping.
   - **Why critical**: API is more stable than DOM structure. DOM classes can change, breaking scraper.

2. **Session cookie lifetime**: Test how long Claude.ai sessions last. If >1 month, Playwright auth is great. If <1 week, need re-auth UX.
   - **Why critical**: Affects how often users see login window.

3. **Electron version compatibility**: Verify Electron 33.x (or latest) with Node.js 20 LTS.
   - **Why critical**: Electron versions can have breaking changes in Tray API.

4. **Playwright context persistence on Windows**: Test `storageState` save/load on Windows specifically.
   - **Why critical**: File path handling differs on Windows (backslashes, permissions).

5. **MUI bundle size in Electron**: Electron apps are large. Verify MUI doesn't balloon renderer process excessively.
   - **Why critical**: Slow startup affects UX for system tray app.

## Next Steps for Roadmap

Based on this stack, suggested phase structure:

1. **Phase 1: Electron Shell** - Barebones Electron app with system tray icon, no data fetching yet
2. **Phase 2: Authentication** - Playwright integration, login flow, session persistence
3. **Phase 3: Data Fetching** - Scrape/API call to get usage numbers, parse into structured data
4. **Phase 4: UI Panel** - React components for popup panel with progress bars
5. **Phase 5: Icon Color Logic** - Calculate color based on limits, update tray icon
6. **Phase 6: Background Polling** - node-cron integration, auto-refresh
7. **Phase 7: Polish** - Manual refresh button, countdown timers, error handling

## Sources

**Note:** This research was conducted without access to external verification tools (WebSearch, WebFetch, Context7). All recommendations are based on training data current as of January 2025.

**RECOMMENDED VERIFICATION SOURCES:**
- Electron documentation: https://www.electronjs.org/docs/latest/
- Playwright documentation: https://playwright.dev/
- electron-vite template: https://github.com/electron-vite/electron-vite-react
- Zustand documentation: https://github.com/pmndrs/zustand

**Confidence level:** MEDIUM. Stack choices are sound based on 2024-2025 best practices, but version numbers and specific API details should be verified against current official documentation before implementation.
