// components/image-displays/engagement/PackagesDrawer.js
// Right-side drawer listing purchasable packages — mirrors PrintConfigurator's
// slide-out so prints and packages feel like one system. No per-client unlock
// state is shown; it simply lists what's for sale.
import { useEffect, useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import { getSizedUrl } from '../../../common/imageUtils'

const PANEL_WIDTH = 460

function formatPrice(cents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100)
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency || 'USD'}`
  }
}

function StackThumb({ src }) {
  if (!src) return null
  const bg = { backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return (
    <div data-pkg-thumb aria-hidden="true" style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 1px 3px rgba(20,14,8,.25)', transform: 'rotate(-7deg) translate(-3px,2px)', filter: 'brightness(.9)', ...bg }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 1px 3px rgba(20,14,8,.25)', transform: 'rotate(4deg) translate(3px,1px)', filter: 'brightness(.95)', ...bg }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 1px 3px rgba(20,14,8,.25)', border: '2px solid #fdf9f4', ...bg }} />
    </div>
  )
}

export default function PackagesDrawer({ open, onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!ctx) return null
  const { packages, purchaseCurrency, packageThumb } = ctx

  function buy(id) {
    if (ctx.identity?.email) {
      setLoading(id)
      ctx.buyPackage(id)
    } else {
      onClose()          // close the drawer so the identity prompt (lower z-index) is visible
      ctx.buyPackage(id) // queues the identity prompt, then checks out on completion
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,14,8,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s ease' }}
      />
      <aside
        role="dialog"
        aria-label="Packages"
        aria-hidden={!open}
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81, width: PANEL_WIDTH, maxWidth: '92vw', background: '#f4efe8', boxShadow: '-24px 0 60px rgba(20,14,8,0.4)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#2c2416', letterSpacing: '-0.01em' }}>Packages</span>
          <button type="button" aria-label="Close packages" onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#7a6b55' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 20px 24px' }}>
          {(packages || []).map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={loading === pkg.id}
              onClick={() => buy(pkg.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 16px', background: '#fdf9f4', border: '1px solid rgba(160,140,110,0.22)', borderRadius: 10, cursor: 'pointer', width: '100%' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fbf4ea' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fdf9f4' }}
            >
              <StackThumb src={packageThumb ? (getSizedUrl(packageThumb, 'thumbnail') || packageThumb) : ''} />
              <div style={{ textAlign: 'left', flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>{pkg.label}</div>
                <div style={{ fontSize: 12, color: '#a8967a', marginTop: 2 }}>
                  {pkg.credits === 'all' ? 'Everything in this gallery' : `${pkg.credits} more photo${pkg.credits === 1 ? '' : 's'}`}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>
                {loading === pkg.id ? 'Redirecting…' : formatPrice(pkg.price, purchaseCurrency)}
              </div>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
