function SidebarSection({ title, children }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-1">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
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

export default function AlbumSidebar({
  counts,
  selectedAlbum,
  onSelect,
  onUploadClick,
  sourceCounts,
  orientationCounts,
  usageCounts,
  filters,
  onFilterChange,
}) {
  const portfolioKeys = ["landscapes", "portraits", "bollywood", "tennis", "headshots"];
  const galleryKeys = Object.keys(counts).filter(
    (key) => key !== "all" && !portfolioKeys.includes(key)
  );

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
            active={isSelected("all", "all")}
            label="All Photos"
            count={counts.all ?? 0}
            onClick={() => onSelect({ type: "all", key: "all" })}
          />
          <SidebarButton
            active={filters.usage === "unused"}
            label="Unused"
            count={usageCounts.unused}
            onClick={() => onFilterChange("usage", filters.usage === "unused" ? "all" : "unused")}
            subtle
          />
          <SidebarButton
            active={filters.usage === "used"}
            label="In Use"
            count={usageCounts.used}
            onClick={() => onFilterChange("usage", filters.usage === "used" ? "all" : "used")}
            subtle
          />
        </SidebarSection>

        <SidebarSection title="Source">
          <SidebarButton
            active={filters.source === "all"}
            label="All Sources"
            onClick={() => onFilterChange("source", "all")}
            subtle
          />
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

        <SidebarSection title="Shape">
          <SidebarButton
            active={filters.orientation === "all"}
            label="All Shapes"
            onClick={() => onFilterChange("orientation", "all")}
            subtle
          />
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

        <SidebarSection title="Portfolios">
          {portfolioKeys.map((key) => (
            <SidebarButton
              key={key}
              active={isSelected("portfolio", key)}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              count={counts[key] ?? 0}
              onClick={() => onSelect({ type: "portfolio", key })}
            />
          ))}
        </SidebarSection>

        {galleryKeys.length > 0 && (
          <SidebarSection title="Galleries">
            {galleryKeys.map((key) => (
              <SidebarButton
                key={key}
                active={isSelected("gallery", key)}
                label={key}
                count={counts[key] ?? 0}
                onClick={() => onSelect({ type: "gallery", key })}
              />
            ))}
          </SidebarSection>
        )}
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
