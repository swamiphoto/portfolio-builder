// Pure: derive the minimal, public-safe print data exposed to the site render.
import { PUBLIC_URL } from '../gcsClient'

export function publicPrintForAsset(asset) {
  const p = asset && asset.print
  if (!p || !p.sellable) return null
  return {
    sellable: true,
    availableSizes: p.availableSizes || [],
    maxSharpSize: p.maxSharpSize || null,
    orientation: asset.orientation || null,
    assetId: asset.assetId || null,
  }
}

export function publicPrintStore(siteConfig) {
  const ps = (siteConfig && siteConfig.printStore) || {}
  return {
    enabled: !!ps.enabled,
    markup: typeof ps.markup === 'number' && ps.markup > 0 ? ps.markup : 3,
    currency: ps.currency || 'USD',
    showPriceOnImage: !!ps.showPriceOnImage,
  }
}

export function publicSiteConfig(siteConfig) {
  if (!siteConfig) return siteConfig
  return { ...siteConfig, printStore: publicPrintStore(siteConfig) }
}

// Server-safe reference to the high-res print file for fulfillment.
export function printImageRef(asset) {
  const key = asset && asset.print && asset.print.masterStorageKey
  if (!key) return null
  return { masterStorageKey: key, imageUrl: `${PUBLIC_URL}/${key}` }
}
