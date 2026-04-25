// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children, panelCollapsed, onTogglePanel }) {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--desk)' }}>
      {/* Site sidebar — flush to edges */}
      <div
        className="flex-shrink-0 flex flex-col h-full overflow-hidden"
        style={{
          width: 260,
          background: '#efeae1',
          boxShadow: '1px 0 0 rgba(26,18,10,0.06), 3px 0 8px rgba(26,18,10,0.04)',
        }}
      >
        {sidebar}
      </div>

      {/* Block sidebar + Preview — one connected card */}
      <div
        className="flex-1 flex min-w-0 m-2 ml-2 rounded-xl overflow-hidden"
        style={{
          boxShadow: '0 0 0 1px rgba(26,18,10,0.06), 0 2px 6px rgba(26,18,10,0.06), 0 24px 48px -12px rgba(26,18,10,0.18)',
        }}
      >
        {/* Block sidebar — collapsible */}
        {panel && (
          <div
            className="flex-shrink-0 flex flex-col h-full transition-all duration-300"
            style={{
              width: panelCollapsed ? '40px' : '256px',
              background: 'var(--panel)',
              borderRight: '1px solid rgba(26,18,10,0.07)',
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

        {/* Preview area */}
        <div className="flex-1 min-w-0 h-full overflow-hidden" style={{ background: '#fbf9f4' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
