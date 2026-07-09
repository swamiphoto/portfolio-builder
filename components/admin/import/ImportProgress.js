import { MONO } from './importFlowStyles'

export default function ImportProgress({ progress }) {
  const { done = 0, total = 0, importedCount = 0 } = progress || {}
  const pct = total > 0 ? Math.min(1, done / total) : 0

  return (
    <div style={{ padding: '40px 28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Track + fill */}
      <div
        style={{
          width: '100%',
          height: 3,
          borderRadius: 2,
          background: 'rgba(160,140,110,0.22)',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: '#8b6f47',
            borderRadius: 2,
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      {/* Mono counter */}
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 6 }}>
        {done} / {total}
      </p>

      {/* Sub-line */}
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {pct < 1 ? 'Bringing in your photos…' : 'Wrapping up…'}
      </p>
    </div>
  )
}
