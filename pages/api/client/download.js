// pages/api/client/download.js
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { getSizedUrl } from '../../../common/imageUtils'
import { readEngagement, writeEngagement, applyEngagementAction } from '../../../common/clientEngagement'
import { readLibraryConfig } from '../../../common/adminConfig'
import { resolveDownloadAccess } from '../../../common/clientPurchase'

const R2_PREFIX = process.env.R2_PUBLIC_URL || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { username, pageId, photoUrl: rawPhotoUrl, quality, deviceId } = req.query

    if (!username || !pageId || !rawPhotoUrl || !deviceId) {
      return res.status(400).json({ error: 'Missing params' })
    }
    if (!['display', 'original'].includes(quality)) {
      return res.status(400).json({ error: 'Invalid quality' })
    }
    // Validate URL is from our storage (prevents open-proxy abuse)
    if (R2_PREFIX && !rawPhotoUrl.startsWith(R2_PREFIX)) {
      return res.status(400).json({ error: 'Invalid photo URL' })
    }

    // Resolve page + feature flag
    const lookup = await lookupUserByUsername(String(username))
    if (!lookup) return res.status(404).json({ error: 'Not found' })
    const siteConfig = await readSiteConfig(lookup.userId)
    const page = (siteConfig?.pages || []).find(p => p.id === pageId || p.slug === pageId)
    if (!page?.clientFeatures?.enabled || !page?.clientFeatures?.downloads?.enabled) {
      return res.status(403).json({ error: 'Downloads not enabled' })
    }

    // Verify identity has email (always required for downloads)
    const data = await readEngagement(lookup.userId, page.id)
    const person = data.people?.[deviceId]
    if (!person?.email) return res.status(403).json({ error: 'Email required for downloads' })

    // Paywall: when purchase is enabled, a NEW photo past the ceiling is blocked.
    const purchase = page.clientFeatures.purchase
    if (purchase?.enabled) {
      const access = resolveDownloadAccess({
        data,
        email: person.email,
        photoUrl: rawPhotoUrl,
        freeAllowance: purchase.freeAllowance || 0,
      })
      if (!access.allowed) {
        return res.status(402).json({ error: 'payment_required', reason: access.reason })
      }
    }

    // Log download before streaming (best-effort — doesn't block on error)
    try {
      const next = applyEngagementAction(data, {
        type: 'download', deviceId, ts: Date.now(), photoUrl: rawPhotoUrl, quality,
      })
      await writeEngagement(lookup.userId, page.id, next)
    } catch (logErr) {
      console.error('[client/download] log error', logErr)
    }

    // For full-res: prefer an uploaded print master over the web URL
    let printMasterUrl = null
    if (quality === 'original') {
      try {
        const library = await readLibraryConfig(lookup.userId)
        const asset = Object.values(library?.assets || {}).find(
          a => a.publicUrl === rawPhotoUrl || a.url === rawPhotoUrl
        )
        if (asset?.print?.masterStorageKey && R2_PREFIX) {
          printMasterUrl = `${R2_PREFIX}/${asset.print.masterStorageKey}`
        }
      } catch { /* fall back to web URL */ }
    }

    // Resolve and fetch
    const downloadUrl = quality === 'display'
      ? (getSizedUrl(rawPhotoUrl, 'display') || rawPhotoUrl)
      : (printMasterUrl || rawPhotoUrl)
    const upstream = await fetch(downloadUrl)
    if (!upstream.ok) return res.status(502).json({ error: 'Could not fetch photo' })

    const buf = await upstream.arrayBuffer()
    const buffer = Buffer.from(buf)
    const ext = downloadUrl.split('.').pop()?.split('?')[0] || 'jpg'
    const pageSlug = page.slug || page.id || 'photo'
    const filename = quality === 'display' ? `${pageSlug}-web.${ext}` : `${pageSlug}-full.${ext}`

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Length', buffer.length)
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[client/download]', err)
    return res.status(500).json({ error: 'Download failed' })
  }
}
