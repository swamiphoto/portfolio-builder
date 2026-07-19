// components/image-displays/engagement/WatermarkOverlay.js
// Screenshot deterrent, not DRM: a light brand mark over public photos when
// clientFeatures.watermark is on. Pointer-events none so it never blocks taps.
import { useClientEngagement } from './ClientEngagementContext'

export default function WatermarkOverlay() {
  const ctx = useClientEngagement()
  if (!ctx?.features?.watermark) return null
  const { logo, siteName } = ctx.branding || {}
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden" aria-hidden="true">
      {logo ? (
        <img src={logo} alt="" style={{ opacity: 0.16, maxWidth: '40%', maxHeight: '30%' }} />
      ) : (
        <span style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(14px, 3.5vw, 28px)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
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
