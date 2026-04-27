// Right-edge filter rail for the photo picker.
// Mirrors AlbumSidebar's section/row pattern, but slimmer and oriented for the right edge
// (so it doesn't block the canvas to the left of the picker when expanded).
import { useState } from 'react'
import Tip from '../Tip'

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'
const ROW_HEIGHT = 26
const RAIL_BG = '#efeae1'
const RAIL_SHADOW = '-1px 0 0 rgba(26,18,10,0.06), -2px 0 6px rgba(26,18,10,0.06), -24px 0 48px -12px rgba(26,18,10,0.18)'
const SECTION_BORDER = '1px solid rgba(160,140,110,0.14)'

function Chevron({ open, size = 10 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 10 10"
      style={{
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
        flexShrink: 0,
      }}
    >
      <path d="M3.5 2L7 5L3.5 8" stroke="currentColor" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilterSection({ title, children, defaultOpen = true, openOverride }) {
  const [open, setOpen] = useState(defaultOpen)
  // Allow controlled override
  const isOpen = openOverride !== undefined ? openOverride : open
  return (
    <div style={{ borderTop: SECTION_BORDER }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 transition-colors"
        style={{
          padding: '10px 14px 8px 14px',
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: isOpen ? '#7a6b55' : '#a8967a',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
        }}
      >
        <span style={{ color: '#c4b49a' }}><Chevron open={isOpen} size={10} /></span>
        <span className="flex-1 text-left">{title}</span>
      </button>
      {isOpen && <div style={{ padding: '0 0 8px' }}>{children}</div>}
    </div>
  )
}

function FilterRow({ active, label, count, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center cursor-pointer transition-colors"
      style={{
        height: ROW_HEIGHT,
        paddingLeft: 28,
        paddingRight: 12,
        background: active ? 'rgba(44,36,22,0.07)' : 'transparent',
        color: active ? '#2c2416' : '#6b5d48',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(44,36,22,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span className="flex-1 truncate">{label}</span>
      {typeof count === 'number' && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: active ? '#8b6f47' : '#b0a490',
            marginLeft: 6,
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

function CollapsedRail({ onExpand, activeCount }) {
  return (
    <Tip label="Expand filters" side="left">
    <button
      onClick={onExpand}
      className="flex flex-col flex-shrink-0 h-full items-center justify-center gap-2 transition-colors relative"
      style={{
        width: 36,
        background: RAIL_BG,
        boxShadow: RAIL_SHADOW,
        color: '#9e9788',
        border: 'none',
      }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
      >
        Filters
      </span>
      {activeCount > 0 && (
        <span
          className="absolute"
          style={{
            top: 8,
            left: 6,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            background: '#8b6f47',
            color: '#f5ecd6',
            fontFamily: MONO,
            fontSize: 9.5,
            fontWeight: 600,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {activeCount}
        </span>
      )}
    </button>
    </Tip>
  )
}

function ClearIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export default function PickerFilterRail({
  collapsed,
  onToggleCollapsed,
  filters,
  onFilterChange,
  selectedCollection,
  onSelectCollection,
  counts,
  collectionCounts,
  onClearAll,
}) {
  const activeCount = [
    filters.orientation !== 'all',
    filters.usage !== 'all',
    filters.captureYear !== 'all',
    filters.uploaded !== 'all',
    filters.camera !== 'all',
    filters.lens !== 'all',
    filters.focalLength !== 'all',
    filters.aperture !== 'all',
    filters.shutter !== 'all',
    filters.iso !== 'all',
    selectedCollection !== 'all',
  ].filter(Boolean).length

  if (collapsed) {
    return <CollapsedRail onExpand={() => onToggleCollapsed(false)} activeCount={activeCount} />
  }

  const collectionKeys = Object.keys(collectionCounts || {}).filter(k => k !== 'all').sort()

  return (
    <div
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 240,
        background: RAIL_BG,
        boxShadow: RAIL_SHADOW,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center px-3.5"
        style={{ height: 40, borderBottom: '1px solid rgba(160,140,110,0.22)' }}
      >
        <span
          className="flex-1 truncate"
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          Filters
          {activeCount > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <Tip label="Clear all filters">
          <button
            onClick={onClearAll}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <ClearIcon />
          </button>
          </Tip>
        )}
        <Tip label="Collapse filters">
        <button
          onClick={() => onToggleCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3l-5 5 5 5" />
          </svg>
        </button>
        </Tip>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto scroll-quiet" style={{ paddingBottom: 16 }}>
        <FilterSection title="Usage">
          <FilterRow
            active={filters.usage === 'unused'}
            label="Unused"
            count={counts.usage?.unused}
            onClick={() => onFilterChange('usage', filters.usage === 'unused' ? 'all' : 'unused')}
          />
          <FilterRow
            active={filters.usage === 'used'}
            label="In Use"
            count={counts.usage?.used}
            onClick={() => onFilterChange('usage', filters.usage === 'used' ? 'all' : 'used')}
          />
        </FilterSection>

        {Object.keys(counts.orientation || {}).length > 0 && (
          <FilterSection title="Shape">
            {Object.entries(counts.orientation).map(([orientation, count]) => (
              <FilterRow
                key={orientation}
                active={filters.orientation === orientation}
                label={orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                count={count}
                onClick={() => onFilterChange('orientation', filters.orientation === orientation ? 'all' : orientation)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.captureYear || {}).length > 0 && (
          <FilterSection title="Captured">
            {Object.keys(counts.captureYear).sort((a, b) => b - a).map(year => (
              <FilterRow
                key={year}
                active={filters.captureYear === year}
                label={year}
                count={counts.captureYear[year]}
                onClick={() => onFilterChange('captureYear', filters.captureYear === year ? 'all' : year)}
              />
            ))}
          </FilterSection>
        )}

        {Object.values(counts.uploaded || {}).some(Boolean) && (
          <FilterSection title="Uploaded" defaultOpen={false}>
            {[
              { key: 'week', label: 'This week' },
              { key: 'month', label: 'This month' },
              { key: 'year', label: 'This year' },
              { key: 'older', label: 'Older' },
            ].filter(r => counts.uploaded[r.key]).map(({ key, label }) => (
              <FilterRow
                key={key}
                active={filters.uploaded === key}
                label={label}
                count={counts.uploaded[key]}
                onClick={() => onFilterChange('uploaded', filters.uploaded === key ? 'all' : key)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.camera || {}).length > 0 && (
          <FilterSection title="Camera" defaultOpen={false}>
            {Object.entries(counts.camera).sort((a, b) => b[1] - a[1]).map(([cam, count]) => (
              <FilterRow
                key={cam}
                active={filters.camera === cam}
                label={cam}
                count={count}
                onClick={() => onFilterChange('camera', filters.camera === cam ? 'all' : cam)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.lens || {}).length > 0 && (
          <FilterSection title="Lens" defaultOpen={false}>
            {Object.entries(counts.lens).sort((a, b) => b[1] - a[1]).map(([lens, count]) => (
              <FilterRow
                key={lens}
                active={filters.lens === lens}
                label={lens}
                count={count}
                onClick={() => onFilterChange('lens', filters.lens === lens ? 'all' : lens)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.focalLength || {}).length > 0 && (
          <FilterSection title="Focal Length" defaultOpen={false}>
            {[
              { key: 'wide', label: 'Wide ≤35mm' },
              { key: 'normal', label: 'Normal 35–85mm' },
              { key: 'tele', label: 'Tele 85–200mm' },
              { key: 'super', label: 'Super >200mm' },
            ].filter(r => counts.focalLength[r.key]).map(({ key, label }) => (
              <FilterRow
                key={key}
                active={filters.focalLength === key}
                label={label}
                count={counts.focalLength[key]}
                onClick={() => onFilterChange('focalLength', filters.focalLength === key ? 'all' : key)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.aperture || {}).length > 0 && (
          <FilterSection title="Aperture" defaultOpen={false}>
            {[
              { key: 'wide',   label: 'Wide  ƒ < 2' },
              { key: 'mid',    label: 'Mid  ƒ 2–4' },
              { key: 'narrow', label: 'Narrow  ƒ 4–8' },
              { key: 'closed', label: 'Closed  ƒ 8+' },
            ].filter(r => counts.aperture[r.key]).map(({ key, label }) => (
              <FilterRow
                key={key}
                active={filters.aperture === key}
                label={label}
                count={counts.aperture[key]}
                onClick={() => onFilterChange('aperture', filters.aperture === key ? 'all' : key)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.shutter || {}).length > 0 && (
          <FilterSection title="Shutter Speed" defaultOpen={false}>
            {[
              { key: 'fast',   label: '> 1/500' },
              { key: 'action', label: '1/500 – 1/125' },
              { key: 'hand',   label: '1/125 – 1/30' },
              { key: 'slow',   label: '< 1/30' },
            ].filter(r => counts.shutter[r.key]).map(({ key, label }) => (
              <FilterRow
                key={key}
                active={filters.shutter === key}
                label={label}
                count={counts.shutter[key]}
                onClick={() => onFilterChange('shutter', filters.shutter === key ? 'all' : key)}
              />
            ))}
          </FilterSection>
        )}

        {Object.keys(counts.iso || {}).length > 0 && (
          <FilterSection title="ISO" defaultOpen={false}>
            {[
              { key: 'low', label: 'Low ≤400' },
              { key: 'mid', label: 'Mid 400–1600' },
              { key: 'high', label: 'High >1600' },
            ].filter(r => counts.iso[r.key]).map(({ key, label }) => (
              <FilterRow
                key={key}
                active={filters.iso === key}
                label={label}
                count={counts.iso[key]}
                onClick={() => onFilterChange('iso', filters.iso === key ? 'all' : key)}
              />
            ))}
          </FilterSection>
        )}

        {collectionKeys.length > 0 && (
          <FilterSection title="Collections" defaultOpen={false}>
            {collectionKeys.map(key => (
              <FilterRow
                key={key}
                active={selectedCollection === key}
                label={key}
                count={collectionCounts[key]}
                onClick={() => onSelectCollection(selectedCollection === key ? 'all' : key)}
              />
            ))}
          </FilterSection>
        )}
      </div>
    </div>
  )
}
