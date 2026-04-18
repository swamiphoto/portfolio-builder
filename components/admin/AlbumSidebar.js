import React from "react";

function SidebarSection({ title, children, action, collapsible = false }) {
  const [open, setOpen] = React.useState(!collapsible)
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-3 py-1">
        <button
          className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide"
          onClick={() => collapsible && setOpen(v => !v)}
        >
          {collapsible && <span className="text-gray-300">{open ? '▾' : '▸'}</span>}
          {title}
        </button>
        {action}
      </div>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}

function SidebarButton({ active, label, count, onClick, subtle = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-gray-900 text-white font-medium'
          : subtle
            ? 'text-gray-500 hover:bg-gray-100'
            : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="flex-1 text-left truncate">{label}</span>
      {typeof count === 'number' && (
        <span className={`text-xs ${active ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
      )}
    </button>
  )
}

function buildCollectionTree(keys) {
  const sorted = [...keys].sort()
  return sorted.map((key) => {
    const parts = key.split('/')
    const depth = parts.length - 1
    const label = parts[parts.length - 1]
    const hasChildren = sorted.some((k) => k.startsWith(key + '/'))
    return { key, label, depth, hasChildren }
  })
}

export default function AlbumSidebar({
  counts,
  selectedAlbum,
  onSelect,
  onUploadClick,
  onCreateCollection,
  onDeleteCollection,
  sourceCounts,
  orientationCounts,
  usageCounts,
  cameraCounts,
  lensCounts,
  focalLengthCounts,
  isoCounts,
  filters,
  onFilterChange,
}) {
  const galleryKeys = Object.keys(counts).filter((key) => key !== "all");

  const isSelected = (type, key) =>
    selectedAlbum.type === type && selectedAlbum.key === key;

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="font-bold text-gray-900 text-base">Library</div>
        <div className="text-xs text-gray-400 mt-0.5">Master view of all portfolio assets</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <SidebarSection title="Views">
          <SidebarButton
            active={isSelected("all", "all") && filters.usage === "all"}
            label="All Photos"
            count={counts.all ?? 0}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("usage", "all"); }}
          />
          <SidebarButton
            active={filters.usage === "unused"}
            label="Unused"
            count={usageCounts.unused}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("usage", filters.usage === "unused" ? "all" : "unused"); }}
            subtle
          />
          <SidebarButton
            active={filters.usage === "used"}
            label="In Use"
            count={usageCounts.used}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("usage", filters.usage === "used" ? "all" : "used"); }}
            subtle
          />
        </SidebarSection>

        {Object.keys(sourceCounts).length > 0 && (
          <SidebarSection title="Source">
            {Object.entries(sourceCounts).map(([source, count]) => (
              <SidebarButton
                key={source}
                active={filters.source === source}
                label={source}
                count={count}
                onClick={() => onFilterChange("source", filters.source === source ? "all" : source)}
                subtle
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(orientationCounts).length > 0 && (
          <SidebarSection title="Shape">
            {Object.entries(orientationCounts).map(([orientation, count]) => (
              <SidebarButton
                key={orientation}
                active={filters.orientation === orientation}
                label={orientation}
                count={count}
                onClick={() => onFilterChange("orientation", filters.orientation === orientation ? "all" : orientation)}
                subtle
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(cameraCounts).length > 0 && (
          <SidebarSection title="Camera" collapsible>
            {Object.entries(cameraCounts).sort((a, b) => b[1] - a[1]).map(([cam, count]) => (
              <SidebarButton
                key={cam}
                active={filters.camera === cam}
                label={cam}
                count={count}
                onClick={() => onFilterChange("camera", filters.camera === cam ? "all" : cam)}
                subtle
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(lensCounts).length > 0 && (
          <SidebarSection title="Lens" collapsible>
            {Object.entries(lensCounts).sort((a, b) => b[1] - a[1]).map(([lens, count]) => (
              <SidebarButton
                key={lens}
                active={filters.lens === lens}
                label={lens}
                count={count}
                onClick={() => onFilterChange("lens", filters.lens === lens ? "all" : lens)}
                subtle
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(focalLengthCounts).length > 0 && (
          <SidebarSection title="Focal Length" collapsible>
            {[
              { key: 'wide', label: 'Wide ≤35mm' },
              { key: 'normal', label: 'Normal 35–85mm' },
              { key: 'tele', label: 'Tele 85–200mm' },
              { key: 'super', label: 'Super >200mm' },
            ].filter(r => focalLengthCounts[r.key]).map(({ key, label }) => (
              <SidebarButton
                key={key}
                active={filters.focalLength === key}
                label={label}
                count={focalLengthCounts[key]}
                onClick={() => onFilterChange("focalLength", filters.focalLength === key ? "all" : key)}
                subtle
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(isoCounts).length > 0 && (
          <SidebarSection title="ISO" collapsible>
            {[
              { key: 'low', label: 'Low ≤400' },
              { key: 'mid', label: 'Mid 400–1600' },
              { key: 'high', label: 'High >1600' },
            ].filter(r => isoCounts[r.key]).map(({ key, label }) => (
              <SidebarButton
                key={key}
                active={filters.iso === key}
                label={label}
                count={isoCounts[key]}
                onClick={() => onFilterChange("iso", filters.iso === key ? "all" : key)}
                subtle
              />
            ))}
          </SidebarSection>
        )}

        {(() => {
  const nodes = buildCollectionTree(galleryKeys)
  const [collapsed, setCollapsed] = React.useState(new Set())
  const [creatingUnder, setCreatingUnder] = React.useState(undefined)
  const [newCollectionName, setNewCollectionName] = React.useState('')

  const visibleNodes = nodes.filter((node) => {
    const parts = node.key.split('/')
    for (let i = 1; i < parts.length; i++) {
      if (collapsed.has(parts.slice(0, i).join('/'))) return false
    }
    return true
  })

  function submitCreate(parentKey) {
    const slug = newCollectionName.trim()
    if (!slug) return
    onCreateCollection(slug, parentKey ?? null)
    setCreatingUnder(undefined)
    setNewCollectionName('')
  }

  return (
    <SidebarSection
      title="Collections"
      action={
        <button
          onClick={() => { setCreatingUnder(null); setNewCollectionName('') }}
          className="text-gray-400 hover:text-gray-700 text-base leading-none"
          title="New collection"
        >+</button>
      }
    >
      {visibleNodes.map((node) => (
        <div key={node.key} style={{ paddingLeft: node.depth * 12 }}>
          <div className="flex items-center group">
            <div className="flex-1 min-w-0">
              <SidebarButton
                active={isSelected("gallery", node.key)}
                label={node.label}
                count={counts[node.key] ?? 0}
                onClick={() => { onSelect({ type: "gallery", key: node.key }); onFilterChange("usage", "all") }}
              />
            </div>
            <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setCreatingUnder(node.key); setNewCollectionName('') }}
                className="text-gray-400 hover:text-gray-700 text-xs px-1"
                title={`New sub-collection under ${node.label}`}
              >+</button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${node.label}"${node.hasChildren ? ' and all its sub-collections' : ''}?`)) {
                    onDeleteCollection(node.key)
                  }
                }}
                className="text-gray-400 hover:text-red-500 text-xs px-1"
                title={`Delete ${node.label}`}
              >×</button>
              {node.hasChildren && (
                <button
                  onClick={() => setCollapsed((prev) => {
                    const next = new Set(prev)
                    if (next.has(node.key)) next.delete(node.key)
                    else next.add(node.key)
                    return next
                  })}
                  className="text-gray-400 hover:text-gray-700 text-xs px-1"
                >
                  {collapsed.has(node.key) ? '▸' : '▾'}
                </button>
              )}
            </div>
          </div>
          {creatingUnder === node.key && (
            <div className="px-2 py-1" style={{ paddingLeft: (node.depth + 1) * 12 + 8 }}>
              <input
                autoFocus
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreate(node.key)
                  else if (e.key === 'Escape') setCreatingUnder(undefined)
                }}
                onBlur={() => setCreatingUnder(undefined)}
                placeholder="Collection name"
                className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
              />
            </div>
          )}
        </div>
      ))}
      {creatingUnder === null && (
        <div className="px-2 py-1">
          <input
            autoFocus
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate(null)
              else if (e.key === 'Escape') setCreatingUnder(undefined)
            }}
            onBlur={() => setCreatingUnder(undefined)}
            placeholder="Collection name"
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
          />
        </div>
      )}
    </SidebarSection>
  )
})()}
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onUploadClick}
          className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ↑ Upload Photos
        </button>
      </div>
    </div>
  )
}
