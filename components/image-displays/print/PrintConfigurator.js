// components/image-displays/print/PrintConfigurator.js
// Right-edge slide-out drawer that configures a print: a framed "on the wall"
// preview at the top, then the size/finish/framing controls. Portable — opened
// from anywhere via PrintStoreContext (lightbox today, thumbnails later).
import React, { useEffect, useState } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'
import FramedImage from './FramedImage'
import PrintPurchasePanel from './PrintPurchasePanel'
import CheckoutStep from './CheckoutStep'
import { usePrintStore } from './PrintStoreContext'

const SERIF = '"Cormorant Garamond", Georgia, serif'
// Wide enough that the size toggles sit on one row (no ugly wrap).
const PANEL_WIDTH = 560

function defaultSpec(print) {
  const size = print?.maxSharpSize || (print?.availableSizes || [])[0] || null
  return { size, finish: 'lustre', frame: 'none', frameColor: null, matte: false }
}

export default function PrintConfigurator({ open, print, imageUrl, printStore, username: usernameProp, onClose }) {
  const [spec, setSpec] = useState(defaultSpec(print))
  const [checkout, setCheckout] = useState(false)
  const [amounts, setAmounts] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [error, setError] = useState('')
  const ctx = usePrintStore()
  const username = usernameProp || ctx?.username

  // Reset the configuration whenever a new image/print is opened.
  useEffect(() => {
    if (open) {
      setSpec(defaultSpec(print))
      setCheckout(false)
      setAmounts(null)
      setQuoting(false)
      setError('')
    }
  }, [open, imageUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(20,14,8,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Configure print"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 61,
          width: PANEL_WIDTH, maxWidth: '92vw',
          background: '#f4efe8',
          boxShadow: '-24px 0 60px rgba(20,14,8,0.4)',
          transform: open ? 'translateX(0)' : `translateX(100%)`,
          transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a8967a', fontWeight: 500 }}>
            Order a print
          </span>
          <button
            type="button"
            aria-label="Close print options"
            onClick={onClose}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', color: '#7a6b55' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
            </svg>
          </button>
        </div>

        {/* Intro — a little excitement + how it works. */}
        <div style={{ padding: '2px 20px 4px' }}>
          <h3 style={{ margin: '0 0 6px', fontFamily: SERIF, fontSize: 23, fontWeight: 400, color: '#2c2416', lineHeight: 1.12 }}>
            Bring the photograph home
          </h3>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#7a6b55' }}>
            Professional fine-art labs will color-manage this photo and print it on
            high-quality photo paper. We pack it with care and ship worldwide, usually
            landing at your door in about a week. Every order also supports the
            photographer directly.
          </p>
        </div>

        {/* Preview — no ground; the print sits directly on the drawer so it reads
            true. Smaller + centered, with room around it so the shadow isn't clipped. */}
        <div
          style={{
            margin: '0 20px', padding: '26px 34px 40px',
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            minHeight: 180,
          }}
        >
          {imageUrl && (
            <FramedImage
              src={getSizedUrl(imageUrl, 'display')}
              alt=""
              spec={spec}
              className="object-contain"
              maxHeight="32vh"
            />
          )}
        </div>

        {/* Controls — only mounted when a print is loaded (avoids pricing a null size while closed) */}
        <div style={{ padding: '22px 20px 0' }}>
          {print && spec.size && (
            checkout ? (
              <CheckoutStep
                onBack={() => { setCheckout(false); setAmounts(null); setError('') }}
                onSubmit={async (form) => {
                  setQuoting(true); setError('')
                  const address = { line1: form.line1, city: form.city, region: form.region, postalCode: form.postalCode, country: form.country }
                  try {
                    if (!amounts) {
                      const r = await fetch('/api/print/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, assetId: print?.assetId, spec, address }) })
                      if (!r.ok) throw new Error('Could not get a shipping quote for that address.')
                      setAmounts((await r.json()).amounts); setQuoting(false); return
                    }
                    const c = await fetch('/api/print/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, assetId: print?.assetId, spec, buyer: { email: form.email, name: form.name, address } }) })
                    if (!c.ok) throw new Error('Checkout could not start. Please try again.')
                    window.location = (await c.json()).url
                  } catch (e) { setError(e.message); setQuoting(false) }
                }}
                quoting={quoting}
                amounts={amounts}
                error={error}
              />
            ) : (
              <PrintPurchasePanel print={print} printStore={printStore} spec={spec} onSpecChange={setSpec} onBuy={() => setCheckout(true)} />
            )
          )}
        </div>
      </aside>
    </>
  )
}
