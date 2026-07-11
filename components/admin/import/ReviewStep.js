import { useState } from 'react'
import { MONO, monoLabel, primaryBtn } from './importFlowStyles'

export default function ReviewStep({ discovery, onBack, onImport }) {
  const { collections = [], totalAssets, site } = discovery || {}

  const [checked, setChecked] = useState(() => {
    const init = {}
    for (const c of collections) init[c.id] = true
    return init
  })

  const selectedCollections = collections.filter((c) => checked[c.id])
  const selectedCount = selectedCollections.reduce((n, c) => n + (c.assetRefs?.length || 0), 0)

  function toggle(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div style={{ padding: '24px 28px 28px' }}>
      <h2 className="font-fraunces" style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: 6 }}>
        We found {totalAssets} photos across {collections.length} {collections.length === 1 ? 'gallery' : 'galleries'}.
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
        All galleries are selected. Uncheck any you want to skip.
      </p>

      <button
        onClick={() => onImport(selectedCollections)}
        disabled={selectedCount === 0}
        style={{ ...primaryBtn(selectedCount === 0), marginBottom: 20, width: '100%' }}
      >
        Import all {selectedCount} photos
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {collections.map((c) => (
          <label
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'rgba(160,140,110,0.07)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={!!checked[c.id]}
              onChange={() => toggle(c.id)}
              style={{ accentColor: '#8b6f47', width: 15, height: 15, flexShrink: 0 }}
            />
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</span>
            <span style={{ ...monoLabel, fontSize: 10 }}>
              {c.assetRefs?.length || 0} photos
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          padding: 0,
        }}
      >
        ← Back
      </button>
    </div>
  )
}
