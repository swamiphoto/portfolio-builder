// components/admin/platform/SidebarSection.js
export default function SidebarSection({ label, pages, depth = 0, renderRow }) {
  if (!pages.length && depth === 0) {
    return (
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
        <div className="text-xs font-normal normal-case text-stone-300 mt-1">Empty</div>
      </div>
    )
  }
  return (
    <div>
      {depth === 0 && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</div>
      )}
      {pages.map(p => (
        <div key={p.id}>
          <div style={{ paddingLeft: depth * 12 }}>{renderRow(p)}</div>
          {p.children && p.children.length > 0 && (
            <SidebarSection label="" pages={p.children} depth={depth + 1} renderRow={renderRow} />
          )}
        </div>
      ))}
    </div>
  )
}
