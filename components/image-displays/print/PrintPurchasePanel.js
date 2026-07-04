// components/image-displays/print/PrintPurchasePanel.js
// Configurator controls, styled to the app's warm/parchment palette. Rendered
// inside PrintConfigurator (the right-edge drawer).
import React from 'react'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { optionPrice } from '../../../common/print/buyerPricing'

const SERIF = '"Cormorant Garamond", Georgia, serif'
const pretty = (id) => id.replace('x', ' × ')

function Label({ children }) {
  return (
    <p style={{ margin: 0, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a8967a', fontWeight: 500 }}>
      {children}
    </p>
  )
}

function Chip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 13px',
        borderRadius: 999,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        background: active ? '#8b6f47' : 'transparent',
        color: active ? '#faf6ef' : '#6b5d47',
        border: `1px solid ${active ? '#8b6f47' : 'rgba(160,140,110,0.35)'}`,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'rgba(139,111,71,0.6)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'rgba(160,140,110,0.35)' }}
    >
      {label}
    </button>
  )
}

function Swatch({ active, color, onClick }) {
  const dot = { black: '#2b2b2b', white: '#f2efe9', natural: '#c8a87a', walnut: '#5a3d2b', silver: '#c9ccce' }[color] || '#c8a87a'
  return (
    <button
      type="button"
      aria-label={color}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px 5px 6px',
        borderRadius: 999, fontSize: 12.5, cursor: 'pointer', textTransform: 'capitalize',
        background: active ? 'rgba(139,111,71,0.12)' : 'transparent',
        color: '#6b5d47',
        border: `1px solid ${active ? 'rgba(139,111,71,0.55)' : 'rgba(160,140,110,0.3)'}`,
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: dot, border: '1px solid rgba(0,0,0,0.15)' }} />
      {color}
    </button>
  )
}

export default function PrintPurchasePanel({ print, printStore, spec, onSpecChange }) {
  const markup = printStore?.markup || 3
  const set = (patch) => onSpecChange({ ...spec, ...patch })
  const sizes = print?.availableSizes || []
  const frame = SEED_CATALOG.frames.find((f) => f.id === spec.frame) || SEED_CATALOG.frames[0]
  const framed = spec.frame !== 'none'
  const price = optionPrice(SEED_CATALOG, { size: spec.size, finish: spec.finish, frame: spec.frame, matte: spec.matte }, markup)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#2c2416' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Label>Size</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {sizes.map((s) => (
            <Chip key={s} active={spec.size === s} label={`${pretty(s)} in`} onClick={() => set({ size: s })} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Label>Finish</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {SEED_CATALOG.finishes.map((f) => (
            <Chip key={f.id} active={spec.finish === f.id} label={f.label} onClick={() => set({ finish: f.id })} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Label>Framing</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {SEED_CATALOG.frames.map((f) => (
            <Chip
              key={f.id}
              active={spec.frame === f.id}
              label={f.label}
              onClick={() => set({ frame: f.id, frameColor: f.colors[0] || null, matte: f.id === 'none' ? false : spec.matte })}
            />
          ))}
        </div>
      </div>

      {framed && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Label>Frame color</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {frame.colors.map((c) => (
                <Swatch key={c} active={spec.frameColor === c} color={c} onClick={() => set({ frameColor: c })} />
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: '#5c4f3a', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!spec.matte} onChange={(e) => set({ matte: e.target.checked })} style={{ accentColor: '#8b6f47' }} />
            With mat
          </label>
        </>
      )}

      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(160,140,110,0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          disabled
          style={{
            width: '100%', padding: '13px', borderRadius: 6, border: 'none',
            fontFamily: SERIF, fontSize: 18, letterSpacing: '0.01em',
            background: '#2c2416', color: '#f4efe8', opacity: 0.85, cursor: 'not-allowed',
          }}
        >
          Buy this print — ${price}
        </button>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, letterSpacing: '0.04em', color: '#a8967a' }}>Checkout coming soon</p>
      </div>
    </div>
  )
}
