import { useState, useRef, useEffect } from 'react'
import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'
import { ThumbMenu, PaintbrushIcon, TrashIcon } from './BlockCard'
import { LAYOUT_OPTIONS, SIZE_OPTIONS } from '@/common/markdownImageOptions'
import { CAPTION_STYLE_OPTIONS } from '@/common/captionStyles'

// PillToggle destructures its options as { value, label }, but our option lists
// use { id, label } — map id -> value so the pills track state and emit the id.
const layoutPillOptions = LAYOUT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))
const sizePillOptions = SIZE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))
const captionStylePillOptions = CAPTION_STYLE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))

// A small light chip that reads on top of a photo — same look as the block
// thumbnail's ThumbMenu button (light tone), so the on-image brush matches.
const CHIP = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 22, height: 18, borderRadius: 3, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.9)', color: '#3a362f',
  boxShadow: '0 1px 2px rgba(0,0,0,0.15)', transition: 'background 120ms', padding: 0,
}

function ChevronUp() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4-4 4 4" /></svg>
}
function ChevronDown() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
}

// Overlay controls for one image inside the Markdown editor, styled to match the
// block sidebar: a brush chip (Design popover) + a "⋯" ThumbMenu (Move / Remove).
// `attrs` is { layout, size, style }. `onLockChange(bool)` fires while either menu
// is open so the panel keeps the hover-revealed overlay pinned during interaction.
export default function MarkdownImageControls({ attrs, onAttr, onRemove, onMove, onLockChange }) {
  const [designOpen, setDesignOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const brushRef = useRef(null)
  const sizeDisabled = attrs.layout === 'full-bleed'

  useEffect(() => { onLockChange?.(designOpen || menuOpen) }, [designOpen, menuOpen, onLockChange])

  const menuItems = [
    { label: 'Move up', icon: <ChevronUp />, onClick: () => onMove(-1) },
    { label: 'Move down', icon: <ChevronDown />, onClick: () => onMove(1) },
    { label: 'Remove', icon: <TrashIcon />, danger: true, onClick: () => onRemove() },
  ]

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        ref={brushRef}
        type="button"
        aria-label="Design"
        title="Design"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setDesignOpen((v) => !v) }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#fff' }}
        onMouseLeave={(e) => { if (!designOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.9)' }}
        style={{ ...CHIP, ...(designOpen ? { background: '#fff' } : {}) }}
      >
        <PaintbrushIcon />
      </button>
      <ThumbMenu tone="light" size={22} items={menuItems} onOpenChange={setMenuOpen} />
      {designOpen && (
        <PopoverShell
          anchorEl={brushRef.current}
          onClose={() => setDesignOpen(false)}
          width="max-content"
          minWidth={272}
          maxWidth="calc(100vw - 24px)"
          title="Design"
        >
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
        </PopoverShell>
      )}
    </div>
  )
}
