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

const AlbumCard = memo(function AlbumCard({ collection, selected, onToggle }) {
  const [broken, setBroken] = useState(false)
  const count = collection.assetRefs?.length || 0
  const cover = collection.assetRefs?.[0]?.remoteUrl
  const showImg = cover && !broken

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
      {/* cover thumbnail */}
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 5, overflow: 'hidden', background: '#e7ded0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(60,40,15,0.06)' }}>
          {showImg ? (
            // Covers are full-res source images; decode off the main thread and
            // lazy-load so scrolling/toggling stays responsive (no sync decode jank).
            <img src={cover} alt="" loading="lazy" decoding="async" fetchpriority="low" width={104} height={104} onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <PhotoGlyph />
          )}
        </div>
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
    <div style={{ padding: '24px 28px 28px' }}>
      <h2 className="font-fraunces" style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: multi ? 6 : 18 }}>
        We found {totalAssets} {totalAssets === 1 ? 'photo' : 'photos'}{multi ? ` across ${collections.length} galleries` : ''}.
      </h2>
      {multi && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {collections.map((c) => (
          <AlbumCard key={c.id} collection={c} selected={!!checked[c.id]} onToggle={toggle} />
        ))}
      </div>

      <button
        onClick={() => onImport(selectedCollections)}
        disabled={selectedCount === 0}
        style={{ ...primaryBtn(selectedCount === 0), width: '100%' }}
      >
        Import all {selectedCount} photos
      </button>
    </div>
  )
}
