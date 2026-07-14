// components/admin/onboarding/CanvasEmptyState.js
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"

export default function CanvasEmptyState({ onAddPage }) {
  return (
    <div className="flex-1 h-full min-w-0 flex items-center justify-center" style={{ background: '#fff' }}>
      <div style={{ maxWidth: 360, textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.2 }}>
          Create your first page
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 22 }}>
          A page is simply a mix of photos, videos, text, or other blocks like testimonials.
        </p>
        <button
          type="button"
          onClick={onAddPage}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 16px', borderRadius: 5, border: 'none', cursor: 'pointer',
            background: '#2c2416', color: '#f6f3ec',
            fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#3d3020' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2c2416' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add a page
        </button>
      </div>
    </div>
  )
}
