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
    if (cookie.domain.includes('claude.ai')) {
      // Look for actual auth cookie patterns (NOT __cf_bm which is just Cloudflare bot management)
      const isAuthCookie =
        cookie.name.includes('session') ||
        cookie.name.includes('auth') ||
        cookie.name === 'sessionKey' ||
        cookie.name === '__client'

      // Exclude Cloudflare cookies that are NOT auth-related
      const isCloudflareNonAuth = cookie.name === '__cf_bm' || cookie.name.startsWith('cf_')

      if (isAuthCookie && !isCloudflareNonAuth) {
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

  // Look for known auth cookies (NOT __cf_bm which is just Cloudflare bot management)
  const hasAuthCookie = validCookies.some(
    (c) =>
      (c.name.includes('session') ||
        c.name.includes('auth') ||
        c.name === '__client' ||
        c.name === 'sessionKey') &&
      c.name !== '__cf_bm' &&
      !c.name.startsWith('cf_')
  )

  // Try to extract email from cookies (if available)
  // This is a best-effort attempt - email might not be in cookies
  let userEmail: string | undefined

  // Check for common patterns where email might be stored
  const emailCookie = validCookies.find(
    (c) => c.name.includes('email') || c.name.includes('user')
  )
  if (emailCookie) {
    try {
      userEmail = decodeURIComponent(emailCookie.value)
    } catch {
      // Ignore decode errors
    }
  }

  return {
    isAuthenticated: hasAuthCookie && validCookies.length > 0,
    userEmail
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
      const domain = cookie.domain.replace(/^\./, '') // Remove leading dot
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
    const domain = cookie.domain.replace(/^\./, '') // Remove leading dot
    const url = `${protocol}://${domain}${cookie.path}`

    try {
      await ses.cookies.remove(url, cookie.name)
    } catch (error) {
      console.error(`Failed to remove cookie ${cookie.name}:`, error)
    }
  }
}
