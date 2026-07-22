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
    paymentsReady: !!(ps.chargesEnabled && ps.stripeConnectAccountId),
  }
}

export function publicSiteConfig(siteConfig) {
  if (!siteConfig) return siteConfig
  return { ...siteConfig, printStore: publicPrintStore(siteConfig) }
}

// Server-safe reference to the print file for fulfillment. Prefers an uploaded
// high-res master; falls back to the asset's display image, whose dimensions
// already gated `availableSizes` at the DPI floor — so it's a valid print source
// at every offered size. Returns null only when there's no usable image at all.
export function printImageRef(asset) {
  if (!asset || !asset.print) return null
  const key = asset.print.masterStorageKey
  if (key) return { masterStorageKey: key, imageUrl: `${PUBLIC_URL}/${key}` }
  const fallback = asset.publicUrl || asset.url || null
  if (fallback) return { masterStorageKey: null, imageUrl: fallback }
  return null
}
