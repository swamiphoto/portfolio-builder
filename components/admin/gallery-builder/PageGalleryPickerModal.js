import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { pageDisplayThumbnail } from '../../../common/assetRefs'

const C = {
  bg: 'var(--bg-base, #f7f3eb)',
  panel: 'var(--popover, #ffffff)',
  border: 'rgba(160,140,110,0.22)',
  borderStrong: 'rgba(139,111,71,0.35)',
  textPrimary: '#2c2416',
  textSecondary: '#5a4a32',
  textMuted: '#8b7755',
  accent: '#8b6f47',
  hover: 'rgba(160,140,110,0.10)',
  selected: 'rgba(139,111,71,0.10)',
}

function Tabs({ value, onChange }) {
  const tabs = [
    { id: 'manual', label: 'Pick manually', sub: 'Choose specific galleries' },
    { id: 'auto', label: 'From a parent page', sub: 'Auto-list galleries nested under a page' },
  ]
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
      {tabs.map(t => {
        const active = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, padding: '12px 16px', textAlign: 'left',
              background: active ? C.selected : 'transparent',
              border: 'none', borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
              cursor: 'pointer', transition: 'background 120ms',
              marginBottom: -1,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: active ? C.accent : C.textPrimary }}>{t.label}</div>
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{t.sub}</div>
          </button>
        )
      })}
    </div>
  )
}

function GalleryRow({ page, checked, onToggle, onUp, onDown }) {
  const thumb = pageDisplayThumbnail(page)
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 10px', borderRadius: 6,
        background: checked ? C.selected : 'transparent',
        cursor: 'pointer', transition: 'background 120ms',
      }}
      onClick={onToggle}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = C.hover }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 56, height: 42, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#e9e2d4' }}>
        {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {page.title}
        </div>
        {page.description ? (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {page.description}
          </div>
        ) : null}
      </div>
      {checked && (onUp || onDown) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }} onClick={e => e.stopPropagation()}>
          <button type="button" onClick={onUp} disabled={!onUp} style={{ width: 22, height: 18, padding: 0, fontSize: 10, background: 'transparent', border: 'none', cursor: onUp ? 'pointer' : 'default', color: onUp ? C.textSecondary : C.border }}>▲</button>
          <button type="button" onClick={onDown} disabled={!onDown} style={{ width: 22, height: 18, padding: 0, fontSize: 10, background: 'transparent', border: 'none', cursor: onDown ? 'pointer' : 'default', color: onDown ? C.textSecondary : C.border }}>▼</button>
        </div>
      ) : null}
      <input type="checkbox" checked={checked} readOnly style={{ pointerEvents: 'none' }} />
    </div>
  )
}

function ManualTab({ pages, currentPageId, selectedIds, onChange }) {
  const galleries = useMemo(
    () => (pages || []).filter(p => p.kind === 'gallery' && p.id !== currentPageId),
    [pages, currentPageId]
  )

  function toggle(id) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    onChange(next)
  }

  function move(idx, dir) {
    const next = [...selectedIds]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }

  if (galleries.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
        No gallery pages yet. Add a Gallery from the Add Page menu first.
      </div>
    )
  }

  const selectedSet = new Set(selectedIds)
  const selectedRows = selectedIds.map(id => galleries.find(g => g.id === id)).filter(Boolean)
  const unselectedRows = galleries.filter(g => !selectedSet.has(g.id))

  return (
    <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
      {selectedRows.length > 0 && (
        <>
          <div style={{ padding: '4px 8px 8px', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.textMuted, fontWeight: 500 }}>
            Selected ({selectedRows.length}) — use arrows to reorder
          </div>
          {selectedRows.map((p, idx) => (
            <GalleryRow key={p.id} page={p} checked onToggle={() => toggle(p.id)}
              onUp={idx > 0 ? () => move(idx, -1) : null}
              onDown={idx < selectedRows.length - 1 ? () => move(idx, 1) : null}
            />
          ))}
          <div style={{ height: 1, background: C.border, margin: '10px 8px' }} />
        </>
      )}
      {unselectedRows.length > 0 && (
        <>
          <div style={{ padding: '4px 8px 8px', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.textMuted, fontWeight: 500 }}>
            Available
          </div>
          {unselectedRows.map(p => (
            <GalleryRow key={p.id} page={p} checked={false} onToggle={() => toggle(p.id)} />
          ))}
        </>
      )}
    </div>
  )
}

function AutoTab({ pages, currentPageId, selectedParentId, onSelect }) {
  const candidates = useMemo(() => (pages || []).filter(p => p.type !== 'link' && p.id !== currentPageId), [pages, currentPageId])

  if (candidates.length === 0) {
    return <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>No pages available.</div>
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
      <div style={{ padding: '4px 8px 8px', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.textMuted, fontWeight: 500 }}>
        Pick a parent page — this block will list its nested galleries
      </div>
      {candidates.map(p => {
        const active = p.id === selectedParentId
        const indent = p.parentId ? 18 : 0
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', paddingLeft: 10 + indent, borderRadius: 6,
              background: active ? C.selected : 'transparent',
              cursor: 'pointer', transition: 'background 120ms',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.hover }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? C.accent : C.textPrimary }}>{p.title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{p.kind || p.type || 'page'}</div>
            </div>
            {active ? <span style={{ color: C.accent, fontSize: 13 }}>✓</span> : null}
          </div>
        )
      })}
    </div>
  )
}

export default function PageGalleryPickerModal({ block, pages, currentPageId, onUpdate, onClose }) {
  const initialTab = block.source === 'auto' ? 'auto' : 'manual'
  const [tab, setTab] = useState(initialTab)
  const [pageIds, setPageIds] = useState(block.pageIds || [])
  const [parentPageId, setParentPageId] = useState(block.parentPageId || '')
  const overlayRef = useRef(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleDone() {
    if (tab === 'manual') {
      onUpdate({ ...block, source: 'manual', pageIds, parentPageId: undefined })
    } else {
      onUpdate({ ...block, source: 'auto', parentPageId, pageIds: [] })
    }
    onClose()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,18,10,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 20,
      }}
    >
      <div
        style={{
          width: 560, maxWidth: '100%', maxHeight: '85vh',
          background: C.panel, borderRadius: 10, boxShadow: '0 20px 60px rgba(26,18,10,0.30)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.textPrimary }}>Choose galleries to display</div>
        </div>
        <Tabs value={tab} onChange={setTab} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tab === 'manual'
            ? <ManualTab pages={pages} currentPageId={currentPageId} selectedIds={pageIds} onChange={setPageIds} />
            : <AutoTab pages={pages} currentPageId={currentPageId} selectedParentId={parentPageId} onSelect={setParentPageId} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: C.textSecondary }}>Cancel</button>
          <button
            type="button"
            onClick={handleDone}
            disabled={tab === 'auto' && !parentPageId}
            style={{
              padding: '7px 14px', borderRadius: 6,
              background: (tab === 'auto' && !parentPageId) ? C.border : C.accent,
              color: 'white', border: 'none', cursor: (tab === 'auto' && !parentPageId) ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 500,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
