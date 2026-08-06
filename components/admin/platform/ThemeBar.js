import { useState, useRef } from 'react'
import { DesignSelect } from './designControls'
import { themeOptions } from './SiteSettingsPopover'
import { BrushIcon } from './SiteSettingsPopover'
import DesignControlsBody from './DesignControlsBody'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"

export default function ThemeBar({ siteConfig, onConfigChange, onEditHandles }) {
  const [designOpen, setDesignOpen] = useState(false)
  const wrapRef = useRef(null)
  const update = (patch) => onConfigChange(prev => ({ ...prev, ...patch }))

  return (
    <div ref={wrapRef} style={{ position: 'relative', padding: '12px 14px 4px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b0a490', fontWeight: 500, marginBottom: 6 }}>
        Theme
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <DesignSelect
            value={siteConfig.design?.theme || 'kyoto'}
            onChange={(e) => update({ design: { ...(siteConfig.design || {}), theme: e.target.value } })}
          >
            {themeOptions().map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </DesignSelect>
        </div>
        <button
          type="button"
          title="Design"
          onClick={() => setDesignOpen(v => !v)}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
          style={{ color: '#9e9788', background: designOpen ? 'rgba(26,18,10,0.06)' : 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
          onMouseLeave={(e) => { if (!designOpen) e.currentTarget.style.background = 'transparent' }}
        >
          <BrushIcon />
        </button>
      </div>

      {designOpen && (
        <div
          data-testid="theme-bar-design-popover"
          style={{
            position: 'absolute', top: '100%', right: 8, zIndex: 40, marginTop: 4,
            minWidth: 260, maxWidth: 'calc(100vw - 24px)',
            background: '#fbf8f1', border: '1px solid rgba(160,140,110,0.24)', borderRadius: 8,
            boxShadow: '0 12px 32px rgba(26,18,10,0.18)', padding: '4px 0',
          }}
        >
          <DesignControlsBody config={siteConfig} onChange={update} onEditHandles={onEditHandles} includeTheme={false} />
        </div>
      )}
    </div>
  )
}
