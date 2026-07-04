// pages/api/admin/print/sell.js
import { withAuth } from '../../../../common/withAuth'
import { downloadJSON, uploadJSON } from '../../../../common/gcsClient'
import { getUserLibraryConfigPath } from '../../../../common/gcsUser'
import { normalizeLibraryConfig } from '../../../../common/adminConfig'
import {
  readSiteConfig,
  createDefaultSiteConfig,
  normalizePrintStore,
} from '../../../../common/siteConfig'
import { SEED_CATALOG } from '../../../../common/fulfillment/seedCatalog'
import { resolveSellableAsset } from '../../../../common/print/sellAsset'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { assetId, sellable } = req.body || {}
  if (!assetId) return res.status(400).json({ error: 'assetId required' })

  try {
    let library
    try {
      library = normalizeLibraryConfig(await downloadJSON(getUserLibraryConfigPath(user.id)), [])
    } catch (err) {
      if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') {
        return res.status(404).json({ error: 'library not found' })
      }
      throw err
    }

    const asset = library.assets[assetId]
    if (!asset) return res.status(404).json({ error: 'asset not found' })

    const site = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
    const markup = site.printStore.markup

    const { print, priceMatrix } = resolveSellableAsset(asset, SEED_CATALOG, markup, sellable !== false)
    library.assets[assetId] = { ...asset, print, forSale: print.sellable }
    await uploadJSON(getUserLibraryConfigPath(user.id), library)

    return res.status(200).json({ print, priceMatrix })
  } catch (err) {
    console.error('POST /api/admin/print/sell error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
