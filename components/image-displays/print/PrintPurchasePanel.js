// components/image-displays/print/PrintPurchasePanel.js
// Configurator controls, styled to the app's warm/parchment palette using the
// same segmented-control idiom as the site-settings toggles (a warm-tinted
// track with soft-rounded segments and a cream active fill). Rendered inside
// PrintConfigurator (the right-edge drawer).
import React from 'react'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { optionPrice } from '../../../common/print/buyerPricing'

const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif'
const pretty = (id) => id.replace('x', ' × ')

function Label({ children }) {
  return (
    <p style={{ margin: 0, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a8967a', fontWeight: 500 }}>
      {children}
    </p>
  )
}

// Matches the design-panel PillToggle: inset track, lifted cream active pill.
function Track({ children }) {
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 1, padding: 2, background: 'rgba(120,90,60,0.11)', boxShadow: 'inset 0 1px 1.5px rgba(60,40,15,0.10)', borderRadius: 7, width: 'fit-content', maxWidth: '100%' }}>
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
        padding: '5px 12px', minHeight: 26, borderRadius: 5, fontSize: 12.5, whiteSpace: 'nowrap',
        border: 'none', cursor: 'pointer',
        fontWeight: active ? 500 : 400,
        background: active ? '#f5ecd6' : 'transparent',
        color: active ? '#2c2416' : 'var(--text-secondary, #7a6b55)',
        boxShadow: active ? '0 1px 2px rgba(60,40,15,0.14), 0 0 0 0.5px rgba(60,40,15,0.08)' : 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(120,90,60,0.10)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

const SWATCH_DOT = { black: '#2b2b2b', white: '#f2efe9', natural: '#c8a87a', walnut: '#5a3d2b', silver: '#c9ccce' }

export default function PrintPurchasePanel({ print, printStore, spec, onSpecChange, onBuy }) {
  const markup = printStore?.markup || 3
  const set = (patch) => onSpecChange({ ...spec, ...patch })
  const sizes = print?.availableSizes || []
  const frame = SEED_CATALOG.frames.find((f) => f.id === spec.frame) || SEED_CATALOG.frames[0]
  const framed = spec.frame !== 'none'
  const price = optionPrice(SEED_CATALOG, { size: spec.size, finish: spec.finish, frame: spec.frame, matte: spec.matte }, markup)

  // Catalog sizes are stored portrait (wIn < hIn); show them oriented to the image.
  const landscape = print?.orientation === 'landscape'
  const sizeLabel = (id) => {
    const sz = SEED_CATALOG.sizes.find((s) => s.id === id)
    if (!sz) return `${pretty(id)} in`
    const [a, b] = landscape ? [sz.hIn, sz.wIn] : [sz.wIn, sz.hIn]
    return `${a} × ${b} in`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: '#2c2416' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>Size</Label>
        <Track>
          {sizes.map((s) => (
            <Segment key={s} active={spec.size === s} onClick={() => set({ size: s })}>{sizeLabel(s)}</Segment>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Mat</Label>
            <Track>
              <Segment active={!spec.matte} onClick={() => set({ matte: false })}>No mat</Segment>
              <Segment active={!!spec.matte} onClick={() => set({ matte: true })}>With mat</Segment>
            </Track>
          </div>
        </>
      )}

      {/* Buy CTA — sans-serif, site button style, pinned to the bottom while the
          rest of the panel scrolls. Negative side margins break it full-width out
          of the drawer's 20px padding; the drawer bg covers content scrolling under. */}
      <div style={{ position: 'sticky', bottom: 0, marginTop: 10, marginLeft: -20, marginRight: -20, padding: '14px 20px 16px', background: '#f4efe8', borderTop: '1px solid rgba(160,140,110,0.25)' }}>
        <button
          type="button"
          onClick={onBuy}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 6, border: 'none',
            fontFamily: SANS, fontSize: 14, fontWeight: 500, letterSpacing: '0.01em',
            background: '#2c2416', color: '#f4efe8', cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3a2f22' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#2c2416' }}
        >
          Buy this print · ${price}
        </button>
      </div>
    </div>
  )
}
