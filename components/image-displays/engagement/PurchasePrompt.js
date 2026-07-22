// components/image-displays/engagement/PurchasePrompt.js
// Persistent, page-level entry point into the purchase sheet — the "just give
// me everything" path and the "download all" affordance. Mirrors SubmitPill's
// fixed placement so it reads as gallery chrome, not an ad.
import { useClientEngagement } from './ClientEngagementContext'

export default function PurchasePrompt() {
  const ctx = useClientEngagement()
  if (!ctx?.features?.purchase) return null
  if (!(ctx.packages || []).length) return null

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 60 }}>
      <button
        type="button"
        onClick={() => ctx.openPurchase()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#2c2416', background: 'rgba(240,232,216,0.92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(160,140,110,0.28)', borderRadius: 999, boxShadow: '0 2px 10px rgba(20,14,8,0.18)', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240,232,216,1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(240,232,216,0.92)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        View Packages
      </button>
    </div>
  )
}
