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
  // Refined stack: thin translucent frame + soft shadow, gentle offsets — reads as
  // a small set of prints, not stickers with a thick white border.
  return (
    <div data-pkg-thumb aria-hidden="true" style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 5, boxShadow: '0 1px 3px rgba(20,14,8,.3)', transform: 'rotate(-5deg) translate(-2px,1px)', filter: 'brightness(.82)', ...bg }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 5, boxShadow: '0 1px 3px rgba(20,14,8,.3)', transform: 'rotate(3deg) translate(2px,0)', filter: 'brightness(.9)', ...bg }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 5, boxShadow: '0 2px 5px rgba(20,14,8,.26)', border: '1px solid rgba(255,255,255,0.6)', ...bg }} />
    </div>
  )
}

export default function PackagesDrawer({ open, onClose, previewInert = false }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)
  const [hovered, setHovered] = useState(null) // card id under the cursor (inline styles can't :hover)
  const [btnHover, setBtnHover] = useState(null) // price-button hover, tracked separately from the card
  const [toast, setToast] = useState(null) // transient "heading to Stripe" notice shown on Buy

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(t)
  }, [toast])

  if (!ctx) return null
  const { packages, purchaseCurrency, packageThumb } = ctx

  function buy(id) {
    // Preview only: explain to the photographer what a client experiences on the live
    // site. No toast on the real site — there, the Stripe redirect just happens.
    if (previewInert) { setToast('In your live site, this takes clients to Stripe for secure checkout.'); return }
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
        <div style={{ position: 'relative', padding: '28px 20px 16px' }}>
          <button type="button" aria-label="Close packages" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#7a6b55' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="font-fraunces" style={{ fontSize: 20, lineHeight: 1.1, fontWeight: 400, color: '#2c2416', margin: '0 0 4px' }}>Packages</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#7a6b55', margin: 0, maxWidth: 300, textWrap: 'pretty' }}>Choose a package to download and keep your favorite photos from this gallery.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 10px' }}>
          {(packages || []).map((pkg) => {
            const isHover = hovered === pkg.id // hover visuals play in preview too; only the purchase is inert
            const isBtnHover = btnHover === pkg.id
            const isFeatured = !!pkg.featured
            // One warm surface for every card (the old "featured" tint) — the badge alone
            // marks the featured one, no need to double up with a separate colour.
            const bg = '#fbf5ec'
            return (
              <button
                key={pkg.id}
                type="button"
                disabled={loading === pkg.id}
                onClick={() => buy(pkg.id)}
                onMouseEnter={() => setHovered(pkg.id)}
                onMouseLeave={() => setHovered(h => (h === pkg.id ? null : h))}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 15, padding: '16px 16px',
                  background: bg, border: 'none', borderRadius: 12,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  boxShadow: isHover
                    ? '0 2px 5px rgba(20,14,8,0.07), 0 7px 16px -8px rgba(20,14,8,0.15)'
                    : '0 1px 2px rgba(20,14,8,0.05), 0 3px 9px -7px rgba(20,14,8,0.11)',
                  transition: 'box-shadow .2s ease',
                }}
              >
                {isFeatured && (
                  <span className="font-mono" style={{ position: 'absolute', top: -8, left: 14, fontSize: 8.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: '#8b6f47', padding: '2px 7px', borderRadius: 999 }}>Best value</span>
                )}
                <StackThumb src={packageThumb ? (getSizedUrl(packageThumb, 'thumbnail') || packageThumb) : ''} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: '#2c2416', lineHeight: 1.2 }}>{pkg.label}</div>
                  <div className="font-mono" style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8967a', marginTop: 5 }}>
                    {pkg.credits === 'all' ? 'Entire gallery' : `${pkg.credits} photo${pkg.credits === 1 ? '' : 's'}`}
                  </div>
                </div>
                <span
                  onMouseEnter={() => setBtnHover(pkg.id)}
                  onMouseLeave={() => setBtnHover(h => (h === pkg.id ? null : h))}
                  style={{
                  flexShrink: 0, minWidth: 88, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                  padding: '9px 14px', borderRadius: 6, color: '#8b6f47',
                  border: `1px solid ${isBtnHover ? 'rgba(139,111,71,0.55)' : 'rgba(139,111,71,0.32)'}`,
                  background: isBtnHover ? 'rgba(139,111,71,0.1)' : 'transparent',
                  transition: 'background .18s ease, border-color .18s ease',
                }}>
                  {loading === pkg.id ? '…' : formatPrice(pkg.price, purchaseCurrency)}
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 24px 20px', color: '#7a6b55', fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.8 }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
          Secure checkout
        </div>
      </aside>

      {/* Rendered outside the aside so it stays put even as the drawer slides away. */}
      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', maxWidth: '90vw', background: '#2c2416', color: '#f6f3ec', padding: '9px 16px', borderRadius: 10, boxShadow: '0 10px 30px rgba(26,18,10,0.32)', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 12, letterSpacing: '0.03em', lineHeight: 1.4 }}>
          {toast}
        </div>
      )}
    </>
  )
}
