# Phase 2: Browser Authentication - Research

**Researched:** 2026-01-28
**Domain:** Electron browser authentication and session management
**Confidence:** MEDIUM-HIGH

## Summary

Browser authentication in Electron apps requires coordinating three components: opening the system browser for login, detecting when authentication succeeds, and persisting session cookies across app restarts. The standard approach uses `shell.openExternal()` to open Claude.ai in the user's default browser, then either custom protocol handlers (deep-linking) or cookie polling to detect login completion. Session persistence uses Electron's built-in persistent partitions, but requires converting session cookies to persistent ones with expiration dates because Chromium clears session cookies by design when apps close.

The key architectural decision is choosing between deep-linking (custom protocol handler) and cookie polling for callback detection. Deep-linking is more robust but requires OS-level protocol registration and handling platform differences (macOS `open-url` event vs Windows/Linux `second-instance` event). Cookie polling is simpler but requires careful timing and may miss rapid logins.

**Primary recommendation:** Use `shell.openExternal()` to open Claude.ai login in the system browser, implement cookie polling with the `cookies.on('changed')` event listener for detecting authentication, and use a persistent partition (`persist:main`) with manual session cookie conversion for persistence across restarts.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 40.0.0 | Desktop framework | Built-in session and cookie APIs |
| shell.openExternal | Built-in | Open system browser | Delegates to OS, security-approved pattern |
| session.fromPartition | Built-in | Persistent storage | Native Chromium cookie storage |
| Cookies API | Built-in | Cookie management | Native access to Chromium cookie store |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| app.setAsDefaultProtocolClient | Built-in | Custom protocol registration | If using deep-linking for OAuth callback |
| app.requestSingleInstanceLock | Built-in | Single instance enforcement | Required for deep-linking on Windows/Linux |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shell.openExternal | BrowserWindow with loadURL | Embedded browser gives more control but violates RFC8252 OAuth best practices for native apps |
| Cookie polling | Deep-linking with custom protocol | Deep-linking is more robust but adds complexity with protocol registration and platform-specific event handling |
| Manual cookie persistence | Third-party libraries (electron-cookies) | Native APIs preferred; third-party libs add dependencies without significant benefit |

**Installation:**
```bash
# No additional packages required - all APIs are built into Electron 40.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── auth/            # Authentication module
│   │   ├── browser.ts   # shell.openExternal login trigger
│   │   ├── session.ts   # Cookie detection and persistence
│   │   └── state.ts     # Authentication state management
│   ├── window.ts        # Existing window management
│   └── tray.ts          # Existing tray management
├── preload/
│   └── index.ts         # Expose auth IPC to renderer
└── renderer/
    └── components/
        └── LoginUI.tsx  # Login button and status display
```

### Pattern 1: Browser Authentication Flow
**What:** Open system browser for login, detect success via cookie polling, persist session across restarts
**When to use:** Authenticating with third-party OAuth providers (like Claude.ai) from desktop apps
**Example:**
```typescript
// Source: Multiple official Electron docs combined
import { shell, session } from 'electron'

// 1. Trigger login - open system browser
export async function triggerLogin(): Promise<void> {
  await shell.openExternal('https://claude.ai/login')
}

// 2. Detect login success - poll for session cookie
export function startAuthDetection(onAuthSuccess: (cookies: any[]) => void): void {
  const ses = session.fromPartition('persist:main')

  // Listen for cookie changes
  ses.cookies.on('changed', async (_event, cookie, cause, removed) => {
    if (removed) return

    // Check if authentication cookie was added
    if (cookie.domain.includes('claude.ai') && cookie.name === 'sessionKey') {
      const allCookies = await ses.cookies.get({ domain: '.claude.ai' })
      onAuthSuccess(allCookies)
    }
  })
}

// 3. Persist session cookies (convert session cookies to persistent)
export async function persistSessionCookies(): Promise<void> {
  const ses = session.fromPartition('persist:main')
  const cookies = await ses.cookies.get({ domain: '.claude.ai' })

  for (const cookie of cookies) {
    // Session cookies have no expirationDate - make them persistent
    if (!cookie.expirationDate) {
      const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`
      await ses.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
      })
    }
  }
}
```

### Pattern 2: Authentication State Management
**What:** Maintain auth state in main process, expose to renderer via IPC, update tray icon
**When to use:** When multiple parts of app need to know authentication status
**Example:**
```typescript
// Source: Electron IPC best practices
// main/auth/state.ts
import { ipcMain } from 'electron'

let isAuthenticated = false
let userIdentifier: string | null = null

export function setAuthState(authenticated: boolean, identifier?: string): void {
  isAuthenticated = authenticated
  userIdentifier = identifier || null

  // Update tray icon
  updateTrayIcon(authenticated)

  // Notify all renderer windows
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('auth-state-changed', { isAuthenticated, userIdentifier })
  })
}

export function getAuthState(): { isAuthenticated: boolean; userIdentifier: string | null } {
  return { isAuthenticated, userIdentifier }
}

// Expose to renderer via preload
ipcMain.handle('auth:get-state', () => getAuthState())
ipcMain.handle('auth:login', () => triggerLogin())
ipcMain.handle('auth:logout', () => logout())
```

### Pattern 3: Deep-Linking Alternative (Optional)
**What:** Use custom protocol handler to receive OAuth callback instead of polling
**When to use:** When auth provider supports custom redirect URIs and you need immediate callback notification
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app
import { app } from 'electron'

// 1. Register protocol on startup
app.setAsDefaultProtocolClient('myapp')

// 2. Handle macOS deep links
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleAuthCallback(url)
})

// 3. Handle Windows/Linux deep links
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // commandLine is array of command line arguments
    const url = commandLine.find(arg => arg.startsWith('myapp://'))
    if (url) handleAuthCallback(url)
  })
}

// 4. Also check on first launch (Windows/Linux)
app.whenReady().then(() => {
  const url = process.argv.find(arg => arg.startsWith('myapp://'))
  if (url) handleAuthCallback(url)
})
```

### Anti-Patterns to Avoid
- **Embedded BrowserWindow for OAuth:** Opening Claude.ai in a BrowserWindow instead of system browser violates RFC8252 OAuth best practices and creates phishing risks (users can't verify the URL bar)
- **Assuming session cookies persist automatically:** Chromium clears session cookies on app close by design; must manually convert to persistent cookies
- **Using nodeIntegration with remote content:** Never load Claude.ai (or any remote site) with nodeIntegration enabled - security risk
- **Polling without debouncing:** Checking cookies every second wastes resources; use event-driven approach with `cookies.on('changed')` listener
- **Forgetting single instance lock with deep-linking:** Windows/Linux won't emit `second-instance` event without `requestSingleInstanceLock()`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie storage to disk | Custom cookie serialization/file system | Persistent partition (`persist:main`) | Chromium's native storage handles encryption, atomic writes, corruption recovery |
| Secure credential storage | Rolling your own encryption | SafeStorage API (not needed for cookies) | OS-level keychain integration, proper key management |
| Protocol URL validation | Regex checks on deep link URLs | Built-in URL parsing and validation | Edge cases like IDN homographs, encoding issues |
| Session timeout detection | Custom timer logic | Check cookie expiration dates | Cookies have built-in expiry; let Chromium handle it |

**Key insight:** Electron's session and cookie APIs are wrappers around Chromium's battle-tested implementations. Custom solutions for storage, encryption, or parsing will miss edge cases that Chromium handles. The only manual work needed is converting session cookies to persistent ones, which is a known workaround for Chromium's by-design behavior.

## Common Pitfalls

### Pitfall 1: Session Cookies Not Persisting
**What goes wrong:** App closes, session cookies are cleared, user must re-login every time despite using `persist:` partition
**Why it happens:** Session cookies (those without `expirationDate`) are designed to be cleared when the browser closes - this is Chromium's standard behavior that Electron inherits
**How to avoid:** Listen for cookie changes and convert session cookies to persistent cookies by setting an `expirationDate` (e.g., 30 days from now)
**Warning signs:** Users report "logged out every time I restart the app" even though other data persists

### Pitfall 2: Protocol in Cookie URL Mismatch
**What goes wrong:** `ses.cookies.set()` fails silently when setting secure cookies with HTTP URLs or vice versa
**Why it happens:** Setting a secure cookie requires an HTTPS URL; setting a non-secure cookie with HTTPS URL may also fail
**How to avoid:** Use `cookie.secure` flag to determine protocol: `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`
**Warning signs:** Cookie persistence code runs without errors but cookies aren't actually saved

### Pitfall 3: Partition Name with Colons (Windows)
**What goes wrong:** Persistent partition doesn't work on Windows when partition name contains colons beyond the `persist:` prefix
**Why it happens:** Recent bug in Electron 36+ specific to Windows filesystem handling
**How to avoid:** Keep partition names simple: `persist:main` not `persist:my:complex:name`
**Warning signs:** Session persistence works on macOS/Linux but fails on Windows

### Pitfall 4: shell.openExternal Security
**What goes wrong:** Malicious URLs could be passed to `shell.openExternal` from untrusted renderer content
**Why it happens:** If renderer has direct access to `shell` or you forward URLs without validation
**How to avoid:** Never expose `shell.openExternal` directly to renderer; validate URLs in main process before opening (check protocol is HTTPS, domain is Claude.ai)
**Warning signs:** Security audit flags IPC handlers that accept arbitrary URLs

### Pitfall 5: Missing Cookie Change Detection
**What goes wrong:** Polling cookies every second to detect login success, causing performance issues
**Why it happens:** Not aware of `cookies.on('changed')` event listener
**How to avoid:** Use event-driven approach with `cookies.on('changed')` to be notified immediately when auth cookies are set
**Warning signs:** High CPU usage when login window is open, delayed detection of successful login

### Pitfall 6: Deep-Linking Without Single Instance Lock
**What goes wrong:** On Windows/Linux, deep link callback URL is lost because second instance starts instead of triggering event
**Why it happens:** Without `requestSingleInstanceLock()`, OS starts a new instance instead of passing args to existing one
**How to avoid:** Call `app.requestSingleInstanceLock()` on startup and quit if lock fails
**Warning signs:** Deep-linking works inconsistently on Windows, OAuth callback seems to "do nothing"

## Code Examples

Verified patterns from official sources:

### Getting Cookies from Persistent Session
```typescript
// Source: https://www.electronjs.org/docs/latest/api/cookies
import { session } from 'electron'

async function getAuthCookies() {
  const ses = session.fromPartition('persist:main')
  const cookies = await ses.cookies.get({
    domain: '.claude.ai'
  })
  return cookies
}
```

### Listening for Cookie Changes
```typescript
// Source: https://www.electronjs.org/docs/latest/api/cookies
import { session } from 'electron'

function watchForAuthCookies() {
  const ses = session.fromPartition('persist:main')

  ses.cookies.on('changed', (event, cookie, cause, removed) => {
    console.log('Cookie changed:', {
      name: cookie.name,
      domain: cookie.domain,
      cause, // 'explicit' | 'overwrite' | 'expired' | 'evicted' | 'expired-overwrite'
      removed
    })

    if (!removed && cookie.domain.includes('claude.ai')) {
      // Authentication cookie was added or updated
      handleAuthSuccess()
    }
  })
}
```

### Converting Session Cookies to Persistent
```typescript
// Source: https://github.com/electron/electron/issues/9995
import { session } from 'electron'

async function makeSessionCookiesPersistent() {
  const ses = session.fromPartition('persist:main')
  const cookies = await ses.cookies.get({ domain: '.claude.ai' })

  for (const cookie of cookies) {
    // Session cookies lack expirationDate
    if (!cookie.expirationDate) {
      // Important: use cookie.secure to determine protocol, not httpOnly
      const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`

      await ses.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        // Make persistent with 30-day expiration
        expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
      })
    }
  }
}
```

### Opening Login in System Browser
```typescript
// Source: https://www.electronjs.org/docs/latest/api/shell
import { shell } from 'electron'

async function openLoginPage() {
  // Validate URL before opening (security best practice)
  const loginUrl = 'https://claude.ai/login'

  if (!loginUrl.startsWith('https://claude.ai')) {
    throw new Error('Invalid login URL')
  }

  await shell.openExternal(loginUrl)
}
```

### Checking Authentication State on Startup
```typescript
// Source: Combined from session and cookies APIs
import { session } from 'electron'

async function checkAuthOnStartup(): Promise<boolean> {
  const ses = session.fromPartition('persist:main')
  const cookies = await ses.cookies.get({ domain: '.claude.ai' })

  // Look for specific auth cookies (exact names depend on Claude.ai implementation)
  const hasSessionCookie = cookies.some(c =>
    c.name === 'sessionKey' || c.name === '__session' || c.name.includes('auth')
  )

  // Could also verify cookie hasn't expired
  const now = Date.now() / 1000
  const validCookies = cookies.filter(c =>
    !c.expirationDate || c.expirationDate > now
  )

  return validCookies.length > 0 && hasSessionCookie
}
```

### Updating Tray Icon for Auth State
```typescript
// Source: https://www.electronjs.org/docs/latest/api/tray
import { Tray, nativeImage } from 'electron'
import path from 'path'

let tray: Tray

function updateTrayIconForAuthState(isAuthenticated: boolean) {
  const iconName = isAuthenticated ? 'icon.png' : 'icon-gray.png'
  const iconPath = path.join(__dirname, '../../resources', iconName)
  const icon = nativeImage.createFromPath(iconPath)

  tray.setImage(icon)
  tray.setToolTip(isAuthenticated ? 'Claude Usage - Logged in' : 'Claude Usage - Not logged in')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BrowserWindow with nodeIntegration for OAuth | shell.openExternal with system browser | Electron 5.0 (2019) | Security hardening; system browser is RFC8252 compliant |
| protocol.registerFileProtocol() | protocol.handle() | Electron 25.0 (2023) | Unified modern API with Promise support |
| Manual session management | Built-in session partitions | Stable since early Electron | Native Chromium cookie storage |
| Auto-persisted session cookies | Manual conversion required | Never worked (Chromium design) | Workaround needed with cookies API |

**Deprecated/outdated:**
- `protocol.registerFileProtocol()`, `registerHttpProtocol()`, etc.: Replaced by unified `protocol.handle()` API as of Electron 25
- `enableRemoteModule: true`: Removed in Electron 14, never use for security reasons
- `nodeIntegration: true`: Should be false by default, especially with remote content
- electron-oauth2 library: Author warns "Do not use for production!" - use native APIs instead

## Open Questions

Things that couldn't be fully resolved:

1. **Claude.ai Cookie Names**
   - What we know: Claude.ai uses cookie-based authentication, session persists in browser
   - What's unclear: Exact cookie names used for session validation (likely `__session` or similar)
   - Recommendation: Inspect cookies after manual login to Claude.ai in Chrome DevTools to identify the specific cookie names; plan should include a discovery step or check for common patterns (`__session`, `sessionKey`, `auth_token`, etc.)

2. **Session Expiration Duration**
   - What we know: Claude.ai sessions expire after some period of inactivity
   - What's unclear: Exact duration (hours? days? weeks?)
   - Recommendation: Plan should include testing with different expiration scenarios; implement proactive cookie checks on app launch and before API calls

3. **User Identifier Extraction**
   - What we know: Need to display "Logged in as [identifier]" in popup
   - What's unclear: Whether user email/name is available in cookies, or requires API call to Claude.ai
   - Recommendation: Cookie polling may only confirm authentication; might need separate API call to fetch user profile after detecting successful login

4. **Deep-Linking vs Polling Trade-off**
   - What we know: Both approaches work; deep-linking is more robust but complex
   - What's unclear: Whether Claude.ai supports custom redirect URIs for OAuth or only browser-based flows
   - Recommendation: Start with cookie polling (simpler), can upgrade to deep-linking later if callback reliability becomes an issue

5. **Proactive Session Check Timing**
   - What we know: Should check cookie validity before they expire to prompt re-auth
   - What's unclear: Optimal polling interval (check on app launch? Every hour? Every API call?)
   - Recommendation: Check on app launch (startup auth detection) and before any API calls to Claude.ai; avoid background polling

## Sources

### Primary (HIGH confidence)
- [Electron Session API](https://www.electronjs.org/docs/latest/api/session) - Session persistence and partition patterns
- [Electron Cookies API](https://www.electronjs.org/docs/latest/api/cookies) - Cookie management and event listeners
- [Electron App API](https://www.electronjs.org/docs/latest/api/app) - Deep-linking with setAsDefaultProtocolClient and second-instance event
- [Electron Shell API](https://www.electronjs.org/docs/latest/api/shell) - openExternal for system browser
- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security) - Security best practices for authentication

### Secondary (MEDIUM confidence)
- [GitHub Issue #9995](https://github.com/electron/electron/issues/9995) - Session cookie persistence workaround from Electron maintainers
- [Auth0 Electron OAuth Guide](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/) - OAuth patterns for Electron apps
- [Custom Protocols and Deeplinking Blog](https://blog.bloomca.me/2025/07/20/electron-apps-custom-protocols.html) - Deep-linking implementation patterns

### Tertiary (LOW confidence - needs validation)
- Various Stack Overflow and Medium posts about Electron OAuth - Common patterns but not authoritative
- electron-oauth2 library (marked "do not use for production") - Shows patterns but not recommended for use

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs are official Electron built-ins from current docs
- Architecture: MEDIUM-HIGH - Patterns verified from official docs, but specific Claude.ai integration untested
- Pitfalls: HIGH - Based on official GitHub issues and maintainer responses
- Cookie names/timing: LOW - Claude.ai-specific details need testing

**Research date:** 2026-01-28
**Valid until:** 2026-03-28 (60 days - Electron APIs are stable, but Claude.ai implementation may change)
