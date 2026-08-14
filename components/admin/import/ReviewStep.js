import { useState, useCallback, memo } from 'react'
import { MONO, monoLabel, primaryBtn } from './importFlowStyles'

function Check({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.5 3.5L13 4.5" />
    </svg>
  )
}

function PhotoGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8a988" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5-4 4-2-2-7 7" />
    </svg>
  )
}

// Slots for the stacked thumbnail: back → middle → top. Images align to the END
// of this list so the topmost print is always upright, however many we have.
const STACK_SLOTS = [
  { rot: -8, x: -5, y: 3 },  // back
  { rot: 7,  x: 5,  y: 1 },  // middle
  { rot: 0,  x: 0,  y: -1 }, // top
]

const AlbumCard = memo(function AlbumCard({ collection, selected, onToggle }) {
  const [broken, setBroken] = useState(() => new Set())
  const count = collection.assetRefs?.length || 0
  // Up to three source images, rendered as a small pile of prints.
  const covers = (collection.assetRefs || [])
    .slice(0, 3)
    .map((a) => a?.remoteUrl)
    .filter(Boolean)
    .filter((url) => !broken.has(url))
  const slots = STACK_SLOTS.slice(STACK_SLOTS.length - covers.length)

  return (
    <button
      type="button"
      onClick={() => onToggle(collection.id)}
      aria-pressed={selected}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        padding: 8, borderRadius: 8, cursor: 'pointer',
        background: selected ? 'rgba(139,111,71,0.10)' : 'transparent',
        border: `1px solid ${selected ? 'rgba(139,111,71,0.38)' : 'rgba(160,140,110,0.22)'}`,
        transition: 'background 0.14s, border-color 0.14s',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(160,140,110,0.07)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {/* stacked cover thumbnails — a small pile of prints, like a gallery */}
      <div style={{ position: 'relative', width: 56, height: 52, flexShrink: 0 }}>
        {covers.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: '#e7ded0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(60,40,15,0.06)' }}>
            <PhotoGlyph />
          </div>
        ) : (
          covers.map((url, i) => {
            const s = slots[i] || STACK_SLOTS[STACK_SLOTS.length - 1]
            const isTop = i === covers.length - 1
            return (
              // Full-res source images; decode off-thread + lazy-load so scrolling stays smooth.
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                width={80}
                height={80}
                onError={() => setBroken((prev) => new Set(prev).add(url))}
                style={{
                  position: 'absolute', top: '50%', left: '50%', width: 40, height: 40,
                  objectFit: 'cover', borderRadius: 4, background: '#e7ded0',
                  border: '2px solid #fff',
                  boxShadow: isTop ? '0 2px 6px rgba(60,40,15,0.24)' : '0 1px 3px rgba(60,40,15,0.16)',
                  transform: `translate(-50%, -50%) translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg)`,
                  zIndex: i,
                }}
              />
            )
          })
        )}
      </div>

      {/* name + count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {collection.name}
        </div>
        <div style={{ ...monoLabel, fontSize: 10, marginTop: 3, textTransform: 'none', letterSpacing: '0.02em' }}>
          {count} {count === 1 ? 'photo' : 'photos'}
        </div>
      </div>

      {/* selection indicator */}
      <span
        aria-hidden="true"
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: selected ? '#8b6f47' : 'transparent',
          border: `1.5px solid ${selected ? '#8b6f47' : 'rgba(120,100,70,0.38)'}`,
          color: '#fff', transition: 'background 0.14s, border-color 0.14s',
        }}
      >
        {selected && <Check />}
      </span>
    </button>
  )
})

export default function ReviewStep({ discovery, onBack, onImport }) {
  const { collections = [], totalAssets, site } = discovery || {}

  const [checked, setChecked] = useState(() => {
    const init = {}
    for (const c of collections) init[c.id] = true
    return init
  })

  const selectedCollections = collections.filter((c) => checked[c.id])
  const selectedCount = selectedCollections.reduce((n, c) => n + (c.assetRefs?.length || 0), 0)
  const allSelected = collections.length > 0 && selectedCollections.length === collections.length
  const multi = collections.length > 1

  const toggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  function toggleAll() {
    if (allSelected) {
      setChecked({})
    } else {
      const next = {}
      for (const c of collections) next[c.id] = true
      setChecked(next)
    }
  }

  return (
    <div style={{ padding: '24px 28px 0' }}>
      <h2 className="font-fraunces" style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: multi ? 6 : 18 }}>
        We found {totalAssets} {totalAssets === 1 ? 'photo' : 'photos'}{multi ? ` across ${collections.length} galleries` : ''}.
      </h2>
      {multi && (
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
          Pick the galleries to bring over. You can fine-tune everything once you're in.
        </p>
      )}

      {/* select-all row — only meaningful with more than one gallery */}
      {multi && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ ...monoLabel, fontSize: 10, textTransform: 'none', letterSpacing: '0.02em' }}>
            {selectedCount} of {totalAssets} photos selected
          </span>
          <button
            type="button"
            onClick={toggleAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 2px',
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#8b6f47', fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#6f5836')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8b6f47')}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {/* album cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
        {collections.map((c) => (
          <AlbumCard key={c.id} collection={c} selected={!!checked[c.id]} onToggle={toggle} />
        ))}
      </div>

      {/* Pinned footer — the import action stays in view no matter how long the
          gallery list gets (the list scrolls under it). */}
      <div
        style={{
          position: 'sticky', bottom: 0,
          // Above the album cards — their stacked thumbnails use positive z-index
          // and would otherwise paint over the button as the list scrolls under.
          zIndex: 10,
          background: 'var(--popover)',
          margin: '0 -28px 0',
          padding: '14px 28px 20px',
          borderTop: '1px solid rgba(160,140,110,0.16)',
        }}
      >
        <button
          onClick={() => onImport(selectedCollections)}
          disabled={selectedCount === 0}
          style={{ ...primaryBtn(selectedCount === 0), width: '100%' }}
        >
          Import all {selectedCount} photos
        </button>
      </div>
    </div>
  )
}
