import { useState } from 'react'
import { PillToggle, DesignSection } from '../platform/designControls'
import { LAYOUT_OPTIONS, SIZE_OPTIONS } from '@/common/markdownImageOptions'
import { CAPTION_STYLE_OPTIONS } from '@/common/captionStyles'

const btn = { background: '#fff', border: '1px solid rgba(160,140,110,0.4)', borderRadius: 5, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#2c2416' }

const menuItemBtn = { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: '#2c2416', borderRadius: 4 }

// PillToggle destructures its options as { value, label }, but our option
// lists (and CAPTION_STYLE_OPTIONS) use { id, label } — map id -> value so
// the pills actually track the active state and emit the id, not undefined.
const layoutPillOptions = LAYOUT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))
const sizePillOptions = SIZE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))
const captionStylePillOptions = CAPTION_STYLE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))

// Overlay control cluster for one image inside the Markdown editor. `attrs` is
// { layout, size, style, caption }. Callers wire the handlers to DOM mutations.
// Caption text itself is edited elsewhere; this overlay only handles layout/
// design and ordering/removal.
export default function MarkdownImageControls({ attrs, onAttr, onRemove, onMove }) {
  const [showDesign, setShowDesign] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const sizeDisabled = attrs.layout === 'full-bleed'
  return (
    <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          aria-label="Design"
          title="Design"
          style={btn}
          onClick={() => {
            setShowDesign((v) => !v)
            setShowMenu(false)
          }}
        >
          🖌
        </button>
        <button
          type="button"
          aria-label="More options"
          title="More"
          style={btn}
          onClick={() => {
            setShowMenu((v) => !v)
            setShowDesign(false)
          }}
        >
          ⋯
        </button>
      </div>
      {showMenu && (
        <div style={{ background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', borderRadius: 8, padding: 4, width: 140 }}>
          <button type="button" aria-label="Move up" style={menuItemBtn} onClick={() => onMove(-1)}>Move up</button>
          <button type="button" aria-label="Move down" style={menuItemBtn} onClick={() => onMove(1)}>Move down</button>
          <button type="button" aria-label="Remove" style={{ ...menuItemBtn, color: '#b03030' }} onClick={onRemove}>Remove</button>
        </div>
      )}
      {showDesign && (
        <div style={{ background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', borderRadius: 8, padding: 10, width: 220 }} className="space-y-2">
          <DesignSection label="Layout">
            <PillToggle value={attrs.layout || 'centered'} onChange={(v) => onAttr('layout', v)} options={layoutPillOptions} />
          </DesignSection>
          {!sizeDisabled && (
            <DesignSection label="Size">
              <PillToggle value={attrs.size || 'l'} onChange={(v) => onAttr('size', v)} options={sizePillOptions} />
            </DesignSection>
          )}
          <DesignSection label="Caption">
            <PillToggle value={attrs.style || 'sans'} onChange={(v) => onAttr('style', v)} options={captionStylePillOptions} />
          </DesignSection>
        </div>
      )}
    </div>
  )
}
