// components/admin/platform/SidebarSection.js

export default function SidebarSection({ label, pages, depth = 0, renderRow, droppableId }) {
  return (
    <div data-droppable={droppableId}>
      {depth === 0 && label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{label}</span>
        </div>
      )}
      {pages.length === 0 && depth === 0 && (
        <div style={{ padding: '0 20px 8px', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>Empty</div>
      )}
      {pages.map((p) => (
        <div key={p.id}>
          <div style={{ paddingLeft: depth * 12 }}>
            {renderRow(p)}
          </div>
          {p.children?.length > 0 && (
            <SidebarSection
              label=""
              pages={p.children}
              depth={depth + 1}
              renderRow={renderRow}
              droppableId={p.id}
            />
          )}
        </div>
      ))}
    </div>
  )
}
