// components/admin/platform/SidebarSection.js

export default function SidebarSection({ label, pages, depth = 0, renderRow, droppableId }) {
  return (
    <div data-droppable={droppableId}>
      {depth === 0 && label && (
        <div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.08em]"
             style={{ color: 'var(--text-muted)' }}>{label}</div>
      )}
      {pages.length === 0 && depth === 0 && null}
      {pages.map((p) => (
        <div key={p.id}>
          {renderRow(p, depth)}
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
