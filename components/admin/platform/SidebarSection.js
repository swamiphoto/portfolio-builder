// components/admin/platform/SidebarSection.js

export default function SidebarSection({ label, pages, depth = 0, renderRow, droppableId, emptyHint = null, dragging = false, dropActive = false }) {
  const isEmpty = pages.length === 0 && depth === 0
  return (
    // When empty, keep a min-height so the section is still a hittable drop
    // target (you can drag a page into an empty Pages/Hidden section), and render
    // the empty hint INSIDE the droppable so its area registers as the target.
    <div data-droppable={droppableId} style={isEmpty ? { minHeight: 44 } : undefined}>
      {depth === 0 && label && (
        <div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.08em]"
             style={{ color: 'var(--text-muted)' }}>{label}</div>
      )}
      {isEmpty && (
        // While a page is being dragged, outline the empty area so it reads as a
        // drop zone (dashed), and highlight it when the drag is over it (solid +
        // tint). A constant transparent border keeps the layout from shifting.
        <div
          style={{
            margin: '2px 8px 6px',
            borderRadius: 6,
            padding: '2px',
            border: dropActive
              ? '1.5px solid #8b6f47'
              : dragging
                ? '1.5px dashed rgba(139,111,71,0.45)'
                : '1.5px solid transparent',
            background: dropActive ? 'rgba(139,111,71,0.10)' : 'transparent',
            transition: 'background 120ms, border-color 120ms',
          }}
        >
          {emptyHint}
        </div>
      )}
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
