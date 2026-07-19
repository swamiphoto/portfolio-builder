// Public (unauthenticated) engagement endpoint. The page password is a
// client-side gate, not a security boundary — so this route only accepts
// writes for pages whose specific client feature is enabled, and never
// returns client emails on GET.
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readEngagement, writeEngagement, applyEngagementAction } from '../../../common/clientEngagement'
import { sendMail } from '../../../common/email/mailer'

async function resolvePage(username, pageId) {
  if (!username || !pageId) return null
  const lookup = await lookupUserByUsername(String(username))
  if (!lookup) return null
  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return null
  const page = (siteConfig.pages || []).find(p => p.id === pageId || p.slug === pageId)
  if (!page || !page.clientFeatures?.enabled) return null
  return { userId: lookup.userId, siteConfig, page }
}

function actionAllowed(cf, action) {
  const fav = cf.favorites?.enabled
  const com = cf.comments?.enabled
  if (action === 'favorite' || action === 'unfavorite') return !!fav
  if (action === 'comment') return !!com
  if (action === 'submit') return !!(fav && cf.favorites?.submitWorkflow)
  if (action === 'identify') return !!(fav || com)
  return false
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { username, pageId } = req.query
      const ctx = await resolvePage(username, pageId)
      if (!ctx) return res.status(404).json({ error: 'Not found' })
      const data = await readEngagement(ctx.userId, ctx.page.id)
      const people = {}
      for (const [deviceId, person] of Object.entries(data.people || {})) {
        people[deviceId] = { name: person.name }
      }
      return res.status(200).json({ people, favorites: data.favorites, comments: data.comments, submissions: data.submissions })
    }

    if (req.method === 'POST') {
      const { username, pageId, deviceId, action, photoUrl, name, email, text } = req.body || {}
      const ctx = await resolvePage(username, pageId)
      if (!ctx) return res.status(404).json({ error: 'Not found' })
      const cf = ctx.page.clientFeatures
      if (!actionAllowed(cf, action)) return res.status(403).json({ error: 'Feature not enabled' })

      const data = await readEngagement(ctx.userId, ctx.page.id)

      // requireEmail enforcement: acting person must have an email on file.
      const needsEmail =
        ((action === 'favorite' || action === 'unfavorite' || action === 'submit') && cf.favorites?.requireEmail) ||
        (action === 'comment' && cf.comments?.requireEmail)
      if (needsEmail && !(data.people?.[deviceId]?.email || (action === 'identify' && email))) {
        return res.status(400).json({ error: 'email required' })
      }

      const next = applyEngagementAction(data, {
        type: action, deviceId, ts: Date.now(), photoUrl, name, email, text,
      })
      await writeEngagement(ctx.userId, ctx.page.id, next)

      if (action === 'submit') {
        const to = ctx.siteConfig.contact?.email
        if (to) {
          const person = next.people?.[deviceId]?.name || 'A client'
          const picks = next.favorites.filter(f => f.deviceId === deviceId).map(f => f.photoUrl)
          const pageTitle = ctx.page.title || 'your gallery'
          await sendMail({
            to,
            subject: `${person} submitted ${picks.length} favorite${picks.length === 1 ? '' : 's'} — ${pageTitle}`,
            text: `${person} submitted ${picks.length} favorites on "${pageTitle}".\n\n${picks.join('\n')}`,
            html: `<p><strong>${person}</strong> submitted ${picks.length} favorites on &ldquo;${pageTitle}&rdquo;.</p><ul>${picks.map(u => `<li><a href="${u}">${u}</a></li>`).join('')}</ul>`,
          })
        }
      }
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[client/engagement]', err)
    return res.status(status).json({ error: err.message || 'Internal error' })
  }
}
