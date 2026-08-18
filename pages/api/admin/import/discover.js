import { withAuth } from '@/common/withAuth'
import { detectAdapter, getAdapter, PROVIDERS } from '@/common/import/adapters'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { input, provider } = req.body || {}
  if (!input || !String(input).trim()) {
    return res.status(400).json({
      error: 'missing_input',
      message: 'Paste a link to your photo gallery.',
    })
  }

  const adapter = provider ? getAdapter(provider) : detectAdapter(input)
  if (!adapter || !adapter.enabled) {
    return res.status(400).json({
      error: 'unsupported_source',
      message:
        "We don't recognize that site yet. Try a SmugMug gallery link, or a direct URL to a page with your photos.",
    })
  }

  let result
  let resolvedProvider = adapter.id
  try {
    result = await adapter.discover(input)
  } catch (err) {
    console.error('import discover failed', err)
    // Provider-specific adapters (e.g. SmugMug's API) can fail for reasons that
    // have nothing to do with whether the site actually has photos — a missing
    // or dead API key, rate limiting, etc. Fall back to the generic crawler
    // (which reads the rendered HTML directly) instead of surfacing a hard error.
    const fallback = adapter.id !== PROVIDERS.GENERIC ? getAdapter(PROVIDERS.GENERIC) : null
    if (!fallback) {
      return res.status(502).json({
        error: 'discovery_failed',
        message:
          "We couldn't read that link. Double-check the URL and try again, or upload your photos manually.",
      })
    }
    try {
      result = await fallback.discover(input)
      resolvedProvider = fallback.id
    } catch (fallbackErr) {
      console.error('import discover fallback failed', fallbackErr)
      return res.status(502).json({
        error: 'discovery_failed',
        message:
          "We couldn't read that link. Double-check the URL and try again, or upload your photos manually.",
      })
    }
  }

  const totalAssets = (result.collections || []).reduce((n, c) => n + (c.assetRefs?.length || 0), 0)
  if (totalAssets === 0) {
    return res.status(422).json({
      error: 'no_images',
      message:
        "We didn't find any photos at that link. Try a direct gallery URL, or upload your photos manually.",
    })
  }

  return res.status(200).json({
    provider: resolvedProvider,
    site: result.site,
    collections: result.collections,
    siteMap: result.siteMap || null,
    totalAssets,
  })
}

export default withAuth(handler)
