// components/admin/platform/PageThemeControl.js
// Page-aware theme selector, used in both the studio toolbar and Page settings.
// It shows the page's EFFECTIVE theme (its override, else the site theme), marks
// it "(overridden)" when the page overrides the site, and lets you change it:
// the theme marked "(site theme)" reverts the override, any other sets it. With
// no page (Library/Cover view) it controls the site theme instead. The brush
// opens the effective theme's design settings — design settings are site-level
// and keyed by theme, so we point the controls at the effective theme but strip
// design.theme back to the real site theme on every write, so tuning the look
// never flips the site's active theme.
import { useState, useRef } from 'react'
import { THEME_LIST, pageThemeOverrideInfo } from '../../../common/themes'
import PopoverShell from './PopoverShell'
import DesignControlsBody from './DesignControlsBody'
import Tip from '../Tip'

const PILL = { display: 'flex', height: 22, borderRadius: 5, border: '1px solid rgba(26,18,10,0.11)', background: '#e8e2d9', overflow: 'hidden' }
const SEG = { display: 'flex', alignItems: 'center', gap: 4, padding: '0 9px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }

function Caret({ open }) {
  return (
    <svg width="8" height="8" viewBox="0 0 12 12" aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
      <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Brush() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  )
}

export default function PageThemeControl({ siteConfig, page, onConfigChange, onPageChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hover, setHover] = useState(null)
  const nameRef = useRef(null)
  const brushRef = useRef(null)

  const info = pageThemeOverrideInfo(siteConfig, page)
  const pageScoped = !!(page && onPageChange)
  const options = THEME_LIST.filter(t => !t.hidden || t.id === info.pageThemeId)

  const pickTheme = (id) => {
    setMenuOpen(false)
    if (pageScoped) {
      // The site theme option clears the override; anything else sets it.
      onPageChange({ ...page, themeOverride: id === info.siteThemeId ? null : id })
    } else {
      onConfigChange?.(prev => ({ ...prev, design: { ...(prev?.design || {}), theme: id } }))
    }
  }

  // Point the design controls at the effective theme, but keep the site's active
  // theme fixed on every write.
  const viewConfig = { ...siteConfig, design: { ...(siteConfig?.design || {}), theme: info.pageThemeId } }
  const handleDesignChange = (patch) => {
    const next = { ...patch }
    if (next.design) next.design = { ...next.design, theme: info.siteThemeId }
    onConfigChange?.(prev => ({ ...prev, ...next }))
  }

  return (
    <div style={PILL} data-page-theme-control>
      <button
        ref={nameRef}
        type="button"
        onClick={() => { setSettingsOpen(false); setMenuOpen(o => !o) }}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        style={{ ...SEG, borderRight: '1px solid rgba(26,18,10,0.11)' }}
      >
        {info.pageThemeName}
        {info.overridden && <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>(overridden)</span>}
        <Caret open={menuOpen} />
      </button>
      <Tip label="Design" side="bottom">
        <button
          ref={brushRef}
          type="button"
          onClick={() => { setMenuOpen(false); setSettingsOpen(o => !o) }}
          aria-label="Design"
          aria-expanded={settingsOpen}
          style={{ ...SEG, color: settingsOpen ? 'var(--sepia-accent, #8b6f47)' : 'var(--text-muted)' }}
        >
          <Brush />
        </button>
      </Tip>

      {menuOpen && (
        <PopoverShell anchorEl={nameRef.current} onClose={() => setMenuOpen(false)} width="max-content" minWidth={170} title="Theme">
          <div role="listbox" style={{ padding: '4px 0' }}>
            {options.map(o => {
              const active = o.id === info.pageThemeId
              const isSite = o.id === info.siteThemeId
              return (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pickTheme(o.id)}
                  onMouseEnter={() => setHover(o.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 14px', border: 'none', cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 11.5, letterSpacing: '0.03em',
                    background: hover === o.id ? 'var(--surface-hover, #ede8e0)' : 'transparent',
                    color: active ? 'var(--sepia-accent, #8b6f47)' : 'var(--text-primary)',
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.name}{isSite && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (site theme)</span>}
                </button>
              )
            })}
          </div>
        </PopoverShell>
      )}

      {settingsOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setSettingsOpen(false)} width="max-content" minWidth={300} maxWidth="calc(100vw - 24px)" title={`${info.pageThemeName} settings`}>
          <DesignControlsBody config={viewConfig} onChange={handleDesignChange} />
        </PopoverShell>
      )}
    </div>
  )
}
