export const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export const monoLabel = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 500,
}

export const primaryBtn = (disabled) => ({
  background: disabled ? 'rgba(60,40,15,0.20)' : '#2c2416',
  color: '#f5ecd6', fontSize: 12.5, fontWeight: 500,
  padding: '9px 16px', borderRadius: 4, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
})

export const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)
