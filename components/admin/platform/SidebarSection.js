// components/admin/platform/SidebarSection.js
import { Droppable, Draggable } from '@hello-pangea/dnd'

export default function SidebarSection({ label, pages, depth = 0, renderRow, droppableId }) {
  if (!pages.length && depth === 0) {
    return (
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
        <Droppable droppableId={droppableId || label} type="page">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[4px]">
              <div className="text-xs font-normal normal-case text-stone-300 mt-1">Empty</div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    )
  }
  return (
    <div>
      {depth === 0 && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</div>
      )}
      <Droppable droppableId={droppableId || label} type="page">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {pages.map((p, i) => (
              <Draggable key={p.id} draggableId={p.id} index={i} type="page">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps}>
                    <div style={{ paddingLeft: depth * 12 }}>
                      <div {...provided.dragHandleProps}>
                        {renderRow(p)}
                      </div>
                    </div>
                    {p.children && p.children.length > 0 && (
                      <SidebarSection
                        label=""
                        pages={p.children}
                        depth={depth + 1}
                        renderRow={renderRow}
                        droppableId={p.id}
                      />
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
