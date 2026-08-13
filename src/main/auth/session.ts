import { session } from 'electron'

const CLAUDE_DOMAIN = '.claude.ai'
const COOKIE_EXPIRY_DAYS = 30

let ses: Electron.Session

/**
 * Initialize session with cookie change listener
 * @param onAuthSuccess Callback when auth cookies are detected
 */
export function initSession(onAuthSuccess: () => void): void {
  ses = session.fromPartition('persist:main')

  // Listen for cookie changes
  ses.cookies.on('changed', async (_event, cookie, _cause, removed) => {
    if (removed) return

    // Check if authentication cookie was added for Claude.ai
    if (cookie.domain?.includes('claude.ai')) {
      console.log('Cookie changed:', cookie.name)

      // Only trigger on the actual auth cookie, not supporting cookies
      const isAuthCookie =
        cookie.name === 'sessionKey' || cookie.name === '__session' || cookie.name === 'auth_token'

      if (isAuthCookie) {
        console.log('Auth cookie detected, triggering auth success')
        onAuthSuccess()
      }
    }
  })
}

/**
 * Check current authentication state
 * @returns Authentication state with optional user identifier
 */
export async function checkAuthState(): Promise<{
  isAuthenticated: boolean
  userEmail?: string
}> {
  if (!ses) {
    ses = session.fromPartition('persist:main')
  }

  const cookies = await ses.cookies.get({ domain: CLAUDE_DOMAIN })

  // Check for valid auth cookies
  const now = Date.now() / 1000
  const validCookies = cookies.filter(
    (c) => !c.expirationDate || c.expirationDate > now
  )

  // Log cookies for debugging
  console.log(
    'Auth check - cookies found:',
    validCookies.map((c) => c.name)
  )

  // Look for specific known Claude.ai auth cookie
  // The key auth cookie is 'sessionKey' - other cookies like lastActiveOrg are not auth
  const authCookie = validCookies.find(
    (c) => c.name === 'sessionKey' || c.name === '__session' || c.name === 'auth_token'
  )

  const isAuthenticated = !!authCookie
  console.log('Auth check result:', { isAuthenticated, authCookieName: authCookie?.name })

  // Don't try to extract email from cookies - it's not reliably available
  // and we end up showing UUIDs. Just indicate logged in/out state.
  return {
    isAuthenticated,
    userEmail: undefined
  }
}

/**
 * Convert session cookies to persistent cookies
 * Session cookies are cleared when app closes, so we make them persistent
 */
export async function persistSessionCookies(): Promise<void> {
  if (!ses) {
    ses = session.fromPartition('persist:main')
  }

  const cookies = await ses.cookies.get({ domain: CLAUDE_DOMAIN })

  for (const cookie of cookies) {
    // Session cookies have no expirationDate - make them persistent
    if (!cookie.expirationDate) {
      // Important: use cookie.secure flag to determine protocol
      const protocol = cookie.secure ? 'https' : 'http'
      const domain = (cookie.domain ?? CLAUDE_DOMAIN).replace(/^\./, '') // Remove leading dot
      const url = `${protocol}://${domain}${cookie.path}`

      try {
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
          expirationDate: Math.floor(Date.now() / 1000) + COOKIE_EXPIRY_DAYS * 24 * 60 * 60
        })
      } catch (error) {
        console.error(`Failed to persist cookie ${cookie.name}:`, error)
      }
    }
  }
}

/**
 * Clear all Claude.ai cookies (logout)
 */
export async function logout(): Promise<void> {
  if (!ses) {
    ses = session.fromPartition('persist:main')
  }

  const cookies = await ses.cookies.get({ domain: CLAUDE_DOMAIN })

  for (const cookie of cookies) {
    // Important: use cookie.secure flag to determine protocol
    const protocol = cookie.secure ? 'https' : 'http'
    const domain = (cookie.domain ?? CLAUDE_DOMAIN).replace(/^\./, '') // Remove leading dot
    const url = `${protocol}://${domain}${cookie.path}`

    try {
      await ses.cookies.remove(url, cookie.name)
    } catch (error) {
      console.error(`Failed to remove cookie ${cookie.name}:`, error)
    }
  }
}
