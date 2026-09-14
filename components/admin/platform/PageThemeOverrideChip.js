// Preview-toolbar indicator shown beside the site-theme pill when the open page
// overrides the site theme. It explains why the preview renders a different theme
// AND — via the brush — opens that overridden theme's design settings, which the
// site-theme brush can't reach (it only edits the site theme). Design settings are
// site-level and keyed by theme, so tuning here affects that theme wherever used;
// we spoof design.theme so the right controls render, but never let an edit change
// the actual site theme.
import { useState, useRef } from 'react'
import { pageThemeOverrideInfo } from '../../../common/themes'
import PopoverShell from './PopoverShell'
import DesignControlsBody from './DesignControlsBody'
import Tip from '../Tip'

const PILL = {
  display: 'flex', alignItems: 'stretch', height: 22, borderRadius: 5,
  border: '1px solid rgba(176,106,52,0.35)', background: 'rgba(176,106,52,0.10)', overflow: 'hidden',
}
const SEG = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '0 9px', fontFamily: 'monospace',
  fontSize: 10, letterSpacing: '0.06em', color: '#8a5326', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
}

function Brush() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  )
}

export default function PageThemeOverrideChip({ siteConfig, page, onConfigChange }) {
  const [open, setOpen] = useState(false)
  const brushRef = useRef(null)
  if (!page) return null
  const info = pageThemeOverrideInfo(siteConfig, page)
  if (!info.overridden) return null

  // DesignControlsBody keys its controls off config.design.theme. Point it at the
  // overridden theme so its controls render, but strip design.theme back to the
  // real site theme on every write so tuning never flips the whole site's theme.
  const viewConfig = { ...siteConfig, design: { ...(siteConfig?.design || {}), theme: info.pageThemeId } }
  const handleChange = (patch) => {
    const next = { ...patch }
    if (next.design) next.design = { ...next.design, theme: info.siteThemeId }
    onConfigChange?.(prev => ({ ...prev, ...next }))
  }

  return (
    <div style={PILL} data-page-theme-override>
      <Tip label={`This page overrides the site theme (${info.siteThemeName}).`}>
        <span style={SEG}>This page: {info.pageThemeName}</span>
      </Tip>
      <Tip label={`${info.pageThemeName} settings`} side="bottom">
        <button
          ref={brushRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={`${info.pageThemeName} settings`}
          aria-expanded={open}
          style={{ ...SEG, cursor: 'pointer', borderLeft: '1px solid rgba(176,106,52,0.30)', color: open ? '#6f3f1c' : '#8a5326' }}
        >
          <Brush />
        </button>
      </Tip>

      {open && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setOpen(false)} width="max-content" minWidth={300} maxWidth="calc(100vw - 24px)" title={`${info.pageThemeName} settings`}>
          <DesignControlsBody config={viewConfig} onChange={handleChange} />
        </PopoverShell>
      )}
    </div>
  )
}
