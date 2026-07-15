import React, { useState, useMemo, useRef, useCallback } from "react";
import Tip from "./Tip";
import { sourceLabel } from '@/common/import/sourceFilter';

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';
const ROW_HEIGHT = 26;
const RIGHT_PAD = 16; // matches section content paddingLeft for visual balance

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
      <path d="M3 2.2L7.4 5L3 7.8Z" fill="currentColor" />
    </svg>
  )
}

function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path d="M7 3.25v7.5M3.25 7h7.5" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor">
      <circle cx="3" cy="7" r="1.25" />
      <circle cx="7" cy="7" r="1.25" />
      <circle cx="11" cy="7" r="1.25" />
    </svg>
  )
}

function ToggleAllIcon({ allCollapsed }) {
  return allCollapsed ? (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10M3 8h10M3 12h10" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l5-4 5 4M3 10l5 4 5-4" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3L11 8l-5 5" />
    </svg>
  )
}

function SidebarSection({ title, children, action, defaultOpen = true, dense = false, openOverride }) {
  const [open, setOpen] = useState(defaultOpen)
  const { useEffect } = React
  useEffect(() => {
    if (openOverride !== undefined) setOpen(openOverride)
  }, [openOverride])
  return (
    <div style={{ borderTop: '1px solid rgba(160,140,110,0.14)' }}>
      <div className="flex items-stretch">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center gap-1.5 transition-colors"
          style={{
            padding: '10px 12px 8px 12px',
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: open ? '#7a6b55' : '#a8967a',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#5c4f3a'}
          onMouseLeave={e => e.currentTarget.style.color = open ? '#7a6b55' : '#a8967a'}
        >
          <span style={{ color: '#c4b49a' }}><Chevron open={open} size={10} /></span>
          <span className="flex-1 text-left">{title}</span>
        </button>
        {action && (
          <div className="flex items-center" style={{ paddingRight: RIGHT_PAD }}>
            {action}
          </div>
        )}
      </div>
      {open && <div style={{ padding: dense ? '0 0 8px' : '0 0 10px' }}>{children}</div>}
    </div>
  )
}

function SidebarItem({ active, label, count, onClick, capsLabel = false, indent = 28 }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center cursor-pointer transition-colors"
      style={{
        height: ROW_HEIGHT,
        paddingLeft: indent,
        paddingRight: RIGHT_PAD,
        background: active ? 'rgba(44,36,22,0.07)' : 'transparent',
        color: active ? '#2c2416' : '#6b5d48',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(44,36,22,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span
        className="flex-1 truncate"
        style={capsLabel ? {
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: '0.04em',
          textTransform: 'lowercase',
        } : null}
      >
        {label}
      </span>
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

function buildSetTree(keys) {
  // Synthesize every ancestor prefix so intermediate folders always appear, even
  // when they hold no assets of their own. Without this, a set like
  // "landscapes/arizona/grand-canyon" whose parent "landscapes/arizona" isn't in
  // the counts would render orphaned and over-indented.
  const keySet = new Set(keys)
  for (const key of keys) {
    const parts = key.split('/')
    for (let i = 1; i < parts.length; i++) keySet.add(parts.slice(0, i).join('/'))
  }
  const sorted = [...keySet].sort()
  const nodes = sorted.map((key) => {
    const parts = key.split('/')
    const depth = parts.length - 1
    const label = parts[parts.length - 1]
    const parent = depth > 0 ? parts.slice(0, depth).join('/') : null
    return { key, label, depth, parent, parts }
  })
  for (const node of nodes) {
    node.hasChildren = nodes.some(n => n.parent === node.key)
  }
  return nodes
}

// Flatten pages (parentId hierarchy) into an ordered list with a depth, so the
// Pages filter shows the real nesting instead of a flat list.
function flattenPageTree(pages) {
  const byParent = new Map()
  for (const p of pages) {
    const pid = p.parentId || null
    if (!byParent.has(pid)) byParent.set(pid, [])
    byParent.get(pid).push(p)
  }
  for (const arr of byParent.values()) arr.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  const ids = new Set(pages.map(p => p.id))
  const out = []
  const walk = (parentId, depth) => {
    for (const p of (byParent.get(parentId) || [])) {
      out.push({ ...p, depth })
      walk(p.id, depth + 1)
    }
  }
  walk(null, 0)
  // Any page whose parent is missing (orphan) — surface it at the root so nothing is lost.
  for (const p of pages) {
    if (p.parentId && !ids.has(p.parentId) && !out.some(o => o.id === p.id)) out.push({ ...p, depth: 0 })
  }
  return out
}

function SetRow({
  node, selected, expanded, count,
  onSelect, onToggleExpand, onCreateUnder, onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimer = useRef(null)
  const rowRef = useRef(null)

  const openMenu = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setMenuOpen(true)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMenuOpen(false), 140)
  }
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div
      ref={rowRef}
      onClick={onSelect}
      className="relative flex items-center cursor-pointer transition-colors group"
      style={{
        height: ROW_HEIGHT,
        background: selected ? 'rgba(44,36,22,0.07)' : 'transparent',
        color: selected ? '#2c2416' : '#6b5d48',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(44,36,22,0.05)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Indentation — one clean step per depth, no connector lines */}
      <div style={{ width: 12 + node.depth * 14, flexShrink: 0 }} />

      {/* Chevron for nodes with children; leaves get a matching spacer so labels align */}
      {node.hasChildren ? (
        <button
          onClick={(e) => { stop(e); onToggleExpand() }}
          className="flex-shrink-0 flex items-center justify-center rounded transition-colors"
          style={{ width: 16, height: ROW_HEIGHT, color: '#a8967a' }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onMouseEnter={e => { e.currentTarget.style.color = '#6b5d48' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#a8967a' }}
        >
          <Chevron open={expanded} size={9} />
        </button>
      ) : (
        <div style={{ width: 16, flexShrink: 0 }} />
      )}

      {/* Label */}
      <span
        className="flex-1 min-w-0 truncate"
        style={{
          paddingLeft: 2, paddingRight: 8,
          fontSize: 13,
          fontWeight: selected ? 500 : 400,
        }}
      >
        {node.label}
      </span>

      {/* Right area — count by default, +/⋯ on row hover */}
      <div
        className="relative flex items-center"
        style={{
          height: ROW_HEIGHT,
          paddingRight: RIGHT_PAD,
          minWidth: 50,
          justifyContent: 'flex-end',
        }}
        onClick={stop}
      >
        {/* Count */}
        <span
          className="transition-opacity group-hover:opacity-0"
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: selected ? '#8b6f47' : '#b0a490',
            pointerEvents: 'none',
          }}
        >
          {count ?? 0}
        </span>

        {/* Hover icons */}
        <div
          className="absolute flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ right: RIGHT_PAD, top: 0, height: ROW_HEIGHT }}
        >
          <Tip label={`New set under "${node.label}"`}>
          <button
            onClick={(e) => { stop(e); onCreateUnder() }}
            style={{
              width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 3,
              color: '#7a6b55',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; e.currentTarget.style.color = '#2c2416' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a6b55' }}
          >
            <PlusIcon size={13} />
          </button>
          </Tip>

          <div
            className="relative"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <Tip label="More">
            <button
              onClick={stop}
              style={{
                width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 3,
                color: menuOpen ? '#2c2416' : '#7a6b55',
                background: menuOpen ? 'rgba(44,36,22,0.08)' : 'transparent',
              }}
              onMouseEnter={e => { if (!menuOpen) { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; e.currentTarget.style.color = '#2c2416' } }}
              onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a6b55' } }}
            >
              <MenuIcon size={13} />
            </button>
            </Tip>

            {menuOpen && (
              <div
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                className="absolute z-30 rounded-lg overflow-hidden"
                style={{
                  top: '100%', right: 0, marginTop: 4,
                  minWidth: 150,
                  background: '#f9f6f1',
                  boxShadow: '0 0 0 1px rgba(26,18,10,0.08), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.18)',
                  padding: '4px 0',
                }}
              >
                <button
                  onClick={(e) => {
                    stop(e)
                    setMenuOpen(false)
                    if (confirm(`Delete "${node.label}"${node.hasChildren ? ' and all its children' : ''}?`)) {
                      onDelete()
                    }
                  }}
                  className="w-full text-left transition-colors"
                  style={{
                    padding: '7px 12px',
                    fontSize: 13,
                    color: '#c14a4a',
                    fontWeight: 500,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,74,74,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingRow({ depth, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: ROW_HEIGHT, paddingLeft: 12 + depth * 14 + 18, paddingRight: RIGHT_PAD }}>
      <span className="animate-spin" style={{ width: 10, height: 10, border: '1.5px solid rgba(160,140,110,0.35)', borderTopColor: '#8b6f47', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
      <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, marginLeft: 8, color: '#9a8b73' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, marginLeft: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b0a490', flexShrink: 0 }}>Creating…</span>
    </div>
  )
}

function SetsSection({ counts, isSelected, onSelect, onCreateSet, onDeleteSet, onFilterChange, openOverride }) {
  const galleryKeys = Object.keys(counts).filter(k => k !== "all")
  const nodes = useMemo(() => buildSetTree(galleryKeys), [galleryKeys.join('|')])
  const [collapsed, setCollapsed] = useState(new Set())
  const [creatingUnder, setCreatingUnder] = useState(undefined)
  const [newSetName, setNewSetName] = useState('')
  const [pendingCreate, setPendingCreate] = useState(null) // { parentKey, label } while saving

  const visibleNodes = nodes.filter(node => {
    const parts = node.key.split('/')
    for (let i = 1; i < parts.length; i++) {
      if (collapsed.has(parts.slice(0, i).join('/'))) return false
    }
    return true
  })

  const nodesWithChildren = nodes.filter(n => n.hasChildren)
  const allCollapsed = nodesWithChildren.length > 0 && nodesWithChildren.every(n => collapsed.has(n.key))

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed(new Set())
    } else {
      setCollapsed(new Set(nodesWithChildren.map(n => n.key)))
    }
  }

  async function submitCreate(parentKey) {
    const label = newSetName.trim()
    if (!label) return
    // Keep the new subset in view: make sure its parent is expanded.
    if (parentKey) setCollapsed(prev => { const next = new Set(prev); next.delete(parentKey); return next })
    setCreatingUnder(undefined)
    setNewSetName('')
    // Show a "Creating…" row where the set will land until the save + refresh land.
    setPendingCreate({ parentKey: parentKey ?? null, label })
    try {
      await onCreateSet(label, parentKey ?? null)
    } finally {
      setPendingCreate(null)
    }
  }

  function toggleCollapse(key) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const iconBtnStyle = {
    color: '#a8967a',
    width: 18, height: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 3,
  }

  return (
    <SidebarSection
      title="Sets"
      dense
      openOverride={openOverride}
      action={
        <div className="flex items-center gap-0.5">
          {nodesWithChildren.length > 0 && (
            <Tip label={allCollapsed ? 'Expand all' : 'Collapse all'}>
            <button
              onClick={toggleAll}
              style={iconBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.color = '#2c2416'; e.currentTarget.style.background = 'rgba(44,36,22,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#a8967a'; e.currentTarget.style.background = 'transparent' }}
            >
              <ToggleAllIcon allCollapsed={allCollapsed} size={12} />
            </button>
            </Tip>
          )}
          <Tip label="New set">
          <button
            onClick={() => { setCreatingUnder(null); setNewSetName('') }}
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.color = '#2c2416'; e.currentTarget.style.background = 'rgba(44,36,22,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#a8967a'; e.currentTarget.style.background = 'transparent' }}
          >
            <PlusIcon size={13} />
          </button>
          </Tip>
        </div>
      }
    >
      {visibleNodes.length === 0 && creatingUnder !== null && (
        <div style={{ padding: '4px 12px', fontSize: 12, color: '#c4b49a', fontStyle: 'italic' }}>
          No sets yet
        </div>
      )}

      {visibleNodes.map((node) => {
        const expanded = !collapsed.has(node.key)
        return (
          <div key={node.key}>
            <SetRow
              node={node}
              selected={isSelected("gallery", node.key)}
              expanded={expanded}
              count={counts[node.key]}
              onSelect={() => { onSelect({ type: "gallery", key: node.key }); onFilterChange("usage", "all") }}
              onToggleExpand={() => toggleCollapse(node.key)}
              onCreateUnder={() => { setCreatingUnder(node.key); setNewSetName('') }}
              onDelete={() => onDeleteSet(node.key)}
            />
            {creatingUnder === node.key && (
              <div style={{ paddingLeft: 12 + (node.depth + 1) * 14 + 18, paddingRight: RIGHT_PAD, paddingTop: 3, paddingBottom: 3 }}>
                <input
                  autoFocus
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitCreate(node.key)
                    else if (e.key === 'Escape') setCreatingUnder(undefined)
                  }}
                  onBlur={() => setCreatingUnder(undefined)}
                  placeholder="name…"
                  className="w-full text-sm px-2 py-1 rounded focus:outline-none placeholder:text-[#b0a490]"
                  style={{ border: '1px solid rgba(160,140,110,0.4)', background: '#f9f6f1', color: '#2c2416' }}
                />
              </div>
            )}
            {pendingCreate?.parentKey === node.key && (
              <PendingRow depth={node.depth + 1} label={pendingCreate.label} />
            )}
          </div>
        )
      })}

      {pendingCreate?.parentKey === null && (
        <PendingRow depth={0} label={pendingCreate.label} />
      )}

      {creatingUnder === null && (
        <div style={{ padding: '4px 12px 0' }}>
          <input
            autoFocus
            type="text"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate(null)
              else if (e.key === 'Escape') setCreatingUnder(undefined)
            }}
            onBlur={() => setCreatingUnder(undefined)}
            placeholder="name…"
            className="w-full text-sm px-2 py-1 rounded focus:outline-none placeholder:text-[#b0a490]"
            style={{ border: '1px solid rgba(160,140,110,0.4)', background: '#f9f6f1', color: '#2c2416' }}
          />
        </div>
      )}
    </SidebarSection>
  )
}

const SIDEBAR_SHADOW = '1px 0 0 rgba(26,18,10,0.06), 2px 0 6px rgba(26,18,10,0.06), 24px 0 48px -12px rgba(26,18,10,0.18)'

export default function AlbumSidebar({
  counts,
  selectedAlbum,
  onSelect,
  onCreateSet,
  onDeleteSet,
  orientationCounts,
  usageCounts,
  printCounts,
  captureYearCounts,
  uploadedCounts,
  apertureCounts,
  shutterCounts,
  cameraCounts,
  lensCounts,
  focalLengthCounts,
  isoCounts,
  sourceCounts,
  filters,
  onFilterChange,
  onBack,
  pages,
  selectedPage,
  onSelectPage,
  onImportFromWeb,
  onFindDuplicates,
  onClearLibrary,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(undefined) // undefined = natural, true/false = override
  const isSelected = (type, key) =>
    selectedAlbum.type === type && selectedAlbum.key === key;

  const activeFilterCount = [
    filters.orientation !== "all",
    filters.usage !== "all",
    filters.forPrint !== "all",
    filters.captureYear !== "all",
    filters.uploaded !== "all",
    filters.aperture !== "all",
    filters.shutter !== "all",
    filters.camera !== "all",
    filters.lens !== "all",
    filters.focalLength !== "all",
    filters.iso !== "all",
    filters.source !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    ["orientation","usage","forPrint","captureYear","uploaded","aperture","shutter","camera","lens","focalLength","iso","source"]
      .forEach(k => onFilterChange(k, "all"));
    onSelect({ type: "all", key: "all" });
  }, [onFilterChange, onSelect]);

  if (sidebarCollapsed) {
    return (
      <Tip label="Expand library" side="right">
      <button
        onClick={() => setSidebarCollapsed(false)}
        className="flex flex-col flex-shrink-0 h-full items-center justify-center gap-2 transition-colors"
        style={{
          width: 40,
          background: '#efeae1',
          boxShadow: SIDEBAR_SHADOW,
          position: 'relative',
          zIndex: 1,
          color: '#b0a490',
        }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#5a5043' }}>
          Library Filters
        </span>
      </button>
      </Tip>
    )
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 288,
        background: '#efeae1',
        boxShadow: SIDEBAR_SHADOW,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Sidebar header — matches block sidebar style */}
      <div
        className="flex-shrink-0 flex items-center px-3 gap-0.5"
        style={{ height: 48, boxShadow: 'inset 0 -1px 0 rgba(26,18,10,0.07)' }}
      >
<span className="flex-1 truncate mr-1" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Library
          {activeFilterCount > 0 && (
            <span style={{ marginLeft: 6, fontFamily: MONO, fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
              {activeFilterCount}
            </span>
          )}
        </span>
        {activeFilterCount > 0 && (
          <Tip label="Clear all filters">
          <button
            onClick={clearAllFilters}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <ClearIcon />
          </button>
          </Tip>
        )}
        <Tip label={sectionsOpen !== false ? 'Collapse all sections' : 'Expand all sections'}>
        <button
          onClick={() => setSectionsOpen(v => v !== false ? false : true)}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <ToggleAllIcon allCollapsed={sectionsOpen === false} />
        </button>
        </Tip>
        {(onFindDuplicates || onClearLibrary) && (
          <div className="relative">
            <Tip label="Library options">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
              style={{ color: 'var(--text-muted)' }}
              aria-haspopup="true" aria-expanded={menuOpen}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
            </button>
            </Tip>
            {menuOpen && (
              <>
                <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 rounded-md overflow-hidden" style={{ top: '100%', zIndex: 41, minWidth: 168, background: 'var(--popover, #f0ebe3)', boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 8px 24px rgba(26,18,10,0.16)', padding: '4px 0' }}>
                  {onFindDuplicates && (
                    <button type="button" onClick={() => { setMenuOpen(false); onFindDuplicates(); }} className="w-full text-left transition-colors" style={{ padding: '7px 12px', fontSize: 12.5, color: '#2c2416' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,140,110,0.10)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Find duplicates</button>
                  )}
                  {onClearLibrary && (
                    <button type="button" onClick={() => { setMenuOpen(false); onClearLibrary(); }} className="w-full text-left transition-colors" style={{ padding: '7px 12px', fontSize: 12.5, color: '#c14a4a' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,74,74,0.07)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Clear library</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <Tip label="Collapse library">
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        </Tip>
      </div>

      <div className="flex-1 overflow-y-auto scroll-quiet" style={{ paddingBottom: 16 }}>
        {/* All Photos — standalone reset row */}
        <div style={{ padding: '6px 0 6px' }}>
          <SidebarItem
            active={isSelected("all", "all") && filters.usage === "all"}
            label="All Photos"
            count={counts.all ?? 0}
            indent={12}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("usage", "all"); }}
          />
        </div>

        <SidebarSection title="Usage" openOverride={sectionsOpen}>
          <SidebarItem
            active={filters.usage === "unused"}
            label="Unused"
            count={usageCounts.unused}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("usage", filters.usage === "unused" ? "all" : "unused"); }}
          />
          <SidebarItem
            active={filters.usage === "used"}
            label="In Use"
            count={usageCounts.used}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("usage", filters.usage === "used" ? "all" : "used"); }}
          />
        </SidebarSection>

        <SidebarSection title="Print" openOverride={sectionsOpen}>
          <SidebarItem
            active={filters.forPrint === "on"}
            label="For sale"
            count={printCounts?.on ?? 0}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("forPrint", filters.forPrint === "on" ? "all" : "on"); }}
          />
          <SidebarItem
            active={filters.forPrint === "off"}
            label="Not for sale"
            count={printCounts?.off ?? 0}
            onClick={() => { onSelect({ type: "all", key: "all" }); onFilterChange("forPrint", filters.forPrint === "off" ? "all" : "off"); }}
          />
        </SidebarSection>

        {Object.keys(orientationCounts).length > 0 && (
          <SidebarSection title="Shape" openOverride={sectionsOpen}>
            {Object.entries(orientationCounts).map(([orientation, count]) => (
              <SidebarItem
                key={orientation}
                active={filters.orientation === orientation}
                label={orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                count={count}
                onClick={() => onFilterChange("orientation", filters.orientation === orientation ? "all" : orientation)}
              />
            ))}
          </SidebarSection>
        )}

        <SidebarSection
          title="Source"
          openOverride={sectionsOpen}
          action={
            onImportFromWeb ? (
              <Tip label="Import from the web">
              <button
                onClick={onImportFromWeb}
                className="flex items-center justify-center rounded transition-colors"
                style={{ width: 18, height: 18, color: '#a8967a' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8b6f47')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a8967a')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              </Tip>
            ) : null
          }
        >
          {Object.keys(sourceCounts || {}).length > 0 ? (
            Object.entries(sourceCounts).map(([provider, count]) => (
              <SidebarItem
                key={provider}
                active={filters.source === provider}
                label={sourceLabel(provider)}
                count={count}
                onClick={() => onFilterChange('source', filters.source === provider ? 'all' : provider)}
              />
            ))
          ) : (
            <div style={{ padding: '4px 12px', fontSize: 12, color: '#c4b49a', fontStyle: 'italic' }}>
              No sources yet
            </div>
          )}
        </SidebarSection>

        {Object.keys(captureYearCounts).length > 0 && (
          <SidebarSection title="Captured" openOverride={sectionsOpen}>
            {Object.keys(captureYearCounts).sort((a, b) => b - a).map(year => (
              <SidebarItem
                key={year}
                active={filters.captureYear === year}
                label={year}
                count={captureYearCounts[year]}
                onClick={() => onFilterChange("captureYear", filters.captureYear === year ? "all" : year)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.values(uploadedCounts).some(Boolean) && (
          <SidebarSection title="Uploaded" defaultOpen={false} openOverride={sectionsOpen}>
            {[
              { key: 'week', label: 'This week' },
              { key: 'month', label: 'This month' },
              { key: 'year', label: 'This year' },
              { key: 'older', label: 'Older' },
            ].filter(r => uploadedCounts[r.key]).map(({ key, label }) => (
              <SidebarItem
                key={key}
                active={filters.uploaded === key}
                label={label}
                count={uploadedCounts[key]}
                onClick={() => onFilterChange("uploaded", filters.uploaded === key ? "all" : key)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(cameraCounts).length > 0 && (
          <SidebarSection title="Camera" defaultOpen={false} openOverride={sectionsOpen}>
            {Object.entries(cameraCounts).sort((a, b) => b[1] - a[1]).map(([cam, count]) => (
              <SidebarItem
                key={cam}
                active={filters.camera === cam}
                label={cam}
                count={count}
                onClick={() => onFilterChange("camera", filters.camera === cam ? "all" : cam)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(lensCounts).length > 0 && (
          <SidebarSection title="Lens" defaultOpen={false} openOverride={sectionsOpen}>
            {Object.entries(lensCounts).sort((a, b) => b[1] - a[1]).map(([lens, count]) => (
              <SidebarItem
                key={lens}
                active={filters.lens === lens}
                label={lens}
                count={count}
                onClick={() => onFilterChange("lens", filters.lens === lens ? "all" : lens)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(focalLengthCounts).length > 0 && (
          <SidebarSection title="Focal Length" defaultOpen={false} openOverride={sectionsOpen}>
            {[
              { key: 'wide', label: 'Wide ≤35mm' },
              { key: 'normal', label: 'Normal 35–85mm' },
              { key: 'tele', label: 'Tele 85–200mm' },
              { key: 'super', label: 'Super >200mm' },
            ].filter(r => focalLengthCounts[r.key]).map(({ key, label }) => (
              <SidebarItem
                key={key}
                active={filters.focalLength === key}
                label={label}
                count={focalLengthCounts[key]}
                onClick={() => onFilterChange("focalLength", filters.focalLength === key ? "all" : key)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(apertureCounts).length > 0 && (
          <SidebarSection title="Aperture" defaultOpen={false} openOverride={sectionsOpen}>
            {[
              { key: 'wide',   label: 'Wide  ƒ < 2' },
              { key: 'mid',    label: 'Mid  ƒ 2–4' },
              { key: 'narrow', label: 'Narrow  ƒ 4–8' },
              { key: 'closed', label: 'Closed  ƒ 8+' },
            ].filter(r => apertureCounts[r.key]).map(({ key, label }) => (
              <SidebarItem
                key={key}
                active={filters.aperture === key}
                label={label}
                count={apertureCounts[key]}
                onClick={() => onFilterChange("aperture", filters.aperture === key ? "all" : key)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(shutterCounts).length > 0 && (
          <SidebarSection title="Shutter Speed" defaultOpen={false} openOverride={sectionsOpen}>
            {[
              { key: 'fast',   label: '> 1/500' },
              { key: 'action', label: '1/500 – 1/125' },
              { key: 'hand',   label: '1/125 – 1/30' },
              { key: 'slow',   label: '< 1/30' },
            ].filter(r => shutterCounts[r.key]).map(({ key, label }) => (
              <SidebarItem
                key={key}
                active={filters.shutter === key}
                label={label}
                count={shutterCounts[key]}
                onClick={() => onFilterChange("shutter", filters.shutter === key ? "all" : key)}
              />
            ))}
          </SidebarSection>
        )}

        {Object.keys(isoCounts).length > 0 && (
          <SidebarSection title="ISO" defaultOpen={false} openOverride={sectionsOpen}>
            {[
              { key: 'low', label: 'Low ≤400' },
              { key: 'mid', label: 'Mid 400–1600' },
              { key: 'high', label: 'High >1600' },
            ].filter(r => isoCounts[r.key]).map(({ key, label }) => (
              <SidebarItem
                key={key}
                active={filters.iso === key}
                label={label}
                count={isoCounts[key]}
                onClick={() => onFilterChange("iso", filters.iso === key ? "all" : key)}
              />
            ))}
          </SidebarSection>
        )}

        <SetsSection
          counts={counts}
          isSelected={isSelected}
          openOverride={sectionsOpen}
          onSelect={onSelect}
          onCreateSet={onCreateSet}
          onDeleteSet={onDeleteSet}
          onFilterChange={onFilterChange}
        />

        {pages?.length > 0 && (
          <SidebarSection title="Pages" openOverride={sectionsOpen}>
            {flattenPageTree(pages).map(p => (
              <SidebarItem
                key={p.id}
                active={selectedPage === p.id}
                label={p.title}
                count={p.imageUrls.length}
                indent={28 + p.depth * 14}
                onClick={() => onSelectPage?.(selectedPage === p.id ? null : p.id)}
              />
            ))}
          </SidebarSection>
        )}
      </div>

    </div>
  )
}
