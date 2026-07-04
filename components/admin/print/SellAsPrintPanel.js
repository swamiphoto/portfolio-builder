// components/admin/print/SellAsPrintPanel.js
import React, { useRef } from 'react'

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'
const SERIF = '"Cormorant Garamond", "Muse", Georgia, serif'
const BORDER = 'rgba(160,140,110,0.18)'
const LARGEST_SIZE_ID = '24x36' // largest size in SEED_CATALOG

const prettySize = (id) => (id ? id.replace('x', ' × ') : '')

export default function SellAsPrintPanel({ asset, onSellChange, onUploadMaster }) {
  const print = asset?.print || {}
  const sellable = !!print.sellable
  const canGoBigger = !print.maxSharpSize || print.maxSharpSize !== LARGEST_SIZE_ID
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // allow re-selecting the same file
    if (file) onUploadMaster(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Full-width toggle row — the whole thing is the click target */}
      <button
        type="button"
        role="switch"
        aria-checked={sellable}
        aria-label="Sell as print"
        onClick={() => onSellChange(!sellable)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', boxSizing: 'border-box', padding: '9px 11px',
          borderRadius: 5, textAlign: 'left', cursor: 'pointer',
          background: sellable ? '#ede8df' : 'transparent',
          border: `1px solid ${sellable ? 'rgba(139,111,71,0.35)' : BORDER}`,
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { if (!sellable) e.currentTarget.style.background = 'rgba(160,140,110,0.06)' }}
        onMouseLeave={(e) => { if (!sellable) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.02em', color: sellable ? '#2c2416' : '#a8967a' }}>
          {sellable ? 'For sale' : 'Not for sale'}
        </span>
        <span
          aria-hidden="true"
          style={{
            position: 'relative', width: 30, height: 16, borderRadius: 999, flexShrink: 0,
            background: sellable ? '#8b6f47' : 'rgba(160,140,110,0.3)',
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: sellable ? 16 : 2, width: 12, height: 12,
            borderRadius: '50%', background: '#fdfbf7', boxShadow: '0 1px 1px rgba(44,36,22,0.2)',
            transition: 'left 0.15s',
          }} />
        </span>
      </button>

      {sellable && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <p style={{
            margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.35,
            color: print.maxSharpSize ? '#5c4f3a' : '#a8563a',
          }}>
            {print.maxSharpSize
              ? `Prints sharply up to ${prettySize(print.maxSharpSize)} in.`
              : 'Too small to print sharply — upload a higher-resolution file below.'}
          </p>

          {print.availableSizes?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {print.availableSizes.map((s) => (
                <span key={s} style={{
                  fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.02em', color: '#7a6b55',
                  background: '#ede8df', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '2px 6px',
                }}>
                  {s.replace('x', '×')}
                </span>
              ))}
            </div>
          )}

          {canGoBigger && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  alignSelf: 'flex-start', fontFamily: MONO, fontSize: 10, letterSpacing: '0.02em',
                  color: '#7a6b55', background: '#f9f6f1', border: `1px solid ${BORDER}`,
                  borderRadius: 4, padding: '6px 11px', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f2ece2' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f1' }}
              >
                {print.masterStorageKey ? 'Replace print file' : 'Upload larger version'}
              </button>
              <p style={{ margin: 0, fontFamily: MONO, fontSize: 9, letterSpacing: '0.02em', color: '#b0a490', lineHeight: 1.4 }}>
                Upload a higher-resolution file to offer larger sizes.
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="Upload a higher-resolution file"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}
