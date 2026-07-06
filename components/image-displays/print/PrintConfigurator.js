// components/image-displays/print/PrintConfigurator.js
// Right-edge slide-out drawer that configures a print: a framed "on the wall"
// preview at the top, then the size/finish/framing controls. Portable — opened
// from anywhere via PrintStoreContext (lightbox today, thumbnails later).
import React, { useEffect, useState } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'
import FramedImage from './FramedImage'
import PrintPurchasePanel from './PrintPurchasePanel'

const SERIF = '"Cormorant Garamond", Georgia, serif'
const PANEL_WIDTH = 460

function defaultSpec(print) {
  const size = print?.maxSharpSize || (print?.availableSizes || [])[0] || null
  return { size, finish: 'lustre', frame: 'none', frameColor: null, matte: false }
}

export default function PrintConfigurator({ open, print, imageUrl, printStore, onClose }) {
  const [spec, setSpec] = useState(defaultSpec(print))

  // Reset the configuration whenever a new image/print is opened.
  useEffect(() => {
    if (open) setSpec(defaultSpec(print))
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

        {/* Wall preview */}
        <div
          style={{
            margin: '0 20px', borderRadius: 8, padding: '26px 24px',
            background: 'linear-gradient(180deg, #eae2d4 0%, #e5ddce 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 180,
          }}
        >
          {imageUrl && (
            <FramedImage
              src={getSizedUrl(imageUrl, 'display')}
              alt=""
              spec={spec}
              className="object-contain"
            />
          )}
        </div>

        {/* Controls — only mounted when a print is loaded (avoids pricing a null size while closed) */}
        <div style={{ padding: '22px 20px 28px' }}>
          {print && spec.size && (
            <PrintPurchasePanel print={print} printStore={printStore} spec={spec} onSpecChange={setSpec} />
          )}
        </div>
      </aside>
    </>
  )
}
