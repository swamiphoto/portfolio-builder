import { useState } from 'react'
import { ViewportProvider } from '../../../contexts/ViewportContext'
import Tip from '../Tip'

// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children, panelCollapsed, onTogglePanel, sidebarCollapsed, onToggleSidebar, panelLabel, username, pagePath }) {
  const [viewport, setViewport] = useState('desktop')
  const isMobile = viewport === 'mobile'

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--desk)' }}>
      {/* Left column: site sidebar + block sidebar, flush together */}
      <div
        className="flex flex-shrink-0 h-full"
        style={{
          boxShadow: '0 0 0 1px rgba(26,18,10,0.06), 0 2px 6px rgba(26,18,10,0.06), 0 24px 48px -12px rgba(26,18,10,0.18)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Site sidebar */}
        <div
          className="flex-shrink-0 h-full overflow-hidden relative"
          style={{
            width: sidebarCollapsed ? 40 : 256,
            background: '#efeae1',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'width',
          }}
        >
          {/* Full sidebar — fades out when collapsing */}
          <div style={{
            position: 'absolute', inset: 0,
            opacity: sidebarCollapsed ? 0 : 1,
            transition: sidebarCollapsed ? 'opacity 0.1s' : 'opacity 0.15s 0.15s',
            pointerEvents: sidebarCollapsed ? 'none' : 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            {sidebar}
          </div>
          {/* Collapsed tab — fades in after width has started closing */}
          <Tip label="Expand pages panel" side="right">
          <button
            onClick={onToggleSidebar}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 w-full transition-colors"
            style={{
              color: '#b0a490',
              opacity: sidebarCollapsed ? 1 : 0,
              transition: sidebarCollapsed ? 'opacity 0.15s 0.15s' : 'opacity 0.1s',
              pointerEvents: sidebarCollapsed ? 'auto' : 'none',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#5a5043' }}>
              Pages
            </span>
          </button>
          </Tip>
        </div>

        {/* Block sidebar — attached to site sidebar */}
        {panel && (
          <div
            className="flex-shrink-0 h-full overflow-hidden relative"
            style={{
              width: panelCollapsed ? 40 : 260,
              background: '#efeae1',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'width',
            }}
          >
            {/* Divider — soft sepia shadow when block panel is open, single hairline when collapsed */}
            {panelCollapsed ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: 1,
                  pointerEvents: 'none',
                  background: 'rgba(26,18,10,0.10)',
                  zIndex: 5,
                }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: 24,
                  pointerEvents: 'none',
                  background: 'linear-gradient(to right, rgba(60,40,15,0.06) 0%, rgba(60,40,15,0.03) 25%, rgba(60,40,15,0) 100%)',
                  zIndex: 5,
                }}
              />
            )}
            {/* Full panel — always rendered, clipped by overflow hidden as width collapses */}
            <div style={{ width: 260, height: '100%', display: 'flex', flexDirection: 'column',
              opacity: panelCollapsed ? 0 : 1,
              transition: panelCollapsed ? 'opacity 0.15s' : 'opacity 0.15s 0.1s',
              pointerEvents: panelCollapsed ? 'none' : 'auto',
            }}>
              {panel}
            </div>
            {/* Collapsed tab — fades in once width is nearly closed */}
            <Tip label="Expand blocks panel" side="right">
            <button
              onClick={onTogglePanel}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 w-full"
              style={{
                color: '#b0a490',
                opacity: panelCollapsed ? 1 : 0,
                transition: panelCollapsed ? 'opacity 0.15s 0.2s' : 'opacity 0.1s',
                pointerEvents: panelCollapsed ? 'auto' : 'none',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#5a5043' }}>
                {panelLabel || 'Blocks'}
              </span>
            </button>
            </Tip>
          </div>
        )}
      </div>

      {/* Right area: toolbar + preview pane */}
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>

          {/* Toolbar — URL bar + viewport toggle centered above preview */}
          <div
            className="flex-shrink-0 flex items-center justify-center gap-2 px-4"
            style={{ height: 44 }}
          >
            {/* URL bar */}
            {username && (
              <div
                className="flex items-center gap-1.5 flex-shrink-0"
                style={{
                  height: 22, paddingLeft: 8, paddingRight: 10,
                  borderRadius: 5,
                  background: '#e8e2d9',
                  border: '1px solid rgba(26,18,10,0.11)',
                }}
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ flexShrink: 0, color: '#3a362f' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#a09080' }}>{username}.sepia.photo</span>
                  {pagePath && <span style={{ color: '#3a362f' }}>{pagePath}</span>}
                </span>
              </div>
            )}

            {/* Viewport toggle */}
            <div style={{ display: 'flex', height: 22, borderRadius: 5, border: '1px solid rgba(26,18,10,0.11)', background: '#e8e2d9', overflow: 'hidden' }}>
              <button
                onClick={() => setViewport('desktop')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '0 9px',
                  fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em',
                  color: !isMobile ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none', borderRight: '1px solid rgba(26,18,10,0.11)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <svg width="12" height="10" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <rect x="1" y="1" width="22" height="14" rx="2" />
                  <path strokeLinecap="round" d="M8 19h8M12 15v4" />
                </svg>
                Desktop
              </button>
              <button
                onClick={() => setViewport('mobile')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '0 9px',
                  fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em',
                  color: isMobile ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <svg width="8" height="12" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <rect x="1" y="1" width="14" height="22" rx="2.5" />
                  <circle cx="8" cy="19" r="1" fill="currentColor" stroke="none" />
                </svg>
                Mobile
              </button>
            </div>
          </div>

          {/* Preview area — padding top/sides only, pane flush to bottom */}
          <div className="flex-1 flex justify-center" style={{ padding: '0 28px', minHeight: 0 }}>
            <div
              style={{
                flex: isMobile ? '0 0 390px' : '1',
                minWidth: 0,
                borderRadius: '6px 6px 0 0',
                boxShadow: '0 0 0 1px rgba(26,18,10,0.06), 0 2px 6px rgba(26,18,10,0.06), 0 24px 48px -12px rgba(26,18,10,0.18)',
                background: '#fbf9f4',
                transition: 'flex 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: 'translateZ(0)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="flex-1 overflow-y-auto">
                <ViewportProvider value={viewport}>
                  {children}
                </ViewportProvider>
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}
