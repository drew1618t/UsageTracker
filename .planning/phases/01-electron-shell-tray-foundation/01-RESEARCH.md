# Phase 1: Electron Shell + Tray Foundation - Research

**Researched:** 2026-01-27
**Domain:** Electron system tray applications with React + TypeScript
**Confidence:** HIGH

## Summary

This research covers the implementation of an Electron application with a persistent system tray icon, single instance enforcement, and popup window positioning. The phase focuses on Windows platform with requirements for Explorer restart survival and basic tray interactions.

The standard approach uses Electron's native Tray API with GUID parameter for persistent tray icons, BrowserWindow for popup windows positioned via getBounds(), and app.requestSingleInstanceLock() for single instance enforcement. The application structure follows the three-process model (main/preload/renderer) with IPC communication secured through contextBridge.

For Windows Explorer restart handling, the native TaskbarCreated message should be monitored via Win32 API (requires native addon) or the app can rely on Electron's internal handling which automatically recreates tray icons on some Electron versions. Based on the phase requirements and complexity, initial implementation can use Electron's default behavior with manual testing to verify persistence.

**Primary recommendation:** Use Electron's native Tray API with GUID parameter, implement invoke/handle IPC pattern for secure communication, and create frameless BrowserWindow positioned near tray using getBounds(). Defer native addon development for TaskbarCreated handling unless testing reveals persistence issues.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron | ~33.x | Desktop application framework | Latest stable release, required for Tray API and app lifecycle |
| react | ~18.3.x | UI framework for renderer | Industry standard for component-based UI |
| typescript | ~5.6.x | Type safety | Essential for large Electron projects, prevents IPC contract errors |
| vite | ~6.x | Build tool and dev server | Fast HMR, better DX than webpack for Electron |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-vite | Latest | Electron-specific Vite configuration | Recommended - handles three-process build automatically |
| electron-builder | Latest | Application packaging | For building distributable .exe with proper icon resources |
| electron-traywindow-positioner | ^1.3.0 | Window positioning near tray | Use if manual getBounds() calculation proves complex |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-traywindow-positioner | Manual positioning with getBounds() | Manual gives more control but requires platform-specific offset calculation |
| electron-vite | electron-forge or electron-webpack | electron-vite has better Vite integration and simpler config for this use case |
| Native addon for TaskbarCreated | Electron's default behavior | Native addon adds complexity; test Electron's default first |

**Installation:**
```bash
npm install electron@~33 react@~18.3 react-dom@~18.3 typescript@~5.6 vite@~6
npm install -D electron-vite electron-builder @types/react @types/react-dom
npm install -D electron-traywindow-positioner  # Optional, install if needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/              # Main process (Node.js + Electron APIs)
│   ├── index.ts       # App entry, tray creation, IPC handlers
│   ├── tray.ts        # Tray management logic
│   └── window.ts      # BrowserWindow creation and positioning
├── preload/           # Preload scripts (secure IPC bridge)
│   └── index.ts       # contextBridge API exposure
├── renderer/          # React UI (no Node.js access)
│   ├── src/
│   │   ├── App.tsx    # Main React component
│   │   ├── main.tsx   # React entry point
│   │   └── ...
│   └── index.html     # HTML entry point
└── assets/
    └── icons/         # Tray icon files (16x16, 32x32@2x .png or .ico)
        ├── tray.ico   # Windows tray icon
        ├── tray@2x.png
        └── ...
```

### Pattern 1: Persistent Tray Icon with GUID
**What:** Create Tray instance with GUID parameter to persist position across app restarts
**When to use:** Always for production tray applications on Windows
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/tray
import { app, Tray, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;  // Global reference prevents garbage collection

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, '../assets/icons/tray.ico');
  const icon = nativeImage.createFromPath(iconPath);

  // GUID ensures persistent positioning (Windows)
  // Use a unique UUID for your app - this is just an example
  tray = new Tray(icon, 'your-app-guid-e8f7d6c5-b4a3-9281-7060-5040302010');

  tray.setToolTip('Your App Name');
  tray.setContextMenu(/* Menu instance */);

  tray.on('click', () => {
    // Show popup window positioned near tray
  });
});

// Prevent app quit when all windows closed (keep tray alive)
app.on('window-all-closed', (e) => {
  e.preventDefault();
});
```

### Pattern 2: Secure IPC with invoke/handle
**What:** Two-way communication from renderer to main using Promise-based invoke/handle
**When to use:** Any renderer-initiated action requiring main process response
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc

// Main process (src/main/index.ts)
import { ipcMain } from 'electron';

ipcMain.handle('get-app-info', async () => {
  return {
    name: app.getName(),
    version: app.getVersion()
  };
});

// Preload script (src/preload/index.ts)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});

// Renderer (src/renderer/src/App.tsx)
declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<{ name: string; version: string }>;
    };
  }
}

const info = await window.electronAPI.getAppInfo();
```

### Pattern 3: Window Positioning Near Tray
**What:** Position BrowserWindow popup near tray icon using getBounds()
**When to use:** For tray popup windows that should appear near the tray icon
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/tray

import { BrowserWindow, screen } from 'electron';

function showPopupWindow(tray: Tray) {
  const trayBounds = tray.getBounds();
  const windowWidth = 400;
  const windowHeight = 600;

  // Get primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Position window near tray (typically bottom-right on Windows)
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowWidth / 2));
  const y = Math.round(trayBounds.y - windowHeight);

  // Ensure window stays on screen
  const finalX = Math.max(0, Math.min(x, screenWidth - windowWidth));
  const finalY = Math.max(0, Math.min(y, screenHeight - windowHeight));

  const popupWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: finalX,
    y: finalY,
    show: false,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  popupWindow.once('ready-to-show', () => {
    popupWindow.show();
  });

  // Load renderer
  popupWindow.loadFile(/* or loadURL */);
}
```

### Pattern 4: Single Instance Lock
**What:** Prevent multiple app instances using requestSingleInstanceLock()
**When to use:** Always for tray applications to prevent multiple tray icons
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app

import { app } from 'electron';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is running, quit this one
  app.quit();
} else {
  // Listen for second instance attempts
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Create window, initialize app...
  app.whenReady().then(() => {
    createTray();
  });
}
```

### Pattern 5: Dynamic Tray Icon Colors
**What:** Change tray icon based on application state (green/yellow/red)
**When to use:** Visual status indication without opening the app
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/tray

function updateTrayIcon(status: 'green' | 'yellow' | 'red') {
  if (!tray) return;

  const iconPath = path.join(__dirname, `../assets/icons/tray-${status}.ico`);
  const icon = nativeImage.createFromPath(iconPath);
  tray.setImage(icon);

  // Also update tooltip with status
  tray.setToolTip(`App Status: ${status.toUpperCase()}`);
}

// Call when state changes
updateTrayIcon('yellow');
```

### Anti-Patterns to Avoid
- **Garbage Collection Loss:** Not keeping global reference to Tray instance causes icon to disappear unpredictably
- **Click Event Only:** Relying solely on click events without context menu breaks UX on some Linux environments
- **Direct IPC Exposure:** Exposing raw ipcRenderer to renderer creates security vulnerabilities
- **nodeIntegration: true:** Enabling Node in renderer violates security model, especially if loading any web content
- **Synchronous IPC:** Using sendSync blocks UI; always prefer async invoke/handle pattern
- **No ready-to-show:** Showing BrowserWindow immediately causes visual flash; wait for ready-to-show event

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window positioning near tray | Custom getBounds() math for all platforms | electron-traywindow-positioner | Handles platform differences (taskbar position, multi-monitor, DPI scaling) |
| Icon format conversion | Manual PNG to ICO/ICNS conversion | electron-icon-builder or cloudconvert | Icon requirements vary by platform; tools handle all formats and sizes |
| Single instance locking | Custom file locks or port binding | app.requestSingleInstanceLock() | Built-in, handles edge cases (user switches, crashes), provides second-instance event |
| Asset bundling in production | Manual file copying | electron-builder extraResources | Ensures assets survive packaging, handles platform-specific paths |
| IPC type safety | Manual string constants | TypeScript with shared types + zod validation | Prevents IPC contract mismatches between processes |
| Context isolation bridge | Manual postMessage | contextBridge.exposeInMainWorld | Secure, performant, officially recommended pattern |

**Key insight:** Electron's built-in APIs (Tray, app.requestSingleInstanceLock, contextBridge) are production-tested across millions of apps. Custom implementations often miss platform edge cases, especially on Windows (Explorer restart, DPI changes, taskbar positioning). Use native solutions first; only customize if testing reveals gaps.

## Common Pitfalls

### Pitfall 1: Tray Icon Disappears After Garbage Collection
**What goes wrong:** Tray icon vanishes randomly during app runtime, especially after window operations or longer idle periods.
**Why it happens:** JavaScript garbage collector destroys the Tray object when no reference exists. Creating tray in function scope without storing globally causes this.
**How to avoid:** Store Tray instance in module-level variable outside any function scope:
```typescript
let tray: Tray | null = null;  // Module scope, persists

app.whenReady().then(() => {
  tray = new Tray(icon);  // Assign to persistent variable
});
```
**Warning signs:** Icon disappears unpredictably, especially when no windows are open or after GC runs.

### Pitfall 2: App Quits When Windows Close
**What goes wrong:** Closing the popup window quits the entire app, removing tray icon.
**Why it happens:** Electron's default behavior quits app when all windows close (mimicking normal desktop apps). Tray apps need to stay running.
**How to avoid:** Prevent default quit behavior:
```typescript
app.on('window-all-closed', (e) => {
  e.preventDefault();  // Don't quit, keep tray alive
});
```
**Warning signs:** Tray icon disappears when closing windows; app terminates unexpectedly.

### Pitfall 3: Menu Items Don't Update on Linux
**What goes wrong:** Dynamically changing MenuItem properties (enabled, checked, label) doesn't reflect in context menu on Linux.
**Why it happens:** Linux StatusNotifierItem spec requires re-setting entire menu after changes.
**How to avoid:** Call setContextMenu() again after modifying menu items:
```typescript
menuItem.checked = !menuItem.checked;
tray.setContextMenu(menu);  // Required on Linux
```
**Warning signs:** Menu changes work on Windows/Mac but not Linux.

### Pitfall 4: Security - Direct IPC Exposure
**What goes wrong:** Security audit tools flag exposed Node APIs; potential for renderer compromise if any web content loaded.
**Why it happens:** Exposing ipcRenderer directly to renderer allows arbitrary IPC calls, bypassing intended restrictions.
**How to avoid:** Wrap specific operations in named methods via contextBridge:
```typescript
// BAD
contextBridge.exposeInMainWorld('api', { ipcRenderer });

// GOOD
contextBridge.exposeInMainWorld('api', {
  refreshData: () => ipcRenderer.invoke('refresh')
});
```
**Warning signs:** Security scanners flag exposed Node APIs; code review identifies direct ipcRenderer exposure.

### Pitfall 5: Windows Explorer Restart Loses Tray Icon
**What goes wrong:** Tray icon disappears after Windows Explorer restarts (crash, manual restart, DPI change).
**Why it happens:** Windows destroys all notification area icons when Explorer restarts; apps must listen for TaskbarCreated message and recreate icons.
**How to avoid:** Electron may handle this automatically in recent versions, but for guaranteed persistence, implement TaskbarCreated listener (requires native addon or test Electron's internal handling first). For Phase 1, test default behavior; if icons persist, no additional work needed. If they don't, defer native addon to later phase.
**Warning signs:** Tray icon missing after Explorer restart; users report "icon disappeared after update."

### Pitfall 6: Icon Appears Grainy on High-DPI Displays
**What goes wrong:** Tray icon looks pixelated on retina/4K displays.
**Why it happens:** Missing @2x image or incorrect DPI (should be 144dpi for @2x).
**How to avoid:** Provide both standard and @2x images:
```typescript
// Windows: Use .ico with multiple sizes (16x16, 32x32)
// macOS: Use Template.png suffix, provide @2x at 144dpi
const icon = nativeImage.createFromPath('tray.ico');  // .ico includes all sizes
```
**Warning signs:** Icon looks blurry on high-DPI monitors; users with 4K displays report poor quality.

### Pitfall 7: Window Flashes on Show
**What goes wrong:** White flash or incomplete UI appears briefly when showing popup window.
**Why it happens:** BrowserWindow.show() called before content finishes rendering.
**How to avoid:** Use show: false in constructor, then show on ready-to-show:
```typescript
const win = new BrowserWindow({ show: false });
win.once('ready-to-show', () => win.show());
```
**Warning signs:** Brief white flash when opening popup; incomplete UI visible momentarily.

## Code Examples

Verified patterns from official sources:

### Creating Context Menu
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/tray

import { Menu, MenuItem } from 'electron';

function createContextMenu(): Menu {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Refresh',
      click: () => {
        // Trigger refresh action via IPC or direct call
      }
    },
    {
      label: 'Settings',
      click: () => {
        // Open settings window
      }
    },
    {
      label: 'Login',
      enabled: !isLoggedIn,  // Dynamic state
      click: () => {
        // Open login window
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      }
    }
  ]);

  return menu;
}

// Apply to tray
tray.setContextMenu(createContextMenu());

// Update menu when state changes
function updateMenu() {
  tray.setContextMenu(createContextMenu());  // Rebuild with new state
}
```

### Main Process IPC Handler Setup
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc

import { ipcMain } from 'electron';

// Two-way: renderer calls, main responds
ipcMain.handle('app:get-version', async () => {
  return app.getVersion();
});

// One-way: renderer sends, main acts
ipcMain.on('tray:update-tooltip', (event, tooltip: string) => {
  if (tray) {
    tray.setToolTip(tooltip);
  }
});

// Main to renderer: send updates
function notifyRenderer(message: string) {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    win.webContents.send('main:notification', message);
  });
}
```

### Preload Script with Security
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/context-isolation

import { contextBridge, ipcRenderer } from 'electron';

// Expose only necessary APIs, never raw ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Two-way with Promise
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // One-way send
  updateTooltip: (tooltip: string) =>
    ipcRenderer.send('tray:update-tooltip', tooltip),

  // Listen to main events (filtered to prevent IpcRendererEvent exposure)
  onNotification: (callback: (message: string) => void) => {
    ipcRenderer.on('main:notification', (_event, message) => callback(message));
  },

  // Cleanup listener
  removeNotificationListener: () => {
    ipcRenderer.removeAllListeners('main:notification');
  }
});
```

### electron-builder Configuration for Tray Assets
```json
// Source: https://www.electron.build/configuration.html

{
  "build": {
    "appId": "com.yourcompany.appname",
    "productName": "Your App Name",
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "extraResources": [
      {
        "from": "assets/icons/",
        "to": "icons/",
        "filter": ["**/*.png", "**/*.ico"]
      }
    ],
    "files": [
      "dist/**/*",
      "package.json"
    ]
  }
}
```

Access extraResources in production:
```typescript
import path from 'path';
import { app } from 'electron';

function getIconPath(name: string): string {
  if (app.isPackaged) {
    // Production: extraResources are in resources/icons/
    return path.join(process.resourcesPath, 'icons', name);
  } else {
    // Development: direct path
    return path.join(__dirname, '../assets/icons', name);
  }
}

const iconPath = getIconPath('tray.ico');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ipcRenderer.sendSync | ipcRenderer.invoke/ipcMain.handle | Electron 7+ (2019) | Async prevents UI blocking; Promise-based ergonomics |
| Remote module | contextBridge + IPC | Electron 14 (2021, deprecated) | Security: eliminates direct main process access from renderer |
| nodeIntegration: true | contextIsolation: true with preload | Default since Electron 12 (2021) | Security: prevents renderer from accessing Node APIs directly |
| webpack | Vite + electron-vite | ~2022-2023 | DX: much faster HMR, simpler config for Electron's three processes |
| Manual positioning | electron-traywindow-positioner | Library active since 2016 | Handles platform-specific positioning edge cases |
| Manual GUID generation | UUID v4 in Tray constructor | Electron 13+ (2021) | Persistent tray position survives path changes (signed apps) |

**Deprecated/outdated:**
- **Remote module** (removed Electron 14): Previously allowed direct main process access from renderer; security nightmare. Replace with explicit IPC.
- **nodeIntegration: true**: Deprecated for security; all new apps should use contextIsolation + contextBridge.
- **BrowserWindow.addTabbedWindow()**: Removed; use BrowserWindow with parent option instead.
- **electron-builder's electron-download-tf**: Use electron-download directly.

## Open Questions

Things that couldn't be fully resolved:

1. **Windows Explorer Restart - Electron Internal Handling**
   - What we know: Windows broadcasts TaskbarCreated message when Explorer restarts; apps should listen and recreate tray icons. Native Win32 apps use RegisterWindowMessage + WM_MESSAGE handling.
   - What's unclear: Electron's internal behavior for handling TaskbarCreated automatically. Some sources suggest recent Electron versions may handle this internally, but no official documentation confirms version-specific behavior.
   - Recommendation:
     - Phase 1: Test default Electron behavior (no custom handling). Kill Explorer.exe, restart, verify tray icon reappears.
     - If tray persists: No additional work needed.
     - If tray disappears: Defer to later phase (requires native Node addon with Win32 API binding for RegisterWindowMessage/DefWindowProc).
     - **Action**: Include test case in verification: "Tray icon persists after Explorer restart."

2. **electron-traywindow-positioner Maintenance Status**
   - What we know: electron-positioner (2,246 weekly downloads) shows "Inactive" maintenance with no updates in 12+ months. electron-traywindow-positioner is similar but tray-specific.
   - What's unclear: Whether these packages work correctly with Electron 33.x; risk of breaking changes.
   - Recommendation:
     - Implement manual positioning first using Tray.getBounds() + screen API (verified pattern above).
     - If positioning proves complex (multi-monitor, DPI scaling edge cases), evaluate electron-traywindow-positioner with testing.
     - Manual approach gives full control and avoids unmaintained dependency risk.

3. **Color-Coded Icon Generation Strategy**
   - What we know: Need three icon states (green, yellow, red) for usage levels. setImage() changes icon dynamically.
   - What's unclear: Best approach for Phase 1 - pre-generate three static .ico files, or dynamically color icons at runtime?
   - Recommendation:
     - Phase 1: Pre-generate three static .ico files (tray-green.ico, tray-yellow.ico, tray-red.ico) using design tool or electron-icon-builder.
     - Place in assets/icons/, include via extraResources.
     - Use setImage() to swap (verified pattern above).
     - Defer dynamic generation (nativeImage.toPNG() + color manipulation) unless static icons prove inflexible.
     - **Note**: Static icons are simpler, faster, and easier to test for Phase 1. Dynamic generation adds complexity without clear benefit at this stage.

## Sources

### Primary (HIGH confidence)
- Electron Tray API: https://www.electronjs.org/docs/latest/api/tray
- Electron Tray Tutorial: https://www.electronjs.org/docs/latest/tutorial/tray
- Electron App API (single instance): https://www.electronjs.org/docs/latest/api/app
- Electron IPC Tutorial: https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron BrowserWindow API: https://www.electronjs.org/docs/latest/api/browser-window
- Electron Process Model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron Context Isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- Microsoft Windows Taskbar Documentation: https://learn.microsoft.com/en-us/windows/win32/shell/taskbar

### Secondary (MEDIUM confidence)
- electron-builder Configuration: https://www.electron.build/configuration.html
- electron-builder Icons: https://www.electron.build/icons.html
- electron-vite Documentation: https://electron-vite.org/guide/
- electron-traywindow-positioner npm: https://www.npmjs.com/package/electron-traywindow-positioner
- Creating Tray Applications with Electron (Don't Panic Labs): https://dontpaniclabs.com/blog/post/2022/11/03/creating-tray-applications-with-electron/

### Tertiary (LOW confidence - WebSearch only, marked for validation)
- Various GitHub issues demonstrating real-world tray patterns and Explorer restart handling
- Community blogs on Electron + React + Vite structure (2025-2026)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Electron docs, verified npm versions, widely adopted stack
- Architecture: HIGH - Official Electron tutorials and API documentation with code examples
- Pitfalls: HIGH - Documented in official Electron docs, GitHub issues show real-world occurrences
- Windows Explorer restart handling: MEDIUM - Win32 API confirmed in Microsoft docs, but Electron's internal behavior for TaskbarCreated not officially documented. Requires testing.
- Window positioning libraries: MEDIUM - npm packages exist but maintenance unclear; manual approach verified in official docs

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - Electron is stable with quarterly releases; Vite/React change slowly)
