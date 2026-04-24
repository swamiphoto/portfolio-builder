// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children }) {
  return (
    <div className="flex h-screen overflow-hidden admin-grain" style={{ background: 'var(--desk)', fontFamily: 'var(--font-sans)', position: 'relative' }}>
      <div className="flex-shrink-0 flex flex-col h-full overflow-hidden" style={{ width: 244, background: 'var(--paper-2)', borderRight: '1px solid var(--rule)', position: 'relative', zIndex: 2 }}>
        {sidebar}
      </div>
      {panel && (
        <div className="flex-shrink-0 flex flex-col h-full overflow-hidden" style={{ width: 288, background: 'var(--paper)', borderRight: '1px solid var(--rule)', position: 'relative', zIndex: 1 }}>
          {panel}
        </div>
      )}
      <div className="flex-1 min-w-0 h-full overflow-hidden" style={{ position: 'relative', zIndex: 0 }}>
        {children}
      </div>
    </div>
  )
}
