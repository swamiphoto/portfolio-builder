// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children, panelCollapsed, onTogglePanel }) {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--desk)' }}>
      {/* Site sidebar — floating pane */}
      <div
        className="w-56 flex-shrink-0 flex flex-col h-full my-2 ml-2 rounded-xl overflow-hidden"
        style={{ background: 'var(--panel)', boxShadow: 'var(--pane-shadow)' }}
      >
        {sidebar}
      </div>

      {/* Block sidebar — collapsible */}
      {panel && (
        <div
          className="flex-shrink-0 flex flex-col h-full my-2 ml-2 rounded-xl overflow-hidden transition-all duration-300"
          style={{
            width: panelCollapsed ? '40px' : '256px',
            background: 'var(--panel)',
            boxShadow: 'var(--pane-shadow)',
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
      <div className="flex-1 min-w-0 h-full overflow-hidden p-2 pl-2">
        {children}
      </div>
    </div>
  )
}
