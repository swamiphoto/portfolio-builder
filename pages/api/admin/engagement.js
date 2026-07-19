// Photographer-facing activity feed: aggregates all per-page client-data files
// into a reverse-chronological event list for the sidebar bell.
import { withAuth } from '../../../common/withAuth'
import { listFiles, downloadJSON } from '../../../common/gcsClient'
import { readSiteConfig } from '../../../common/siteConfig'

const MAX_EVENTS = 200

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const [keys, siteConfig] = await Promise.all([
      listFiles(`users/${user.id}/client-data/`),
      readSiteConfig(user.id).catch(() => null),
    ])
    const titleById = {}
    for (const p of siteConfig?.pages || []) titleById[p.id] = p.title || p.slug || p.id

    const events = []
    const pages = []
    for (const key of keys) {
      const pageId = key.split('/').pop().replace(/\.json$/, '')
      let data
      try { data = await downloadJSON(key) } catch { continue }
      const pageTitle = titleById[pageId] || pageId
      const person = (deviceId) => {
        const p = data.people?.[deviceId]
        return { name: p?.name || 'Someone', email: p?.email || '' }
      }
      for (const f of data.favorites || []) {
        events.push({ type: 'favorite', ts: f.ts, pageId, pageTitle, person: person(f.deviceId), photoUrl: f.photoUrl })
      }
      for (const c of data.comments || []) {
        events.push({ type: 'comment', ts: c.ts, pageId, pageTitle, person: person(c.deviceId), photoUrl: c.photoUrl, text: c.text })
      }
      for (const s of data.submissions || []) {
        events.push({ type: 'submit', ts: s.ts, pageId, pageTitle, person: person(s.deviceId), count: s.count })
      }
      pages.push({
        pageId, pageTitle,
        favoriteCount: (data.favorites || []).length,
        commentCount: (data.comments || []).length,
        people: Object.keys(data.people || {}).length,
      })
    }
    events.sort((a, b) => b.ts - a.ts)
    return res.status(200).json({ events: events.slice(0, MAX_EVENTS), pages })
  } catch (err) {
    console.error('[admin/engagement]', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}

export default withAuth(handler)
