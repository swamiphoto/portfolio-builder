import crypto from 'crypto'
import { withAuth } from '@/common/withAuth'
import { safeFetch } from '@/common/import/safeFetch'

const MAX_BATCH = 50

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { items } = req.body || {}
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' })
  if (items.length > MAX_BATCH) return res.status(400).json({ error: 'batch too large', message: 'Hash fewer photos at a time.' })

  const hashed = []
  const failed = []
  for (const item of items) {
    try {
      const resp = await safeFetch(item.url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf = Buffer.from(await resp.arrayBuffer())
      hashed.push({ assetId: item.assetId, hash: crypto.createHash('sha256').update(buf).digest('hex') })
    } catch (err) {
      failed.push({ assetId: item.assetId, reason: String(err?.message || err) })
    }
  }
  return res.status(200).json({ hashed, failed })
}

export default withAuth(handler)
