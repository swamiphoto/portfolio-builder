// components/image-displays/engagement/WatermarkOverlay.js
// Screenshot deterrent, not DRM: a light brand mark over public photos when
// clientFeatures.watermark is on. Mirrors the logo: image when logoType is
// 'image', otherwise the site name in the same font as the nav wordmark.
import { useClientEngagement } from './ClientEngagementContext'
import { logoFontStyle } from '../../../common/siteDesign'

export default function WatermarkOverlay() {
  const ctx = useClientEngagement()
  if (!ctx?.features?.watermark) return null
  const { logo, siteName, logoFont } = ctx.branding || {}
  const fontStyle = logoFontStyle(logoFont || 'theme') || {}
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden" aria-hidden="true">
      {logo ? (
        <img src={logo} alt="" style={{ opacity: 0.16, maxWidth: '40%', maxHeight: '30%' }} />
      ) : (
        <span style={{
          ...fontStyle,
          fontSize: 'clamp(14px, 3.5vw, 28px)',
          color: 'rgba(255,255,255,0.45)',
          textShadow: '0 1px 8px rgba(0,0,0,0.35)',
          opacity: 0.5,
          whiteSpace: 'nowrap',
        }}>
          {siteName || ''}
        </span>
      )}
    </div>
  )
}
