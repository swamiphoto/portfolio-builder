import { useState } from 'react'
import { PillToggle, DesignSection } from '../platform/designControls'
import { LAYOUT_OPTIONS, SIZE_OPTIONS } from '@/common/markdownImageOptions'
import { CAPTION_STYLE_OPTIONS } from '@/common/captionStyles'

const btn = { background: '#fff', border: '1px solid rgba(160,140,110,0.4)', borderRadius: 5, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#2c2416' }

// PillToggle destructures its options as { value, label }, but our option
// lists (and CAPTION_STYLE_OPTIONS) use { id, label } — map id -> value so
// the pills actually track the active state and emit the id, not undefined.
const layoutPillOptions = LAYOUT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))
const sizePillOptions = SIZE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))
const captionStylePillOptions = CAPTION_STYLE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))

// Overlay control cluster for one image inside the Markdown editor. `attrs` is
// { layout, size, style, caption }. Callers wire the handlers to DOM mutations.
export default function MarkdownImageControls({ attrs, onAttr, onCaption, onRemove, onMove }) {
  const [showDesign, setShowDesign] = useState(false)
  const sizeDisabled = attrs.layout === 'full-bleed'
  return (
    <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" aria-label="Move up" title="Move up" style={btn} onClick={() => onMove(-1)}>↑</button>
        <button type="button" aria-label="Move down" title="Move down" style={btn} onClick={() => onMove(1)}>↓</button>
        <button type="button" aria-label="Design" title="Design" style={btn} onClick={() => setShowDesign((v) => !v)}>✎</button>
        <button type="button" aria-label="Remove" title="Remove" style={{ ...btn, color: '#b03030' }} onClick={onRemove}>✕</button>
      </div>
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
      <input
        defaultValue={attrs.caption || ''}
        placeholder="Caption…"
        onChange={(e) => onCaption(e.target.value)}
        style={{ width: 200, fontSize: 12, padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(160,140,110,0.4)', background: 'rgba(255,253,248,0.9)' }}
      />
    </div>
  )
}
