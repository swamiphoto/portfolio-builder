// components/image-displays/print/PrintPurchasePanel.js
// Configurator controls, styled to the app's warm/parchment palette using the
// same segmented-control idiom as the site-settings toggles (a warm-tinted
// track with soft-rounded segments and a cream active fill). Rendered inside
// PrintConfigurator (the right-edge drawer).
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

function Track({ children }) {
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 2, padding: 2, background: 'rgba(120,90,60,0.10)', borderRadius: 7, width: 'fit-content', maxWidth: '100%' }}>
      {children}
    </div>
  )
}

function Segment({ active, onClick, ariaLabel, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 13px', borderRadius: 5, fontSize: 13, whiteSpace: 'nowrap',
        border: 'none', cursor: 'pointer',
        background: active ? '#f5ecd6' : 'transparent',
        color: active ? '#5c4f3a' : '#9c8a6f',
        boxShadow: active ? '0 1px 2px rgba(80,60,30,0.12)' : 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#6b5d47' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#9c8a6f' }}
    >
      {children}
    </button>
  )
}

const SWATCH_DOT = { black: '#2b2b2b', white: '#f2efe9', natural: '#c8a87a', walnut: '#5a3d2b', silver: '#c9ccce' }

export default function PrintPurchasePanel({ print, printStore, spec, onSpecChange }) {
  const markup = printStore?.markup || 3
  const set = (patch) => onSpecChange({ ...spec, ...patch })
  const sizes = print?.availableSizes || []
  const frame = SEED_CATALOG.frames.find((f) => f.id === spec.frame) || SEED_CATALOG.frames[0]
  const framed = spec.frame !== 'none'
  const price = optionPrice(SEED_CATALOG, { size: spec.size, finish: spec.finish, frame: spec.frame, matte: spec.matte }, markup)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: '#2c2416' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>Size</Label>
        <Track>
          {sizes.map((s) => (
            <Segment key={s} active={spec.size === s} onClick={() => set({ size: s })}>{`${pretty(s)} in`}</Segment>
          ))}
        </Track>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>Finish</Label>
        <Track>
          {SEED_CATALOG.finishes.map((f) => (
            <Segment key={f.id} active={spec.finish === f.id} onClick={() => set({ finish: f.id })}>{f.label}</Segment>
          ))}
        </Track>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>Framing</Label>
        <Track>
          {SEED_CATALOG.frames.map((f) => (
            <Segment
              key={f.id}
              active={spec.frame === f.id}
              onClick={() => set({ frame: f.id, frameColor: f.colors[0] || null, matte: f.id === 'none' ? false : spec.matte })}
            >
              {f.label}
            </Segment>
          ))}
        </Track>
      </div>

      {framed && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Frame color</Label>
            <Track>
              {frame.colors.map((c) => (
                <Segment key={c} active={spec.frameColor === c} ariaLabel={c} onClick={() => set({ frameColor: c })}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: SWATCH_DOT[c] || '#c8a87a', border: '1px solid rgba(0,0,0,0.15)' }} />
                  <span style={{ textTransform: 'capitalize' }}>{c}</span>
                </Segment>
              ))}
            </Track>
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
