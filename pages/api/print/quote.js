import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { publicPrintStore, publicPrintForAsset } from '../../../common/print/publicPrint'
import { getAdapterForCountry } from '../../../common/fulfillment/router'
import { quoteOrder } from '../../../common/print/quoteOrder'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { username, assetId, spec, address } = req.body || {}
    if (!username || !assetId || !spec || !address?.country) return res.status(400).json({ error: 'username, assetId, spec, address.country required' })

    const lookup = await lookupUserByUsername(username)
    if (!lookup) return res.status(404).json({ error: 'not found' })
    const [siteConfig, libraryConfig] = await Promise.all([
      readSiteConfig(lookup.userId),
      readLibraryConfig(lookup.userId).catch(() => ({ assets: {} })),
    ])
    const store = publicPrintStore(siteConfig)
    if (!store.enabled) return res.status(403).json({ error: 'store not enabled' })

    const asset = Object.values(libraryConfig?.assets || {}).find((a) => a.assetId === assetId)
    const print = publicPrintForAsset(asset)
    if (!asset || !print) return res.status(400).json({ error: 'asset not available for purchase' })
    if (!print.availableSizes.includes(spec.size)) return res.status(400).json({ error: 'size not available' })

    const adapter = getAdapterForCountry(address.country)
    const amounts = await quoteOrder({ spec, markup: store.markup, platformFeePct: 0, currency: store.currency, adapter, address })
    return res.status(200).json({ amounts })
  } catch (err) {
    console.error('quote error', err)
    return res.status(500).json({ error: 'Could not get a quote' })
  }
}
