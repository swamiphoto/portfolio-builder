// Returns one published-version snapshot's config, so the editor can load it as
// the current draft (restore = load into draft; the user then Publishes, which
// writes a fresh snapshot and keeps the newer versions in history).
import { withAuth } from '../../../../common/withAuth'
import { downloadJSON } from '../../../../common/gcsClient'
import { getUserHistoryPath } from '../../../../common/gcsUser'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const ts = Number(req.query.ts)
  if (!ts) return res.status(400).json({ error: 'Invalid version' })
  try {
    const config = await downloadJSON(getUserHistoryPath(user.id, ts))
    return res.status(200).json({ config })
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') return res.status(404).json({ error: 'Version not found' })
    console.error('history get error', err)
    return res.status(500).json({ error: 'Could not read version' })
  }
}

export default withAuth(handler)
