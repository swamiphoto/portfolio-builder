import { useState } from 'react'

// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children, panelCollapsed, onTogglePanel }) {
  const [viewport, setViewport] = useState('desktop')

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--desk)' }}>
      {/* Left column: site sidebar + block sidebar, flush together */}
      <div
        className="flex flex-shrink-0 h-full"
        style={{
          boxShadow: '0 0 0 1px rgba(26,18,10,0.06), 0 2px 6px rgba(26,18,10,0.06), 0 24px 48px -12px rgba(26,18,10,0.18)',
        }}
      >
        {/* Site sidebar */}
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            width: 260,
            background: '#efeae1',
            borderRight: '1px solid rgba(26,18,10,0.07)',
          }}
        >
          {sidebar}
        </div>

        {/* Block sidebar — attached to site sidebar */}
        {panel && (
          <div
            className="flex-shrink-0 flex flex-col h-full transition-all duration-300"
            style={{
              width: panelCollapsed ? 40 : 260,
              background: 'var(--panel)',
            }}
          >
            {panelCollapsed ? (
              <button
                onClick={onTogglePanel}
                className="flex-1 flex flex-col items-center justify-center gap-2 w-full transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Expand blocks panel"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.1em]"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'var(--text-muted)' }}
                >
                  Blocks
                </span>
              </button>
            ) : (
              panel
            )}
          </div>
        )}
      </div>

      {/* Right area: viewport toggle on desk + floating preview card */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Viewport toggle — sits directly on the desk surface */}
        <div className="flex items-center justify-center gap-1" style={{ height: 40 }}>
          <button
            onClick={() => setViewport('desktop')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 3,
              fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em',
              color: viewport === 'desktop' ? 'var(--text-primary)' : 'var(--text-muted)',
              background: viewport === 'desktop' ? 'rgba(26,18,10,0.07)' : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <svg width="13" height="11" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <rect x="1" y="1" width="22" height="14" rx="2" />
              <path strokeLinecap="round" d="M8 19h8M12 15v4" />
            </svg>
            Desktop
          </button>
          <button
            onClick={() => setViewport('mobile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 3,
              fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em',
              color: viewport === 'mobile' ? 'var(--text-primary)' : 'var(--text-muted)',
              background: viewport === 'mobile' ? 'rgba(26,18,10,0.07)' : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <svg width="9" height="13" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <rect x="1" y="1" width="14" height="22" rx="2.5" />
              <circle cx="8" cy="19" r="1" fill="currentColor" stroke="none" />
            </svg>
            Mobile
          </button>
        </div>

        {/* Preview card — floating, top + side margins, flows to bottom */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            marginLeft: 32,
            marginRight: 32,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            boxShadow: '0 0 0 1px rgba(26,18,10,0.06), 0 2px 6px rgba(26,18,10,0.06), 0 24px 48px -12px rgba(26,18,10,0.18)',
            background: '#fbf9f4',
          }}
        >
          <div className="h-full overflow-auto flex justify-center">
            <div
              className="h-full"
              style={{
                width: viewport === 'mobile' ? 390 : '100%',
                transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                flexShrink: 0,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
