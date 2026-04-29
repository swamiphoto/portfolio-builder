import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { pageDisplayThumbnail } from '../../../common/assetRefs'

const C = {
  card: '#f6f3ec',
  card2: '#faf7f1',
  thumbEmpty: '#ede7dc',
  borderSoft: 'rgba(26,18,10,0.07)',
  hover: 'rgba(26,18,10,0.04)',
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
const WIDTH = 340

function Thumb({ page }) {
  const url = pageDisplayThumbnail(page)
  if (!url) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 3,
        background: C.thumbEmpty,
        boxShadow: `inset 0 0 0 1px ${C.borderSoft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: C.textFaint,
      }}>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
        </svg>
      </div>
    )
  }
  return (
    <div style={{ width: 28, height: 28, borderRadius: 3, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(26,18,10,0.10)', flexShrink: 0 }}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
    </div>
  )
}

// No useState — hover applied directly to DOM to avoid React re-renders
function PickerRow({ page, selected, onToggle, depth, hasChildren, expanded, onToggleExpand }) {
  const rowRef = useRef(null)

  function handleMouseEnter() {
    if (!rowRef.current || selected) return
    rowRef.current.style.background = C.hover
  }
  function handleMouseLeave() {
    if (!rowRef.current) return
    rowRef.current.style.background = selected ? C.card2 : 'transparent'
  }

  return (
    <div
      ref={rowRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '0 8px',
        padding: '6px 10px',
        paddingLeft: 10 + depth * 18,
        borderRadius: 5,
        cursor: 'pointer',
        background: selected ? C.card2 : 'transparent',
        boxShadow: selected ? `0 1px 2px rgba(26,18,10,0.04), inset 0 0 0 1px ${C.accentRing}` : 'none',
        position: 'relative',
      }}
    >
      {/* Tree guide lines */}
      {depth > 0 && <>
        <span style={{ position: 'absolute', left: 10 + (depth - 1) * 18 + 9, top: 0, bottom: 0, width: 1, background: C.borderSoft, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', left: 10 + (depth - 1) * 18 + 9, top: '50%', width: 8, height: 1, background: C.borderSoft, pointerEvents: 'none' }} />
      </>}

      {/* Disclosure caret */}
      {hasChildren ? (
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand() }}
          style={{
            width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            color: C.textMuted, flexShrink: 0,
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 120ms',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      ) : (
        <span style={{ width: 14, flexShrink: 0 }} />
      )}

      <Thumb page={page} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontSize: 13,
          color: selected ? C.text : C.textBody,
          fontWeight: selected ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {page.title}
        </span>
        {page.description && (
          <span style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {page.description}
          </span>
        )}
      </div>

      {hasChildren && !expanded && !selected && (
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.textFaint, letterSpacing: '0.06em', flexShrink: 0 }}>
          {page._childCount}
        </span>
      )}

      {selected && (
        <span style={{ color: C.accent, display: 'flex', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.5 3.5L13 5" />
          </svg>
        </span>
      )}
    </div>
  )
}

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

  // Snapshot pages at mount — avoids re-renders from parent autosave creating new array refs
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
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  // Build page tree once at mount from the frozen snapshot
  const { byId, topLevelVisible, topLevelHidden, childrenOf } = useMemo(() => {
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
    return {
      byId,
      topLevelVisible: topLevel.filter(p => p.showInNav !== false),
      topLevelHidden: topLevel.filter(p => p.showInNav === false),
      childrenOf,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // empty deps: pages frozen at mount, currentPageId stable during picker session

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
    const isSelected = mode === 'manual' ? selectedIds.includes(page.id) : page.id === parentPageId

    return (
      <Fragment key={page.id}>
        <PickerRow
          page={{ ...page, _childCount: kids.length }}
          selected={isSelected}
          depth={depth}
          hasChildren={kids.length > 0}
          expanded={isExpanded}
          onToggleExpand={() => toggleExpand(page.id)}
          onToggle={() => mode === 'manual'
            ? setSelectedIds(s => s.includes(page.id) ? s.filter(x => x !== page.id) : [...s, page.id])
            : setParentPageId(page.id)
          }
        />
        {isExpanded && kids.map(c => renderRow(c, depth + 1))}
      </Fragment>
    )
  }

  const parentPage = parentPageId ? byId[parentPageId] : null
  const hasContent = filteredVisible.length > 0 || filteredHidden.length > 0

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        width: WIDTH,
        background: C.card,
        borderRadius: 10,
        boxShadow: '0 0 0 1px rgba(26,18,10,0.07), 0 1px 2px rgba(26,18,10,0.05), 0 14px 32px -6px rgba(26,18,10,0.16), 0 28px 56px -12px rgba(26,18,10,0.20)',
        display: 'flex', flexDirection: 'column',
        maxHeight: 560,
        overflow: 'hidden',
        zIndex: 9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {/* Tabs + close */}
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {[
            { value: 'manual', label: 'Pick manually' },
            { value: 'auto', label: 'Auto from parent' },
          ].map(t => {
            const active = mode === t.value
            return (
              <button
                key={t.value}
                onClick={() => setMode(t.value)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0 0 8px',
                  fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
                  color: active ? C.text : C.textMuted,
                  borderBottom: active ? `1.5px solid ${C.text}` : '1.5px solid transparent',
                  transition: 'color 120ms',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted, display: 'flex', alignItems: 'center', marginTop: 2 }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
      </div>

      {/* Search row — manual mode only */}
      {mode === 'manual' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${C.borderSoft}`, flexShrink: 0 }}>
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
      )}

      {/* Auto mode explainer */}
      {mode === 'auto' && (
        <div style={{ margin: '14px 18px 0', padding: '12px 14px', borderRadius: 6, background: 'rgba(26,18,10,0.025)', flexShrink: 0 }}>
          {parentPage ? (
            <span style={{ fontSize: 13, color: C.textBody, lineHeight: 1.5 }}>
              Auto-listing pages under <strong style={{ color: C.text }}>{parentPage.title}</strong>. Click another page below to change the parent.
            </span>
          ) : (
            <span style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
              Pick a parent page below. This gallery will automatically show all pages nested under it.
            </span>
          )}
        </div>
      )}

      {/* Page list — always interactive (no pointer-events: none in auto mode) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 6px' }}>
        {filteredVisible.length > 0 && (
          <div style={{ padding: '4px 18px 4px', marginBottom: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>Pages</span>
          </div>
        )}
        {filteredVisible.map(p => renderRow(p, 0))}

        {filteredHidden.length > 0 && (
          <div style={{ padding: '12px 18px 4px' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>Hidden</span>
          </div>
        )}
        {filteredHidden.map(p => renderRow(p, 0))}

        {!hasContent && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: C.textMuted }}>
            {query ? `No pages match "${query}".` : 'No pages yet.'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: `1px solid ${C.borderSoft}`, flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textMuted, fontWeight: 500 }}>
          {mode === 'manual'
            ? `${selectedIds.length} ${selectedIds.length === 1 ? 'page' : 'pages'}`
            : parentPage ? `Auto · ${parentPage.title}` : 'No parent'
          }
        </span>
        <button
          onClick={handleDone}
          style={{ height: 32, padding: '0 16px', borderRadius: 6, background: C.ink, border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, color: C.inkText, cursor: 'pointer' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
