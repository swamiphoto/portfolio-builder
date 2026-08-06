import { useState, useRef } from 'react'
import PopoverShell from './PopoverShell'
import { themeOptions, BrushIcon } from './SiteSettingsPopover'
import DesignControlsBody from './DesignControlsBody'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"

function Caret() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#a8967a" strokeWidth={2} style={{ pointerEvents: 'none', flexShrink: 0 }}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The theme control above the Pages list: one integrated dropdown (a native
// select for the theme) with the design brush tucked just left of the caret, all
// inside a single bordered container. The brush opens the shared design controls
// (everything except the theme itself) in a popover that opens toward the canvas.
export default function ThemeBar({ siteConfig, onConfigChange, onEditHandles }) {
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)
  const update = (patch) => onConfigChange(prev => ({ ...prev, ...patch }))

  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b0a490', fontWeight: 500, marginBottom: 6 }}>
        Theme
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          border: '1px solid rgba(160,140,110,0.42)', borderRadius: 7,
          background: '#fffdf8', padding: '0 8px 0 2px', height: 34,
        }}
      >
        <select
          value={siteConfig.design?.theme || 'kyoto'}
          onChange={(e) => update({ design: { ...(siteConfig.design || {}), theme: e.target.value } })}
          style={{
            flex: 1, minWidth: 0, height: '100%',
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            background: 'transparent', border: 'none', outline: 'none',
            padding: '0 4px 0 10px', fontSize: 13, color: '#2c2416', cursor: 'pointer',
          }}
        >
          {themeOptions().map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>

        <button
          ref={brushRef}
          type="button"
          title="Design"
          onClick={() => setDesignOpen(v => !v)}
          className="flex items-center justify-center rounded transition-colors flex-shrink-0"
          style={{ width: 24, height: 24, color: '#9e9788', background: designOpen ? 'rgba(26,18,10,0.06)' : 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
          onMouseLeave={(e) => { if (!designOpen) e.currentTarget.style.background = 'transparent' }}
        >
          <BrushIcon />
        </button>

        <Caret />
      </div>

      {designOpen && (
        <PopoverShell
          anchorEl={brushRef.current}
          placement="right"
          onClose={() => setDesignOpen(false)}
          width="max-content"
          minWidth={272}
          maxWidth="calc(100vw - 24px)"
          title="Design"
        >
          <div data-testid="theme-bar-design-popover" style={{ padding: '4px 0' }}>
            <DesignControlsBody config={siteConfig} onChange={update} onEditHandles={onEditHandles} includeTheme={false} />
          </div>
        </PopoverShell>
      )}
    </div>
  )
}
