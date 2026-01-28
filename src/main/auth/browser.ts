import { shell } from 'electron'

const LOGIN_URL = 'https://claude.ai/login'

/**
 * Open Claude.ai login page in system browser
 */
export async function openLoginPage(): Promise<void> {
  // Validate URL for security (should always be HTTPS Claude.ai)
  if (!LOGIN_URL.startsWith('https://claude.ai')) {
    throw new Error('Invalid login URL')
  }

  await shell.openExternal(LOGIN_URL)
}
