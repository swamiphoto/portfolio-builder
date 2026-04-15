import { getServerSession } from 'next-auth/next'

/**
 * Wraps an API handler, injecting the authenticated user or returning 401.
 *
 * Usage:
 *   export default withAuth(async (req, res, user) => {
 *     // user = { id, email, name }
 *   })
 *
 * @param {Function} handler - The API route handler
 * @returns {Function} Wrapped handler that checks auth
 */
export function withAuth(handler) {
  return async function (req, res) {
    try {
      // Try to load authOptions from nextauth config
      let authOptions = {}
      try {
        const mod = require('../pages/api/auth/[...nextauth]')
        authOptions = mod.authOptions
      } catch (err) {
        // File doesn't exist yet (e.g., during tests before Task 3)
        // getServerSession will use empty config for now
      }

      const session = await getServerSession(req, res, authOptions)
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      return handler(req, res, session.user)
    } catch (err) {
      console.error('[withAuth] error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
