// components/admin/platform/ThemeToolbarControl.js
// A compact appearance pill for the preview toolbar, styled like the Desktop/Mobile
// viewport toggle: the theme name + caret (opens a theme switcher) and, next to it,
// a brush icon that opens that theme's design settings. Lets users flip themes and
// tune each theme's options right where they see the effect, instead of digging
// into Site Settings.
import { useState, useRef } from 'react'
import { THEME_LIST } from '../../../common/themes'
import PopoverShell from './PopoverShell'
import DesignControlsBody from './DesignControlsBody'
import Tip from '../Tip'

const themeOptions = () => THEME_LIST.filter(t => !t.hidden).map(t => ({ value: t.id, label: t.name }))

const PILL = { display: 'flex', height: 22, borderRadius: 5, border: '1px solid rgba(26,18,10,0.11)', background: '#e8e2d9', overflow: 'hidden' }
const SEG = { display: 'flex', alignItems: 'center', gap: 4, padding: '0 9px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }

function Caret({ open }) {
  return (
    <svg width="8" height="8" viewBox="0 0 12 12" aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
      <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Same paintbrush icon as the block cards' Design button (BlockCard PaintbrushIcon).
function Brush() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  )
}

export default function ThemeToolbarControl({ config, onChange, onEditHandles }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hover, setHover] = useState(null)
  const nameRef = useRef(null)
  const brushRef = useRef(null)

  const themeId = config?.design?.theme || 'kyoto'
  const options = themeOptions()
  const current = options.find(o => o.value === themeId)?.label || options[0]?.label || 'Theme'

  const openMenu = () => { setSettingsOpen(false); setMenuOpen(o => !o) }
  const openSettings = () => { setMenuOpen(false); setSettingsOpen(o => !o) }
  const pickTheme = (v) => { onChange({ design: { ...(config?.design || {}), theme: v } }); setMenuOpen(false) }

  return (
    <div style={PILL} data-theme-toolbar>
      <button
        ref={nameRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        style={{ ...SEG, borderRight: '1px solid rgba(26,18,10,0.11)', color: menuOpen ? 'var(--text-primary)' : 'var(--text-primary)' }}
      >
        {current}
        <Caret open={menuOpen} />
      </button>
      <Tip label="Design" side="bottom">
        <button
          ref={brushRef}
          type="button"
          onClick={openSettings}
          aria-label="Design"
          aria-expanded={settingsOpen}
          style={{ ...SEG, color: settingsOpen ? 'var(--sepia-accent, #8b6f47)' : 'var(--text-muted)' }}
        >
          <Brush />
        </button>
      </Tip>

      {menuOpen && (
        <PopoverShell anchorEl={nameRef.current} onClose={() => setMenuOpen(false)} width="max-content" minWidth={150} title="Theme">
          <div role="listbox" style={{ padding: '4px 0' }}>
            {options.map(o => {
              const active = o.value === themeId
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pickTheme(o.value)}
                  onMouseEnter={() => setHover(o.value)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 14px', border: 'none', cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 11.5, letterSpacing: '0.03em',
                    background: hover === o.value ? 'var(--surface-hover, #ede8e0)' : 'transparent',
                    color: active ? 'var(--sepia-accent, #8b6f47)' : 'var(--text-primary)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </PopoverShell>
      )}

      {settingsOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setSettingsOpen(false)} width={300} maxWidth="calc(100vw - 24px)" title={`${current} settings`}>
          <DesignControlsBody config={config} onChange={onChange} onEditHandles={onEditHandles} />
        </PopoverShell>
      )}
    </div>
  )
}
