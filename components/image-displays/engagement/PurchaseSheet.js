// components/image-displays/engagement/PurchaseSheet.js
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

function formatPrice(cents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100)
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency || 'USD'}`
  }
}

export default function PurchaseSheet({ onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)
  if (!ctx) return null

  const { purchaseState, packages, purchaseCurrency } = ctx
  const header = purchaseState?.all
    ? 'You have the full gallery'
    : `You've unlocked ${purchaseState?.unlockedCount ?? 0} of ${purchaseState?.ceiling ?? 0}`

  function buy(id) {
    setLoading(id)
    Promise.resolve(ctx.startCheckout(id)).catch(() => setLoading(null))
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,14,8,0.38)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fdf9f4', borderRadius: 14, border: '1px solid rgba(160,140,110,0.22)', boxShadow: '0 12px 48px rgba(20,14,8,0.28)', padding: 24, width: 'calc(100% - 40px)', maxWidth: 340 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416', letterSpacing: '-0.01em' }}>Download more photos</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#a8967a', lineHeight: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#a8967a', marginBottom: 16 }}>{header}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(packages || []).map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={!!loading}
              onClick={() => buy(pkg.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(44,36,22,0.03)', border: '1px solid rgba(160,140,110,0.22)', borderRadius: 9, cursor: loading ? 'default' : 'pointer', width: '100%' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(44,36,22,0.07)' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(44,36,22,0.03)' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2c2416' }}>{pkg.label}</div>
                {pkg.credits === 'all' && (
                  <div style={{ fontSize: 11, color: '#a8967a', marginTop: 2 }}>Everything in this gallery</div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2416' }}>
                {loading === pkg.id ? 'Redirecting…' : formatPrice(pkg.price, purchaseCurrency)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
