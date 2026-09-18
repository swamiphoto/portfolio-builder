// Layout + size vocabulary for images inside a Markdown text block. Mirrors the
// photo-block variants but decoupled so the markdown path owns its own classes.
export const DEFAULT_IMAGE_LAYOUT = 'centered'
export const DEFAULT_IMAGE_SIZE = 'l'

export const LAYOUT_OPTIONS = [
  { id: 'centered', label: 'Centered' },
  { id: 'full-bleed', label: 'Edge to edge' },
  { id: 'side', label: 'Side' },
]
export const SIZE_OPTIONS = [
  { id: 'l', label: 'L' },
  { id: 'm', label: 'M' },
  { id: 's', label: 'S' },
]

const CENTERED_W = { l: 'w-full', m: 'w-2/3 mx-auto', s: 'w-2/5 mx-auto' }
const SIDE_W = { l: 'sm:w-1/2', m: 'sm:w-2/5', s: 'sm:w-1/3' }

// figureClass/imgClass for a resolved image. side floats left (v1) and collapses
// to full-width stacked on mobile; full-bleed ignores size.
export function imageFigureClasses({ layout, size } = {}) {
  const lay = LAYOUT_OPTIONS.some((o) => o.id === layout) ? layout : DEFAULT_IMAGE_LAYOUT
  const sz = SIZE_OPTIONS.some((o) => o.id === size) ? size : DEFAULT_IMAGE_SIZE
  if (lay === 'full-bleed') return { figureClass: 'my-8 w-full', imgClass: 'w-full h-auto' }
  if (lay === 'side') return { figureClass: `my-4 w-full ${SIDE_W[sz]} sm:float-left sm:mr-6 sm:mb-3`, imgClass: 'w-full h-auto' }
  return { figureClass: `my-6 ${CENTERED_W[sz]}`, imgClass: 'w-full h-auto' }
}

const CENTERED_WIDTH = { l: '100%', m: '66%', s: '40%' }
const SIDE_WIDTH = { l: '50%', m: '40%', s: '33%' }

// Inline styles for the editor image wrapper so the contentEditable surface
// previews the chosen layout + size. side floats left so following paragraphs
// wrap beside it; full-bleed ignores size.
export function imageEditorStyle({ layout, size } = {}) {
  const lay = LAYOUT_OPTIONS.some((o) => o.id === layout) ? layout : DEFAULT_IMAGE_LAYOUT
  const sz = SIZE_OPTIONS.some((o) => o.id === size) ? size : DEFAULT_IMAGE_SIZE
  if (lay === 'full-bleed') return { display: 'block', float: 'none', width: '100%', margin: '0.6em 0' }
  if (lay === 'side') return { display: 'block', float: 'left', width: SIDE_WIDTH[sz], margin: '0.3em 1em 0.5em 0' }
  return { display: 'block', float: 'none', width: CENTERED_WIDTH[sz], margin: '0.6em auto' }
}
