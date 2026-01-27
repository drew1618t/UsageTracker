# Architecture Patterns: Windows System Tray Widget

**Domain:** Windows system tray application with web authentication
**Project:** Claude.ai Usage Monitor
**Researched:** 2026-01-27
**Confidence:** MEDIUM (based on established patterns, not verified with current docs)

## Executive Summary

A Windows system tray application with browser-based authentication and periodic data fetching requires a multi-component architecture separating concerns between UI, authentication, data fetching, and system integration. The recommended architecture uses a main process managing system tray integration and background tasks, with separate window contexts for authentication and popup display.

**Key architectural decision:** Process separation between background logic (main process) and UI rendering (renderer processes) to maintain responsiveness and security isolation.

## Recommended Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         MAIN PROCESS                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ System Tray    │  │  Auth Manager│  │  Data Fetcher   │ │
│  │  Integration   │  │              │  │                 │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│           │                  │                   │          │
│           │                  │                   │          │
│  ┌────────▼──────────────────▼───────────────────▼───────┐ │
│  │              State Manager / Store                    │ │
│  │  - Auth status                                        │ │
│  │  - Rate limit data                                    │ │
│  │  - Tray icon state                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│           │                  │                   │          │
└───────────┼──────────────────┼───────────────────┼──────────┘
            │                  │                   │
     ┌──────▼──────┐    ┌─────▼──────┐    ┌──────▼──────┐
     │ Tray Icon   │    │   Auth     │    │   Popup     │
     │  (Native)   │    │   Window   │    │   Window    │
     │             │    │ (Hidden)   │    │  (Renderer) │
     └─────────────┘    └────────────┘    └─────────────┘
                        RENDERER PROCESS   RENDERER PROCESS
```

### Component Boundaries

| Component | Responsibility | Process Context | Communicates With |
|-----------|---------------|-----------------|-------------------|
| **System Tray Integration** | Create/update tray icon, handle clicks, manage icon color | Main Process | State Manager, Popup Window |
| **Auth Manager** | Manage auth window lifecycle, extract auth tokens, handle session persistence | Main Process | Auth Window, State Manager, Data Fetcher |
| **Data Fetcher** | Schedule polling, make authenticated HTTP requests, parse rate limit data | Main Process | State Manager, Auth Manager |
| **State Manager** | Central state store, coordinate updates, persist data locally | Main Process | All components |
| **Auth Window** | Display browser login flow, execute JavaScript to capture tokens | Renderer Process (Hidden) | Auth Manager |
| **Popup Window** | Display rate limits, progress bars, handle user interactions | Renderer Process (On-demand) | System Tray Integration, State Manager |

## Detailed Component Architecture

### 1. Main Process (Background Orchestrator)

**Technology:** Node.js runtime (via Electron main process or native Node)
**Lifecycle:** Runs continuously while app is active
**Responsibilities:**
- Application lifecycle management
- Coordinate all components
- No direct DOM manipulation

**Sub-components:**

#### System Tray Integration
```typescript
interface TrayManager {
  initialize(): void
  updateIcon(color: 'green' | 'yellow' | 'red'): void
  showPopup(): void
  hidePopup(): void
  onTrayClick(): void
}
```

**Pattern:** Single native tray icon instance, updated via platform APIs
**Data dependencies:** Current rate limit state (to determine color)
**Build priority:** HIGH (foundational for app identity)

#### Auth Manager
```typescript
interface AuthManager {
  initiateLogin(): Promise<void>
  checkAuthStatus(): Promise<boolean>
  getAuthToken(): string | null
  refreshToken(): Promise<void>
  onAuthSuccess(token: string): void
  logout(): void
}
```

**Pattern:** Manages hidden browser window lifecycle, extracts cookies/tokens via JavaScript injection
**Data flow:** Browser window → Token extraction → Persistent storage → Data Fetcher
**Build priority:** HIGH (blocks data fetching)

**Key architectural concern:** Token extraction strategy
- **Option A:** Inject JavaScript to read cookies from authenticated session
- **Option B:** Intercept network requests to capture auth headers
- **Recommendation:** Option A for simplicity, Option B if Claude.ai uses httpOnly cookies

#### Data Fetcher
```typescript
interface DataFetcher {
  startPolling(intervalMs: number): void
  stopPolling(): void
  fetchNow(): Promise<RateLimitData>
  onDataReceived(data: RateLimitData): void
  onError(error: Error): void
}
```

**Pattern:** Scheduled background task using setInterval or cron-like scheduler
**Data flow:** Auth token → HTTP client → Parse response → State Manager
**Build priority:** MEDIUM (depends on Auth Manager)

**Polling strategy:**
- Default interval: 5 minutes (configurable)
- Exponential backoff on errors
- Cancel in-flight requests on app close

#### State Manager
```typescript
interface StateManager {
  // Auth state
  setAuthToken(token: string): void
  getAuthToken(): string | null

  // Rate limit state
  updateRateLimits(data: RateLimitData): void
  getRateLimits(): RateLimitData
  getMostLimitingStatus(): 'green' | 'yellow' | 'red'

  // Persistence
  saveState(): void
  loadState(): void

  // Observers
  onStateChange(callback: (state: AppState) => void): void
}
```

**Pattern:** Centralized state store with observer pattern for reactive updates
**Persistence:** JSON file in user app data directory
**Build priority:** HIGH (all components depend on this)

**State structure:**
```typescript
interface AppState {
  auth: {
    token: string | null
    lastLogin: Date | null
    expiresAt: Date | null
  }
  rateLimits: {
    session: RateLimit
    weeklyAllModels: RateLimit
    weeklySonnet: RateLimit
    lastUpdated: Date
  }
  settings: {
    pollingInterval: number
    startOnBoot: boolean
  }
}

interface RateLimit {
  current: number
  limit: number
  resetTime: Date
  status: 'green' | 'yellow' | 'red'
}
```

### 2. Auth Window (Renderer Process)

**Technology:** Browser context (Chromium via Electron or WebView2)
**Lifecycle:** Created on-demand, destroyed after auth success
**Visibility:** Hidden by default (or shown if debugging)

**Responsibilities:**
- Navigate to Claude.ai login page
- Execute login flow (user interaction)
- Inject script to extract auth token
- Send token back to Main Process

**Architecture pattern:**
```
User Action → Open Auth Window → Load https://claude.ai/login
→ User completes login → Page ready event
→ Inject extraction script → Extract token/cookies
→ Send to Main Process via IPC → Close window
```

**Token extraction approach:**
```javascript
// Injected into Auth Window after login
const extractAuthToken = () => {
  // Approach 1: Read cookies
  const cookies = document.cookie;
  const sessionToken = cookies.split('; ')
    .find(c => c.startsWith('sessionKey='))
    ?.split('=')[1];

  // Approach 2: Intercept localStorage/sessionStorage
  const authData = localStorage.getItem('auth');

  // Send back to main process
  window.electronAPI.sendAuthToken(sessionToken || authData);
}
```

**Build priority:** HIGH (critical path for functionality)

### 3. Popup Window (Renderer Process)

**Technology:** HTML/CSS/JavaScript rendered in browser context
**Lifecycle:** Created on tray click, destroyed on blur/close
**Visibility:** Shown on-demand, positioned near tray icon

**Responsibilities:**
- Display rate limit data with progress bars
- Show reset countdowns
- Provide manual refresh button
- Handle settings/logout actions

**UI Structure:**
```
┌─────────────────────────────────┐
│   Claude.ai Usage Monitor       │
├─────────────────────────────────┤
│ Session Messages:         █████ │
│ 45 / 50 used                    │
│ Resets in: 2h 34m               │
├─────────────────────────────────┤
│ Weekly (All Models):      ████  │
│ 450 / 1000 used                 │
│ Resets: Mon Jan 29, 12:00       │
├─────────────────────────────────┤
│ Weekly (Sonnet):          ██    │
│ 120 / 500 used                  │
│ Resets: Mon Jan 29, 12:00       │
├─────────────────────────────────┤
│ Last updated: 2m ago            │
│ [Refresh Now]        [Settings] │
└─────────────────────────────────┘
```

**Data binding pattern:**
- Main Process pushes state updates via IPC
- Popup subscribes to state changes
- Reactive rendering (vanilla JS or lightweight framework)

**Positioning strategy:**
```typescript
const positionPopup = (trayBounds: Rectangle) => {
  const popupWidth = 300;
  const popupHeight = 400;

  // Position above or below tray icon based on screen position
  const x = trayBounds.x - (popupWidth / 2) + (trayBounds.width / 2);
  const y = trayBounds.y < screenHeight / 2
    ? trayBounds.y + trayBounds.height
    : trayBounds.y - popupHeight;

  return { x, y, width: popupWidth, height: popupHeight };
}
```

**Build priority:** MEDIUM (visual feedback, but not critical path)

## Data Flow Diagrams

### Flow 1: Initial Authentication

```
User launches app
    ↓
Main Process starts → State Manager loads persisted state
    ↓
Auth Manager checks for valid token
    ↓
No valid token found
    ↓
Auth Manager creates Auth Window (hidden)
    ↓
Auth Window loads Claude.ai login
    ↓
User completes login in browser
    ↓
Auth Window detects page load completion
    ↓
Inject token extraction script
    ↓
Send token to Auth Manager via IPC
    ↓
Auth Manager validates token
    ↓
State Manager persists token
    ↓
Data Fetcher starts polling
    ↓
Tray icon appears (gray → color based on first fetch)
```

### Flow 2: Background Data Fetch

```
Polling interval triggers
    ↓
Data Fetcher retrieves auth token from State Manager
    ↓
HTTP GET to Claude.ai API with auth headers
    ↓
Response received (rate limit JSON)
    ↓
Parse response into RateLimitData structure
    ↓
State Manager updates rate limits
    ↓
Calculate most limiting status (red/yellow/green)
    ↓
Notify System Tray Integration
    ↓
Update tray icon color
    ↓
If Popup is open → Push update to Popup Window
```

### Flow 3: User Interaction (Click Tray)

```
User clicks tray icon
    ↓
System Tray Integration receives click event
    ↓
Check if Popup Window exists
    ↓
If exists → Destroy popup (toggle behavior)
If not exists → Create Popup Window
    ↓
Position popup near tray icon
    ↓
Popup Window loads HTML/CSS
    ↓
Request current state from State Manager
    ↓
State Manager sends RateLimitData via IPC
    ↓
Popup renders progress bars and countdowns
    ↓
Start countdown timers (client-side)
    ↓
Subscribe to state updates
    ↓
User clicks "Refresh Now"
    ↓
Send refresh command to Main Process
    ↓
Data Fetcher executes immediate fetch
    ↓
Updated data flows back to Popup
```

### Flow 4: Manual Refresh

```
User clicks "Refresh Now" in popup
    ↓
Popup sends IPC message to Main Process
    ↓
Data Fetcher cancels scheduled fetch (if in progress)
    ↓
Execute immediate fetch
    ↓
Follow normal data fetch flow
    ↓
Update popup with fresh data
    ↓
Reset "Last updated" timestamp
```

## Technology Stack Recommendations

### Platform Framework

**Recommended: Electron**

| Aspect | Rationale |
|--------|-----------|
| Cross-platform | Future macOS/Linux support if needed |
| Browser integration | Built-in Chromium for auth flow |
| System tray API | First-class support via `Tray` API |
| IPC | Well-established main/renderer communication |
| Packaging | Auto-updater, installers, code signing |

**Alternative: Native C# + WebView2**

| Aspect | Rationale |
|--------|-----------|
| Performance | Lower memory footprint |
| Windows-native | Better OS integration |
| Complexity | More complex auth window management |

**Recommendation:** Electron for rapid development and built-in browser auth capabilities.

### HTTP Client

**Recommended: axios or node-fetch**

```typescript
// Main Process
import axios from 'axios';

const fetchRateLimits = async (authToken: string) => {
  const response = await axios.get('https://claude.ai/api/usage', {
    headers: {
      'Cookie': `sessionKey=${authToken}`,
      'User-Agent': 'ClaudeUsageMonitor/1.0'
    }
  });
  return response.data;
}
```

### State Management

**Recommended: Custom EventEmitter-based store**

```typescript
import { EventEmitter } from 'events';

class StateStore extends EventEmitter {
  private state: AppState;

  updateRateLimits(data: RateLimitData) {
    this.state.rateLimits = data;
    this.emit('rate-limits-updated', data);
    this.persist();
  }

  private persist() {
    fs.writeFileSync(this.statePath, JSON.stringify(this.state));
  }
}
```

**Alternative:** Redux (if complexity grows)

### Popup UI

**Recommended: Vanilla HTML/CSS/JS**

For a simple 3-progress-bar UI, avoid framework overhead.

**Alternative:** Preact/SolidJS if adding complex interactions later.

## Architecture Patterns to Follow

### Pattern 1: Process Separation

**What:** Separate background logic (main process) from UI rendering (renderer processes)

**Why:**
- Security: Renderer processes run with restricted permissions
- Responsiveness: UI freezes don't block background tasks
- Stability: Renderer crashes don't kill the app

**Implementation:**
```typescript
// main.ts
const app = new App({
  mainProcess: {
    authManager: new AuthManager(),
    dataFetcher: new DataFetcher(),
    trayManager: new TrayManager()
  }
});

// popup.ts (renderer)
window.electronAPI.onRateLimitUpdate((data) => {
  renderProgressBars(data);
});
```

### Pattern 2: IPC Message Contracts

**What:** Strictly typed IPC messages between main and renderer

**Why:** Type safety, clear contracts, easier debugging

**Implementation:**
```typescript
// preload.ts (context bridge)
contextBridge.exposeInMainWorld('electronAPI', {
  // Main → Renderer
  onRateLimitUpdate: (callback: (data: RateLimitData) => void) =>
    ipcRenderer.on('rate-limits-updated', (_, data) => callback(data)),

  // Renderer → Main
  requestRefresh: () => ipcRenderer.send('fetch-now'),
  openSettings: () => ipcRenderer.send('open-settings')
});
```

### Pattern 3: Single Source of Truth

**What:** State Manager is the only authoritative source for app state

**Why:** Prevents state synchronization bugs, simplifies debugging

**Implementation:**
- All components read from State Manager
- All components write through State Manager
- No component-local state that affects other components

### Pattern 4: Graceful Degradation

**What:** App remains functional even when parts fail

**Why:** Network errors, auth failures shouldn't crash the app

**Implementation:**
```typescript
// Data Fetcher
try {
  const data = await fetchRateLimits(token);
  stateManager.updateRateLimits(data);
} catch (error) {
  if (error.status === 401) {
    // Auth failed → trigger re-login
    authManager.logout();
    authManager.initiateLogin();
  } else {
    // Network error → show stale data, retry later
    trayManager.showErrorIcon();
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Polling from Renderer Process

**What:** Running setInterval in popup window to fetch data

**Why bad:**
- Window closes → polling stops
- Multiple windows → duplicate requests
- Can't access auth token from renderer (security)

**Instead:** Always poll from Main Process, push updates to renderer

### Anti-Pattern 2: Storing Auth Token in Renderer

**What:** Passing auth token to popup window for "Refresh" button

**Why bad:**
- Security risk (renderer is less trusted)
- Token exposure via DevTools
- Violates separation of concerns

**Instead:** Send "refresh" command to Main Process, let it handle auth

### Anti-Pattern 3: Synchronous File I/O in Main Process

**What:** Using `fs.readFileSync()` for state persistence

**Why bad:**
- Blocks event loop
- Freezes tray icon updates
- Poor user experience

**Instead:** Use async file operations or in-memory state with debounced writes

### Anti-Pattern 4: Hardcoded API Endpoints

**What:** `fetch('https://claude.ai/api/usage')`

**Why bad:**
- Endpoint changes require app updates
- Can't test against staging environment
- No fallback for API changes

**Instead:** Configuration file with endpoint URLs, version detection

### Anti-Pattern 5: Window-based Authentication State

**What:** Checking if auth window is open to determine auth status

**Why bad:**
- Window lifecycle ≠ auth lifecycle
- Race conditions during window close
- Can't persist auth across restarts

**Instead:** Store auth status in State Manager, window is just a UI tool

## Build Order & Dependencies

### Phase 1: Foundation (Week 1)

**Goal:** Basic app skeleton with tray icon

```
1. Project setup (Electron + TypeScript)
2. State Manager implementation
   - In-memory store
   - Event emitter pattern
   - File persistence
3. System Tray Integration
   - Static icon (no color changes yet)
   - Click handler (log only)
4. Basic popup window
   - Static HTML
   - Show/hide on tray click
```

**Deliverable:** App launches, shows tray icon, opens blank popup

### Phase 2: Authentication (Week 2)

**Goal:** Browser login flow with token extraction

```
1. Auth Manager component
   - Create/destroy auth window
   - Navigate to Claude.ai login
2. Token extraction strategy
   - Research Claude.ai auth mechanism
   - Implement extraction script
3. Token persistence
   - Store in State Manager
   - Validate on startup
4. Auth UI in popup
   - "Login" button if not authenticated
   - "Logout" button if authenticated
```

**Deliverable:** User can log in via browser, token persisted

### Phase 3: Data Fetching (Week 3)

**Goal:** Fetch and display rate limit data

```
1. API endpoint discovery
   - Inspect Claude.ai network requests
   - Document rate limit response format
2. Data Fetcher implementation
   - HTTP client with auth headers
   - Response parsing
   - Error handling
3. State Manager integration
   - Update rate limit state
   - Calculate status colors
4. Popup data binding
   - Display rate limit numbers
   - Basic progress bars
```

**Deliverable:** Popup shows real rate limit data

### Phase 4: Polish & Background Sync (Week 4)

**Goal:** Automatic updates and visual polish

```
1. Polling implementation
   - Configurable interval
   - Background scheduling
2. Tray icon color updates
   - Green/yellow/red based on limits
   - Generate/load icon assets
3. Countdown timers
   - Calculate time until reset
   - Update every minute in popup
4. Manual refresh
   - "Refresh Now" button
   - Immediate fetch
```

**Deliverable:** Fully functional app with auto-updates

### Dependency Graph

```
State Manager (no dependencies)
    ↓
    ├─→ System Tray Integration
    │       ↓
    │   Popup Window (basic)
    │
    ├─→ Auth Manager
    │       ↓
    │   Auth Window
    │       ↓
    │   Token Persistence
    │
    └─→ Data Fetcher (depends on Auth)
            ↓
        Rate Limit Display in Popup
            ↓
        Tray Icon Color Updates
            ↓
        Background Polling
```

## Scalability Considerations

| Concern | At Launch | Future Enhancement |
|---------|-----------|-------------------|
| **Multiple accounts** | Single account | Account switcher in popup |
| **Data history** | Current state only | SQLite for historical trends |
| **Notifications** | None (per spec) | Optional toast for red status |
| **Rate limit types** | 3 hardcoded limits | Dynamic limit discovery from API |
| **Refresh rate** | Fixed 5min interval | Adaptive based on usage patterns |
| **API changes** | Hardcoded parsing | Schema validation + graceful fallback |

## Security Considerations

### Token Storage

**Risk:** Auth tokens stored in plaintext JSON

**Mitigation:**
- Use OS keychain (Windows Credential Manager via `keytar`)
- Encrypt state file with machine-specific key
- Set restrictive file permissions

```typescript
import keytar from 'keytar';

const storeToken = async (token: string) => {
  await keytar.setPassword('claude-usage-monitor', 'auth-token', token);
}

const getToken = async (): Promise<string | null> => {
  return await keytar.getPassword('claude-usage-monitor', 'auth-token');
}
```

### Renderer Process Isolation

**Risk:** Popup window could be compromised via XSS

**Mitigation:**
- Enable `contextIsolation: true` in BrowserWindow
- Disable `nodeIntegration`
- Use preload script for controlled IPC exposure

```typescript
const popupWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js')
  }
});
```

### Network Request Validation

**Risk:** MITM attacks on API requests

**Mitigation:**
- HTTPS only (reject HTTP)
- Certificate pinning for claude.ai (optional)
- Validate response schema before processing

## Testing Strategy

### Unit Tests

- State Manager: State transitions, persistence, observers
- Data Fetcher: Response parsing, error handling
- Auth Manager: Token validation, expiry detection

### Integration Tests

- Main Process ↔ Renderer IPC communication
- Auth flow end-to-end (with mock Claude.ai server)
- Polling behavior over time

### Manual Testing Checklist

- [ ] Login flow with valid credentials
- [ ] Login flow with invalid credentials
- [ ] Token persistence across restarts
- [ ] Data fetch with valid token
- [ ] Data fetch with expired token (re-auth)
- [ ] Tray icon color matches most limiting limit
- [ ] Popup displays all 3 rate limits correctly
- [ ] Countdown timers update in real-time
- [ ] Manual refresh updates data immediately
- [ ] App handles network offline gracefully

## Open Questions & Research Gaps

**MEDIUM confidence areas (need verification during implementation):**

1. **Claude.ai API endpoint for rate limits**
   - Assumption: Endpoint exists and returns JSON
   - Reality: May need to scrape HTML or reverse-engineer API
   - Mitigation: Phase 3 includes API discovery step

2. **Token extraction mechanism**
   - Assumption: Can read cookies or localStorage
   - Reality: May use httpOnly cookies (not accessible via JavaScript)
   - Mitigation: Have fallback plan to intercept network requests

3. **Rate limit reset time format**
   - Assumption: API returns ISO timestamp
   - Reality: May return relative time or implicit rolling window
   - Mitigation: Handle multiple time formats during parsing

4. **Session token expiry**
   - Assumption: Tokens expire and need refresh
   - Reality: Unknown expiry duration or refresh mechanism
   - Mitigation: Implement re-auth on 401 responses

**LOW confidence areas (based on training data, not current docs):**

- Electron Tray API specifics (need to verify with Electron 2026 docs)
- Windows-specific tray icon positioning
- WebView2 vs Electron tradeoffs (not thoroughly researched)

## Conclusion

The recommended architecture separates concerns across 6 major components:

1. **State Manager** - Central state store (build first)
2. **System Tray Integration** - OS-level UI (build second)
3. **Auth Manager** - Login flow orchestration (build third)
4. **Auth Window** - Browser-based login (build with Auth Manager)
5. **Data Fetcher** - Background polling (build fourth)
6. **Popup Window** - Data display (build last)

**Critical path:** State Manager → Auth Manager → Data Fetcher
**Parallel paths:** Popup UI can be built alongside Data Fetcher

**Primary architectural risk:** Claude.ai API reverse-engineering may require iteration during Phase 3.

**Recommended first milestone:** Phase 1 + Phase 2 (functional auth flow) before committing to full build.
