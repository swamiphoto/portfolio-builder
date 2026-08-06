import { MONO, primaryBtn } from './importFlowStyles'

export default function ImportDoneStep({ summary, onEnter, onImportAnother }) {
  const n = summary?.importedCount || 0
  return (
    <div style={{ padding: '32px 28px 28px' }}>
      <h2 className="font-fraunces" style={{ fontSize: 21, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
        You're all set, your photos are in.
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: summary?.failedCount > 0 ? 6 : 22, lineHeight: 1.5 }}>
        {n} {n === 1 ? 'photo' : 'photos'}, ready to use.
      </p>
      {summary?.failedCount > 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>
          A few couldn't be brought in. You can add those manually.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <button onClick={onEnter} style={{ ...primaryBtn(false) }}>
          Go to my studio
        </button>
        <button
          onClick={onImportAnother}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#2c2416' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Import from another site
        </button>
      </div>
    </div>
  )
}
