// Server-side only. Picks the config a public request should render: the
// published snapshot normally, or the live DRAFT when ?preview=1 AND the
// requester is the signed-in owner of the site (so the photographer can preview
// unpublished changes at the real URL; everyone else always sees published).
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import { readSiteConfig, readPublishedSiteConfig } from './siteConfig'

export async function resolvePublicSiteConfig({ req, res, query, ownerUserId }) {
  const wantsPreview = !!query && (query.preview === '1' || query.preview === 'true')
  if (wantsPreview && req && res) {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (session?.user?.id && session.user.id === ownerUserId) {
        const draft = await readSiteConfig(ownerUserId)
        if (draft) {
          res.setHeader('Cache-Control', 'no-store, max-age=0')
          return { siteConfig: draft, isPreview: true }
        }
      }
    } catch {
      // fall through to published on any auth/read error
    }
  }
  return { siteConfig: await readPublishedSiteConfig(ownerUserId), isPreview: false }
}
