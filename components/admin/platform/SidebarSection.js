// components/admin/platform/SidebarSection.js

export default function SidebarSection({ label, pages, depth = 0, renderRow, droppableId, emptyHint = null }) {
  const isEmpty = pages.length === 0 && depth === 0
  return (
    // When empty, keep a min-height so the section is still a hittable drop
    // target (you can drag a page into an empty Pages/Hidden section), and render
    // the empty hint INSIDE the droppable so its area registers as the target.
    // The hint itself highlights on drag-over (see EmptyHint `active`).
    <div data-droppable={droppableId} style={isEmpty ? { minHeight: 44 } : undefined}>
      {depth === 0 && label && (
        <div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.08em]"
             style={{ color: 'var(--text-muted)' }}>{label}</div>
      )}
      {isEmpty && emptyHint}
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
