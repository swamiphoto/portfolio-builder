// Server-side only. Picks the config a public request should render: the
// published snapshot normally, or the live DRAFT when the requester is the
// signed-in owner AND preview is requested.
//
// Preview is requested via ?preview=1 OR a `sepia_preview` cookie. The cookie is
// set the first time the owner opens ?preview=1 and persists preview across
// in-site navigation, so clicking links inside the preview keeps showing the
// draft without needing ?preview=1 on every link. ?preview=0 exits (clears it).
//
// The cookie is only an intent flag — the draft is still gated on an owner
// session at read time, so the cookie alone never exposes a draft to anyone else.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import { readSiteConfig, readPublishedSiteConfig } from './siteConfig'

const PREVIEW_COOKIE = 'sepia_preview'
const SET_PREVIEW = `${PREVIEW_COOKIE}=1; Path=/; Max-Age=7200; SameSite=Lax; HttpOnly`
const CLEAR_PREVIEW = `${PREVIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`

export async function resolvePublicSiteConfig({ req, res, query, ownerUserId }) {
  const q = query || {}
  const wantsExit = q.preview === '0' || q.preview === 'false'
  const hasCookie = req?.cookies?.[PREVIEW_COOKIE] === '1'
  const wantsPreview = !wantsExit && (q.preview === '1' || q.preview === 'true' || hasCookie)

  if (wantsPreview && req && res) {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (session?.user?.id && session.user.id === ownerUserId) {
        const draft = await readSiteConfig(ownerUserId)
        if (draft) {
          res.setHeader('Cache-Control', 'no-store, max-age=0')
          res.setHeader('Set-Cookie', SET_PREVIEW)
          return { siteConfig: draft, isPreview: true }
        }
      }
    } catch {
      // fall through to published on any auth/read error
    }
  }

  // Exiting, or a leftover cookie we couldn't honor (not owner / no draft):
  // clear it so the visitor isn't stuck bouncing off preview intent.
  if (res && (wantsExit || hasCookie)) {
    res.setHeader('Set-Cookie', CLEAR_PREVIEW)
    res.setHeader('Cache-Control', 'no-store, max-age=0')
  }
  return { siteConfig: await readPublishedSiteConfig(ownerUserId), isPreview: false }
}
