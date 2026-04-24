// components/admin/platform/SidebarSection.js

export default function SidebarSection({ label, pages, depth = 0, renderRow, droppableId }) {
  return (
    <div data-droppable={droppableId}>
      {depth === 0 && label && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</div>
      )}
      {pages.length === 0 && depth === 0 && (
        <div className="px-3 pb-2 text-xs text-stone-300">Empty</div>
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
