import { useState, useMemo, useRef } from 'react'
import PopoverShell from '../platform/PopoverShell'
import { pageDisplayThumbnail } from '../../../common/assetRefs'

const C = {
  border: 'rgba(160,140,110,0.22)',
  textPrimary: '#2c2416',
  textSecondary: '#5a4a32',
  textMuted: '#8b7755',
  accent: '#8b6f47',
  hover: 'rgba(139,111,71,0.07)',
  selected: 'rgba(139,111,71,0.16)',
  thumbBg: '#d4c4a8',
}

function PlaceholderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(60,40,15,0.30)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.4" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function Thumb({ page, size = 36 }) {
  const url = pageDisplayThumbnail(page)
  return (
    <div style={{ width: size, height: size, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: C.thumbBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} /> : <PlaceholderIcon />}
    </div>
  )
}

function buildTree(pages, currentPageId) {
  const ordered = (pages || [])
    .filter(p => p.type !== 'link' && p.id !== currentPageId)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const seen = new Set()
  const all = ordered.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const byId = Object.fromEntries(all.map(p => [p.id, p]))
  const topLevel = all.filter(p => !p.parentId || !byId[p.parentId])
  const result = []
  const placed = new Set()
  for (const p of topLevel) {
    result.push({ page: p, depth: 0 })
    placed.add(p.id)
    const children = all.filter(c => c.parentId === p.id)
    for (const c of children) {
      result.push({ page: c, depth: 1 })
      placed.add(c.id)
    }
  }
  for (const p of all) {
    if (!placed.has(p.id)) result.push({ page: p, depth: 0 })
  }
  return result
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

export default function PageGalleryPickerModal({ block, pages, currentPageId, onUpdate, onClose, anchorRect }) {
  const initial = useRef({
    mode: block.source === 'auto' ? 'auto' : 'manual',
    pageIds: block.pageIds || [],
    parentPageId: block.parentPageId || '',
  }).current

  const [mode, setMode] = useState(initial.mode)
  const [pageIds, setPageIds] = useState(initial.pageIds)
  const [parentPageId, setParentPageId] = useState(initial.parentPageId)

  const tree = useMemo(() => buildTree(pages, currentPageId), [pages, currentPageId])

  function togglePage(id) {
    setPageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectedManualSet = new Set(pageIds)

  const autoChildren = useMemo(() => {
    if (!parentPageId) return new Set()
    return new Set(
      (pages || []).filter(p => p.parentId === parentPageId && p.type !== 'link').map(p => p.id)
    )
  }, [parentPageId, pages])

  const hasChanges = (() => {
    if (mode !== initial.mode) return true
    if (mode === 'manual') return !arraysEqual(pageIds, initial.pageIds)
    return parentPageId !== initial.parentPageId
  })()

  const canConfirm = hasChanges

  function handleConfirm() {
    if (!canConfirm) return
    if (mode === 'manual') {
      onUpdate({ ...block, source: 'manual', pageIds, parentPageId: undefined })
    } else {
      onUpdate({ ...block, source: 'auto', parentPageId, pageIds: [] })
    }
    onClose()
  }

  const modeToggle = (
    <div style={{ display: 'flex', padding: '8px 10px 6px' }}>
      <div style={{ flex: 1, display: 'flex', background: 'rgba(160,140,110,0.10)', borderRadius: 5, padding: 2, gap: 2 }}>
        {[['manual', 'Pick manually'], ['auto', 'Auto from parent']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            style={{
              flex: 1, padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: mode === id ? 500 : 400,
              background: mode === id ? 'var(--popover, #fff)' : 'transparent',
              color: mode === id ? C.textPrimary : C.textMuted,
              boxShadow: mode === id ? '0 1px 3px rgba(26,18,10,0.10)' : 'none',
              transition: 'all 120ms',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <PopoverShell anchorRect={anchorRect} onClose={onClose} width={360} title="Page Gallery" placement="right" draggable={true}>
      {modeToggle}

      <div style={{ overflowY: 'auto', maxHeight: 380, padding: '4px 8px 8px' }}>
        {tree.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>
            No pages yet. Add pages from the sidebar first.
          </div>
        ) : tree.map(({ page: p, depth }) => {
          const isSelected = mode === 'manual' ? selectedManualSet.has(p.id) : p.id === parentPageId
          const isAutoChild = mode === 'auto' && autoChildren.has(p.id)
          const isHidden = p.showInNav === false

          return (
            <div
              key={p.id}
              onClick={() => mode === 'manual' ? togglePage(p.id) : setParentPageId(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '5px 8px',
                marginLeft: depth * 14,
                marginRight: depth * 4,
                marginBottom: 1,
                borderRadius: 5,
                background: isSelected ? C.selected : isAutoChild ? 'rgba(139,111,71,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? C.selected : isAutoChild ? 'rgba(139,111,71,0.06)' : 'transparent' }}
            >
              <Thumb page={p} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isSelected ? 500 : 450,
                    color: isSelected ? C.accent : C.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.title}
                  </div>
                  {isHidden && (
                    <span style={{ fontSize: 9.5, color: C.textMuted, fontStyle: 'italic', flexShrink: 0 }}>hidden</span>
                  )}
                </div>
                {p.description ? (
                  <div style={{ fontSize: 11, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {p.description}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {mode === 'auto' && parentPageId && (
        <div style={{ padding: '0 16px 4px', fontSize: 11, color: autoChildren.size > 0 ? C.textSecondary : C.textMuted, fontStyle: autoChildren.size === 0 ? 'italic' : 'normal' }}>
          {autoChildren.size > 0
            ? `Will auto-list ${autoChildren.size} nested ${autoChildren.size === 1 ? 'page' : 'pages'}.`
            : 'No nested pages found under this page yet.'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: `1px solid ${C.border}` }}>
        {mode === 'manual' && pageIds.length > 0 && (
          <button type="button" onClick={() => setPageIds([])}
            style={{ marginRight: 'auto', padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11.5, color: C.textMuted }}>
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            padding: '6px 14px', borderRadius: 5, border: 'none',
            cursor: canConfirm ? 'pointer' : 'default',
            fontSize: 12.5, fontWeight: 500,
            background: canConfirm ? '#2c2416' : 'rgba(60,40,15,0.15)',
            color: canConfirm ? '#f5ecd6' : C.textMuted,
            transition: 'background 0.15s',
          }}
        >
          {canConfirm ? 'Save changes' : 'No changes'}
        </button>
      </div>
    </PopoverShell>
  )
}
