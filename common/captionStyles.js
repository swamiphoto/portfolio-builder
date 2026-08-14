// Caption styling for photo / photos blocks. Theme-independent: the chosen id is
// stored on the block as `block.captionStyle`. Pure data + a css helper, safe to
// import anywhere.

const CORMORANT = '"Cormorant Garamond", "Cormorant", Georgia, serif'

export const CAPTION_STYLE_OPTIONS = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'accent', label: 'Accent' },
]

export const DEFAULT_CAPTION_STYLE = 'sans'

// Inline style overrides applied on top of the caption's base classes. 'sans'
// keeps the existing look (system sans, italic, muted gray) so nothing changes
// by default.
export function captionStyleCss(id) {
  if (id === 'serif') return { fontFamily: CORMORANT, fontStyle: 'italic', fontWeight: 500 }
  if (id === 'accent') return { fontFamily: CORMORANT, fontStyle: 'normal', fontWeight: 700, color: 'rgb(220, 38, 38)', textTransform: 'uppercase' }
  return {}
}

// `fallback` is the theme's default caption style (from the block spec's
// defaultCaptionStyle) — used when the block hasn't picked one. Defaults to the
// global DEFAULT_CAPTION_STYLE ('sans') when no theme fallback is supplied.
export function resolveCaptionStyle(block, fallback = DEFAULT_CAPTION_STYLE) {
  const valid = CAPTION_STYLE_OPTIONS.map((c) => c.id)
  if (valid.includes(block?.captionStyle)) return block.captionStyle
  return valid.includes(fallback) ? fallback : DEFAULT_CAPTION_STYLE
}
