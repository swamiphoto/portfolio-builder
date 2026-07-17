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
  if (id === 'accent') return { fontFamily: CORMORANT, fontStyle: 'normal', fontWeight: 700, color: 'rgb(220, 38, 38)' }
  return {}
}

export function resolveCaptionStyle(block) {
  const valid = CAPTION_STYLE_OPTIONS.map((c) => c.id)
  return valid.includes(block?.captionStyle) ? block.captionStyle : DEFAULT_CAPTION_STYLE
}
