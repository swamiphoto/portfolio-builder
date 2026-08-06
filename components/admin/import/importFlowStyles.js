export const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export const monoLabel = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 500,
}

// Matches the studio's primary buttons (Publish, etc.): mono, uppercase, letter-
// spaced, ink #2c2416, rounded-rectangle. Sized up a little for these CTAs.
export const primaryBtn = (disabled) => ({
  background: disabled ? 'rgba(60,40,15,0.20)' : '#2c2416',
  color: disabled ? 'rgba(246,243,236,0.5)' : '#f6f3ec',
  fontFamily: MONO, fontSize: 11.5, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
  padding: '13px 22px', borderRadius: 5, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
})

export const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)
