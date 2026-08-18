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

// The secondary counterpart to primaryBtn: identical typography/padding/radius,
// transparent fill with an ink outline. Used for the "lesser" choice next to a
// primaryBtn CTA (e.g. "I'll build my own" beside "Build my pages for me").
export const outlineBtn = (disabled) => ({
  background: 'transparent',
  color: disabled ? 'rgba(44,36,22,0.35)' : '#2c2416',
  fontFamily: MONO, fontSize: 11.5, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
  padding: '13px 22px', borderRadius: 5,
  border: `1px solid rgba(44,36,22,${disabled ? 0.2 : 0.45})`,
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
})

// Inline-background buttons don't get Tailwind's `hover:` — it silently loses to
// the inline style. These pair with primaryBtn/outlineBtn via onMouseEnter/Leave.
// Skip the effect once a button goes disabled (e.g. mid-submit) so hover doesn't
// fight the disabled treatment.
export const primaryBtnHoverOn = (e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#3a2f1d' }
export const primaryBtnHoverOff = (e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#2c2416' }
export const outlineBtnHoverOn = (e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(44,36,22,0.06)' }
export const outlineBtnHoverOff = (e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'transparent' }

export const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)
