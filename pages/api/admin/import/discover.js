import { withAuth } from '@/common/withAuth'
import { detectAdapter, getAdapter, PROVIDERS } from '@/common/import/adapters'
import smugmugWeb from '@/common/import/adapters/smugmugWeb'

// Whenever the resolved path would fall through to the generic crawler — either
// because registry selection landed there directly (the common case: SmugMug
// custom domains never match the URL-only registry `detect()`, and *.smugmug.com
// falls here too once SMUGMUG_API_KEY is unset, since smugmug.enabled reflects
// key presence), or because the SmugMug API adapter is about to fail over — try
// the keyless SmugMug web adapter FIRST. It reads the same rendered HTML the
// generic crawler would, but knows how to walk SmugMug's album tree and hit the
// unauthenticated per-album JSON endpoint, so SmugMug sites import fully with
// zero API credentials. smugmugWeb throws its typed NotSmugMugError for any
// non-SmugMug site (the overwhelmingly common case here) — only unexpected
// failures get logged.
async function discoverGenericChain(genericAdapter, input) {
  try {
    const result = await smugmugWeb.discover(input)
    return { result, resolvedProvider: smugmugWeb.id }
  } catch (webErr) {
    if (webErr?.name !== 'NotSmugMugError') console.error('smugmugWeb discover failed', webErr)
    const result = await genericAdapter.discover(input)
    return { result, resolvedProvider: genericAdapter.id }
  }
}

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
    if (adapter.id === PROVIDERS.GENERIC) {
      ;({ result, resolvedProvider } = await discoverGenericChain(adapter, input))
    } else {
      result = await adapter.discover(input)
    }
  } catch (err) {
    console.error('import discover failed', err)
    // Provider-specific adapters (e.g. SmugMug's API) can fail for reasons that
    // have nothing to do with whether the site actually has photos — a missing
    // or dead API key, rate limiting, etc. Fall back to the generic chain
    // (smugmugWeb, then the generic crawler) instead of surfacing a hard error.
    const fallback = adapter.id !== PROVIDERS.GENERIC ? getAdapter(PROVIDERS.GENERIC) : null
    if (!fallback) {
      return res.status(502).json({
        error: 'discovery_failed',
        message:
          "We couldn't read that link. Double-check the URL and try again, or upload your photos manually.",
      })
    }
    try {
      ;({ result, resolvedProvider } = await discoverGenericChain(fallback, input))
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
