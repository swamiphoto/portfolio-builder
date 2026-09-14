// Preview-toolbar indicator shown beside the site-theme pill when the open page
// overrides the site theme. It explains why the preview renders a different theme
// and gives two actions right here:
//   • the underlined name opens a small "Page theme" popover to change or clear
//     the override (the same control that lives in Page settings), and
//   • the brush opens that overridden theme's design settings (which the
//     site-theme brush can't reach — it only edits the site theme).
// Design settings are site-level and keyed by theme, so we point the controls at
// the overridden theme but strip design.theme back to the real site theme on
// every write, so tuning never flips the whole site.
import { useState, useRef } from 'react'
import { pageThemeOverrideInfo, THEME_LIST } from '../../../common/themes'
import PopoverShell from './PopoverShell'
import DesignControlsBody from './DesignControlsBody'
import Tip from '../Tip'

// No background fill — reads like the other toolbar controls; the amber border +
// text carry the "overridden" signal.
const PILL = {
  display: 'flex', alignItems: 'stretch', height: 22, borderRadius: 5,
  border: '1px solid rgba(176,106,52,0.35)', overflow: 'hidden',
}
const SEG = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '0 9px', fontFamily: 'monospace',
  fontSize: 10, letterSpacing: '0.06em', color: '#8a5326', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
}
const SELECT = {
  width: '100%', fontSize: 13, color: '#1d1b17', background: 'transparent',
  padding: '5px 2px', border: 'none', borderBottom: '1px solid rgba(26,18,10,0.14)', outline: 'none', cursor: 'pointer',
}

function Brush() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  )
}

export default function PageThemeOverrideChip({ siteConfig, page, onConfigChange, onPageChange }) {
  const [themeOpen, setThemeOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  const nameRef = useRef(null)
  const brushRef = useRef(null)
  if (!page) return null
  const info = pageThemeOverrideInfo(siteConfig, page)
  if (!info.overridden) return null

  // DesignControlsBody keys its controls off config.design.theme. Point it at the
  // overridden theme so its controls render, but strip design.theme back to the
  // real site theme on every write so tuning never flips the whole site's theme.
  const viewConfig = { ...siteConfig, design: { ...(siteConfig?.design || {}), theme: info.pageThemeId } }
  const handleDesignChange = (patch) => {
    const next = { ...patch }
    if (next.design) next.design = { ...next.design, theme: info.siteThemeId }
    onConfigChange?.(prev => ({ ...prev, ...next }))
  }

  return (
    <div style={PILL} data-page-theme-override>
      <Tip label="Change the theme for this page">
        <button
          ref={nameRef}
          type="button"
          onClick={() => { setDesignOpen(false); setThemeOpen(o => !o) }}
          aria-haspopup="listbox"
          aria-expanded={themeOpen}
          style={{ ...SEG, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(138,83,38,0.45)', textUnderlineOffset: 2 }}
        >
          This page: {info.pageThemeName}
        </button>
      </Tip>
      <Tip label={`${info.pageThemeName} settings`} side="bottom">
        <button
          ref={brushRef}
          type="button"
          onClick={() => { setThemeOpen(false); setDesignOpen(o => !o) }}
          aria-label={`${info.pageThemeName} settings`}
          aria-expanded={designOpen}
          style={{ ...SEG, cursor: 'pointer', borderLeft: '1px solid rgba(176,106,52,0.30)', color: designOpen ? '#6f3f1c' : '#8a5326' }}
        >
          <Brush />
        </button>
      </Tip>

      {themeOpen && (
        <PopoverShell anchorEl={nameRef.current} onClose={() => setThemeOpen(false)} width="max-content" minWidth={240} title="Page theme">
          <div style={{ padding: '10px 12px' }}>
            <p style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              The site theme is <strong style={{ color: 'var(--text-secondary)' }}>{info.siteThemeName}</strong>. Pick another to override it for this page only, or choose the site theme to revert.
            </p>
            <select
              style={SELECT}
              value={page.themeOverride || ''}
              onChange={(e) => { onPageChange?.({ ...page, themeOverride: e.target.value || null }); setThemeOpen(false) }}
            >
              <option value="">{info.siteThemeName} (site theme)</option>
              {THEME_LIST.filter((t) => t.id !== info.siteThemeId && (!t.hidden || t.id === page.themeOverride)).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </PopoverShell>
      )}

      {designOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setDesignOpen(false)} width="max-content" minWidth={300} maxWidth="calc(100vw - 24px)" title={`${info.pageThemeName} settings`}>
          <DesignControlsBody config={viewConfig} onChange={handleDesignChange} />
        </PopoverShell>
      )}
    </div>
  )
}
