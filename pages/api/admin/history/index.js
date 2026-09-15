// Lists the photographer's published-version snapshots (newest first). The
// timestamp is encoded in the filename and equals the publishedAt, so listing
// is cheap — no need to open each snapshot.
import { withAuth } from '../../../../common/withAuth'
import { listFiles } from '../../../../common/gcsClient'
import { getUserHistoryPrefix } from '../../../../common/gcsUser'

const SNAP_RE = /\/history\/site-config-(\d+)\.json$/

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const keys = await listFiles(getUserHistoryPrefix(user.id))
    const versions = keys
      .map((k) => { const m = String(k).match(SNAP_RE); return m ? { ts: Number(m[1]) } : null })
      .filter(Boolean)
      .sort((a, b) => b.ts - a.ts)
    return res.status(200).json({ versions })
  } catch (err) {
    console.error('history list error', err)
    return res.status(500).json({ error: 'Could not list history' })
  }
}

export default withAuth(handler)
