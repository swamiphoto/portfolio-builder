import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { pageDisplayThumbnail, pageThumbGradient } from '../../../common/assetRefs'

const C = {
  card: '#f6f3ec',
  card2: '#faf7f1',
  thumbEmpty: '#ede7dc',
  borderSoft: 'rgba(26,18,10,0.07)',
  border: 'rgba(26,18,10,0.10)',
  borderStrong: 'rgba(26,18,10,0.14)',
  hover: 'rgba(26,18,10,0.04)',
  hover2: 'rgba(26,18,10,0.05)',
  text: '#1d1b17',
  textBody: '#3a362f',
  textMuted: '#9e9788',
  textFaint: '#b0a490',
  accent: '#8b6f47',
  accentRing: 'rgba(139,111,71,0.20)',
  ink: '#2c2416',
  inkText: '#f6f3ec',
}

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"
const WIDTH = 340

const DotIcon = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
  </svg>
)

// ─── Thumb ───────────────────────────────────────────────────────────────────

function Thumb({ page, size = 28, radius = 3 }) {
  const url = pageDisplayThumbnail(page)
  if (!url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: pageThumbGradient(page?.id),
        boxShadow: `inset 0 0 0 1px ${C.borderSoft}`,
        flexShrink: 0,
      }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', boxShadow: `inset 0 0 0 1px ${C.border}`, flexShrink: 0 }}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
    </div>
  )
}

// ─── ThumbCascade ─────────────────────────────────────────────────────────────
// Stacked fan of thumbnails. ghost=true renders 3 empty placeholder thumbs.

function ThumbCascade({ pages, ghost = false }) {
  const THUMB = 60
  const RADIUS = 4
  const items = ghost ? [null, null, null] : (pages || []).slice(0, 6)
  const n = items.length
  if (n === 0) return null

  return (
    <div style={{ position: 'relative', width: 124, height: 76, flexShrink: 0 }}>
      {items.map((page, i) => {
        const offset = (i - (n - 1) / 2) * 14
        const rot = (i - (n - 1) / 2) * 3
        const url = page ? pageDisplayThumbnail(page) : null
        const isCenter = ghost && i === 1

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: `translate(calc(-50% + ${offset}px), -50%) rotate(${rot}deg)`,
              zIndex: i,
              width: THUMB, height: THUMB, borderRadius: RADIUS,
              border: '2px solid var(--popover)',
              boxShadow: '0 1px 3px rgba(26,18,10,0.18)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {url ? (
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: C.thumbEmpty,
                boxShadow: `inset 0 0 0 1px ${C.borderSoft}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.textFaint,
              }}>
                {isCenter && <DotIcon />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PickerRow ────────────────────────────────────────────────────────────────
// Row-level hover via direct DOM mutation (no setState) to survive parent re-renders.
// Disclosure button uses a tiny useState just for count ↔ caret swap.

function PickerRow({ page, selected, onToggle, depth, hasChildren, expanded, onToggleExpand }) {
  const rowRef = useRef(null)
  const [discHover, setDiscHover] = useState(false)
  const indent = depth * 16

  function onRowEnter() {
    if (!rowRef.current || selected) return
    rowRef.current.style.background = C.hover
  }
  function onRowLeave() {
    if (!rowRef.current) return
    rowRef.current.style.background = selected ? C.card2 : 'transparent'
  }

  return (
    <div
      ref={rowRef}
      onMouseEnter={onRowEnter}
      onMouseLeave={onRowLeave}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '1px 8px',
        height: 40,
        paddingLeft: 10 + indent,
        paddingRight: 10,
        borderRadius: 5,
        cursor: 'pointer',
        background: selected ? C.card2 : 'transparent',
        boxShadow: selected ? `0 1px 2px rgba(26,18,10,0.04), inset 0 0 0 1px ${C.accentRing}` : 'none',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Tree guide — L-shape connector for nested rows; hidden when selected so ring isn't pierced */}
      {depth > 0 && !selected && <>
        <span style={{
          position: 'absolute',
          left: 10 + (depth - 1) * 16 + 9,
          top: -1, height: '50%',
          width: 1, background: C.borderSoft, pointerEvents: 'none',
        }} />
        <span style={{
          position: 'absolute',
          left: 10 + (depth - 1) * 16 + 9,
          top: 'calc(50% - 0.5px)',
          width: 7, height: 1, background: C.borderSoft, pointerEvents: 'none',
        }} />
      </>}

      <Thumb page={page} />

      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 13,
        color: selected ? C.text : C.textBody,
        fontWeight: selected ? 500 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {page.title}
      </span>

      {/* Right-side affordance: check if selected, disclosure if parent, nothing for leaves */}
      {selected ? (
        <span style={{ color: C.accent, display: 'flex', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.5 3.5L13 5" />
          </svg>
        </span>
      ) : hasChildren ? (
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand() }}
          onMouseEnter={() => setDiscHover(true)}
          onMouseLeave={() => setDiscHover(false)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, padding: '0 4px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: discHover ? C.textBody : C.textFaint,
            fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em',
            flexShrink: 0, transition: 'color 120ms',
          }}
        >
          {discHover ? (
            <span style={{ display: 'flex', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 120ms' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </span>
          ) : page._childCount}
        </button>
      ) : null}
    </div>
  )
}

// ─── ParentPickerDropdown ─────────────────────────────────────────────────────

function ParentPickerDropdown({ open, candidates, currentId, onChange, onClose, triggerRect }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open || !triggerRect) return
    setPos({ top: triggerRect.bottom + 6, left: triggerRect.left })
  }, [open, triggerRect])

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(p => p.title?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q))
  }, [candidates, query])

  if (!open) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: 260,
        background: C.card,
        borderRadius: 8,
        boxShadow: '0 0 0 1px rgba(26,18,10,0.07), 0 1px 2px rgba(26,18,10,0.05), 0 10px 24px -6px rgba(26,18,10,0.16), 0 22px 44px -12px rgba(26,18,10,0.20)',
        zIndex: 10000,
        overflow: 'hidden',
        maxHeight: 340,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>
          Show pages nested inside…
        </span>
      </div>
      {candidates.length >= 8 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px 8px', borderBottom: `1px solid ${C.borderSoft}`, flexShrink: 0 }}>
          <span style={{ color: C.textMuted, display: 'flex' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 12.5, color: C.text }}
          />
        </div>
      )}
      <div style={{ overflowY: 'auto', padding: '2px 0 6px' }}>
        {filtered.map(p => (
          <ParentDropdownRow
            key={p.id}
            page={p}
            current={p.id === currentId}
            onClick={() => { onChange(p.id); onClose() }}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '16px 14px', textAlign: 'center', fontSize: 12, color: C.textMuted }}>No pages found.</div>
        )}
      </div>
    </div>
  )
}

function ParentDropdownRow({ page, current, onClick }) {
  const rowRef = useRef(null)
  function onEnter() { if (rowRef.current && !current) rowRef.current.style.background = C.hover }
  function onLeave() { if (rowRef.current) rowRef.current.style.background = current ? C.card2 : 'transparent' }

  return (
    <button
      ref={rowRef}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: 'calc(100% - 8px)', margin: '1px 4px',
        padding: '7px 10px',
        background: current ? C.card2 : 'transparent',
        border: 'none', cursor: 'pointer', borderRadius: 5,
        boxShadow: current ? `inset 0 0 0 1px ${C.accentRing}` : 'none',
        textAlign: 'left', transition: 'background 100ms',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: current ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {page.title}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.10em', color: C.textFaint, textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>
          /{page.slug || page.id} · {page._childCount} {page._childCount === 1 ? 'page' : 'pages'}
        </div>
      </div>
      {current && (
        <span style={{ color: C.accent, display: 'flex', flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  )
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function OutlineButton({ children, onClick, small = false }) {
  const btnRef = useRef(null)
  function onEnter() { if (btnRef.current) btnRef.current.style.background = C.hover }
  function onLeave() { if (btnRef.current) btnRef.current.style.background = 'transparent' }
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        height: small ? 26 : 30,
        padding: `0 ${small ? 10 : 12}px`,
        borderRadius: small ? 4 : 5,
        border: `1px solid ${C.borderStrong}`,
        background: 'transparent',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
        color: C.text, cursor: 'pointer',
        transition: 'background 100ms',
      }}
    >
      {children}
    </button>
  )
}

function MonoLabel({ children }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, color: C.textBody }}>
      {children}
    </span>
  )
}

// Empty: workspace has no pages
function EmptyNoPages() {
  return (
    <div style={{ padding: '28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <ThumbCascade ghost />
      <MonoLabel>No pages yet</MonoLabel>
      <span style={{ fontSize: 12.5, color: C.textMuted, maxWidth: 260, textAlign: 'center', lineHeight: 1.4 }}>
        Create your first page and it'll show up here, ready to add to a gallery.
      </span>
      <OutlineButton>+ Create a page</OutlineButton>
    </div>
  )
}

// Empty: search returned no results
function EmptyNoMatches({ query, onClear }) {
  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: C.thumbEmpty, boxShadow: `inset 0 0 0 1px ${C.borderSoft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textFaint,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <MonoLabel>No matches</MonoLabel>
      <span style={{ fontSize: 12.5, color: C.textMuted, textAlign: 'center', lineHeight: 1.4, maxWidth: 240 }}>
        Nothing matches <strong style={{ color: C.text }}>"{query}"</strong>. Try a different search.
      </span>
      <OutlineButton small onClick={onClear}>Clear search</OutlineButton>
    </div>
  )
}

// Empty: auto mode, no pages have children yet
function EmptyNoCandidates({ onSwitchToManual }) {
  return (
    <div style={{ padding: '36px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <ThumbCascade ghost />
      <MonoLabel>No rules to set yet</MonoLabel>
      <span style={{ fontSize: 12.5, color: C.textMuted, maxWidth: 300, textAlign: 'center', lineHeight: 1.5 }}>
        Rules follow a page that has other pages nested inside it. Once any page in your workspace has nested pages, you can pick it here.
      </span>
      <OutlineButton onClick={onSwitchToManual}>Choose pages instead</OutlineButton>
    </div>
  )
}

// ─── Main picker ──────────────────────────────────────────────────────────────

export default function PageGalleryPickerModal({ block, pages, currentPageId, onUpdate, onClose, anchorRect }) {
  const [mode, setMode] = useState(block.source === 'auto' ? 'auto' : 'manual')
  const [selectedIds, setSelectedIds] = useState(block.pageIds || [])
  const [parentPageId, setParentPageId] = useState(block.parentPageId || '')
  const [query, setQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState(() => {
    const parentIds = new Set()
    ;(block.pageIds || []).forEach(id => {
      const p = (pages || []).find(pg => pg.id === id)
      if (p?.parentId) parentIds.add(p.parentId)
    })
    return [...parentIds]
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownTriggerRect, setDropdownTriggerRect] = useState(null)

  const frozenPages = useRef(pages)
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchorRect) return
    const rightSpace = window.innerWidth - anchorRect.right - 8
    const leftSpace = anchorRect.left - 8
    const openLeft = rightSpace < WIDTH && leftSpace > rightSpace
    const left = openLeft
      ? Math.max(8, anchorRect.left - WIDTH - 8)
      : Math.min(anchorRect.right + 8, window.innerWidth - WIDTH - 8)
    const top = Math.max(8, Math.min(anchorRect.top, window.innerHeight - 480 - 8))
    setPos({ left, top })
  }, [anchorRect])

  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    function onKey(e) { if (e.key === 'Escape') { if (dropdownOpen) setDropdownOpen(false); else onClose() } }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [onClose, dropdownOpen])

  // Build page tree once at mount from frozen snapshot
  const { byId, topLevelVisible, topLevelHidden, childrenOf, candidates } = useMemo(() => {
    const seen = new Set()
    const all = (frozenPages.current || [])
      .filter(p => p.type !== 'link' && p.id !== currentPageId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })

    const byId = Object.fromEntries(all.map(p => [p.id, p]))
    const childrenOf = {}
    all.forEach(p => {
      if (p.parentId && byId[p.parentId]) {
        if (!childrenOf[p.parentId]) childrenOf[p.parentId] = []
        childrenOf[p.parentId].push(p)
      }
    })
    const topLevel = all.filter(p => !p.parentId || !byId[p.parentId])
    const candidates = topLevel
      .filter(p => childrenOf[p.id]?.length > 0)
      .map(p => ({ ...p, _childCount: childrenOf[p.id].length }))

    return {
      byId,
      topLevelVisible: topLevel.filter(p => p.showInNav !== false),
      topLevelHidden: topLevel.filter(p => p.showInNav === false),
      childrenOf,
      candidates,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // frozen at mount

  const { filteredVisible, filteredHidden } = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { filteredVisible: topLevelVisible, filteredHidden: topLevelHidden }
    const matchingIds = new Set(
      Object.values(byId)
        .filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
        .map(p => p.id)
    )
    Object.values(byId).forEach(p => {
      if (matchingIds.has(p.id) && p.parentId && byId[p.parentId]) matchingIds.add(p.parentId)
    })
    return {
      filteredVisible: topLevelVisible.filter(p => matchingIds.has(p.id)),
      filteredHidden: topLevelHidden.filter(p => matchingIds.has(p.id)),
    }
  }, [query, topLevelVisible, topLevelHidden, byId])

  function toggleExpand(id) {
    setExpandedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function handleDone() {
    if (mode === 'manual') {
      onUpdate({ ...block, source: 'manual', pageIds: selectedIds, parentPageId: undefined })
    } else {
      onUpdate({ ...block, source: 'auto', parentPageId, pageIds: [] })
    }
    onClose()
  }

  function renderRow(page, depth = 0) {
    const kids = childrenOf[page.id] || []
    const isExpanded = expandedIds.includes(page.id)
    const isSelected = selectedIds.includes(page.id)
    return (
      <Fragment key={page.id}>
        <PickerRow
          page={{ ...page, _childCount: kids.length }}
          selected={isSelected}
          depth={depth}
          hasChildren={kids.length > 0}
          expanded={isExpanded}
          onToggleExpand={() => toggleExpand(page.id)}
          onToggle={() => setSelectedIds(s => s.includes(page.id) ? s.filter(x => x !== page.id) : [...s, page.id])}
        />
        {isExpanded && kids.map(c => renderRow(c, depth + 1))}
      </Fragment>
    )
  }

  const parentPage = parentPageId ? byId[parentPageId] : null
  const childrenOfParent = parentPageId ? (childrenOf[parentPageId] || []) : []
  const totalPageCount = topLevelVisible.length + topLevelHidden.length
  const hasContent = filteredVisible.length > 0 || filteredHidden.length > 0

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        width: WIDTH,
        background: 'var(--popover)',
        borderRadius: 10,
        boxShadow: 'var(--popover-shadow)',
        display: 'flex', flexDirection: 'column',
        maxHeight: 560,
        overflow: 'hidden',
        zIndex: 9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {/* ── Tab header — underline style matching library picker ── */}
      <div style={{
        height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.borderSoft}`,
        flexShrink: 0,
        paddingRight: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 6 }}>
          {[
            { value: 'manual', label: 'Choose pages' },
            { value: 'auto', label: 'Set a rule' },
          ].map(t => {
            const active = mode === t.value
            return (
              <button
                key={t.value}
                onClick={() => setMode(t.value)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center',
                  height: '100%',
                  padding: '0 10px',
                  fontSize: 11, fontFamily: MONO,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  fontWeight: active ? 500 : 400,
                  color: active ? C.ink : C.textMuted,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'color 120ms',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = C.textBody }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.textMuted }}
              >
                {t.label}
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: 8, right: 8, bottom: -1,
                    height: 1.5, background: C.ink, borderRadius: 1,
                  }} />
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted, display: 'flex', alignItems: 'center' }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
      </div>

      {/* ── MANUAL MODE ── */}
      {mode === 'manual' && <>
        {/* Search — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: `1px solid ${C.borderSoft}`, flexShrink: 0 }}>
          <span style={{ color: C.textMuted, display: 'flex' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages…"
            autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: C.text }}
          />
        </div>

        {/* Page list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 6px' }}>
          {totalPageCount === 0 ? (
            <EmptyNoPages />
          ) : !hasContent ? (
            <EmptyNoMatches query={query} onClear={() => setQuery('')} />
          ) : (
            <>
              {filteredVisible.map(p => renderRow(p, 0))}
              {filteredHidden.length > 0 && (
                <div style={{ padding: '12px 18px 4px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>Hidden</span>
                </div>
              )}
              {filteredHidden.map(p => renderRow(p, 0))}
            </>
          )}
        </div>
      </>}

      {/* ── AUTO MODE ── */}
      {mode === 'auto' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {candidates.length === 0 ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <EmptyNoCandidates onSwitchToManual={() => setMode('manual')} />
            </div>
          ) : (
            <>
              {/* Parent chip + helpful copy */}
              <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${C.borderSoft}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDropdownTriggerRect(rect)
                    setDropdownOpen(o => !o)
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: dropdownOpen ? C.hover2 : 'transparent',
                    border: 'none', padding: '2px 6px 3px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13.5,
                    color: C.text, fontWeight: 500,
                    borderRadius: 4,
                    borderBottom: `1px dashed ${C.borderStrong}`,
                    alignSelf: 'flex-start',
                    transition: 'background 100ms',
                  }}
                >
                  {parentPage?.title || 'Choose a parent page'}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <p style={{ margin: 0, fontSize: 12.5, color: C.textBody, lineHeight: 1.5, fontFamily: SERIF, fontStyle: 'italic' }}>
                  Any page nested inside that page will show up here. Add a nested page there, it shows up here. Reorder them there, this updates too.
                </p>
              </div>

              {/* ── Variant C: Visual summary ── */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '20px 18px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              }}>
                {parentPage ? (
                  <>
                    <ThumbCascade pages={childrenOfParent} />
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, color: C.textBody }}>
                      {childrenOfParent.length} {childrenOfParent.length === 1 ? 'page' : 'pages'} will display
                    </span>
                    {childrenOfParent.length > 0 && (
                      <span style={{ fontSize: 12.5, color: C.textMuted, textAlign: 'center', lineHeight: 1.4, maxWidth: 240 }}>
                        {childrenOfParent.slice(0, 3).map(p => p.title).join(', ')}
                        {childrenOfParent.length > 3 && `, +${childrenOfParent.length - 3} more`}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <ThumbCascade ghost />
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, color: C.textFaint }}>
                      Pick a parent page above
                    </span>
                  </>
                )}
              </div>

              <ParentPickerDropdown
                open={dropdownOpen}
                candidates={candidates}
                currentId={parentPageId}
                onChange={id => { setParentPageId(id); setDropdownOpen(false) }}
                onClose={() => setDropdownOpen(false)}
                triggerRect={dropdownTriggerRect}
              />
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: `1px solid ${C.borderSoft}`, flexShrink: 0 }}>
        {mode === 'manual' ? (
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textMuted, fontWeight: 500 }}>
            {selectedIds.length} {selectedIds.length === 1 ? 'page' : 'pages'}
          </span>
        ) : <span />}
        <button
          onClick={handleDone}
          style={{ padding: '6px 14px', borderRadius: 4, background: C.ink, border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, color: '#f5ecd6', cursor: 'pointer' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
