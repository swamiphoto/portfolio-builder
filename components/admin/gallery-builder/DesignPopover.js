import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'
import { getBlockSpec } from '../../../common/themes'
import { setVariant, resolveVariant, resolveAlign } from '../../../common/themes/variants'

const IconAlignLeft = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0"   width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="4"   width="9"  height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="8"   width="11" height="2" rx="1" fill="currentColor"/>
  </svg>
)
const IconAlignCenter = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0"   width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="2.5" y="4" width="9"  height="2" rx="1" fill="currentColor"/>
    <rect x="1" y="8"   width="12" height="2" rx="1" fill="currentColor"/>
  </svg>
)

const ALIGN_OPTIONS = [
  { value: 'left',   label: <IconAlignLeft /> },
  { value: 'center', label: <IconAlignCenter /> },
]

// Photos-block variant ids that map back to a legacy block.type/layout so the
// existing Kyoto render path in Gallery.js keeps working unchanged.
const PHOTOS_LEGACY = { stacked: { type: 'stacked', layout: 'stacked' }, masonry: { type: 'masonry', layout: 'masonry' } }

export default function DesignPopover({ block, themeId = 'kyoto', onUpdate, onClose, anchorEl }) {
  const spec = getBlockSpec(themeId, block.type)
  const variants = spec ? spec.variants.map(v => ({ value: v.id, label: v.label })) : []
  const isPhotos = block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry'
  const showAlignment = block.type === 'text'

  const current = resolveVariant(block, themeId)

  function handleVariantChange(variantId) {
    let next = setVariant(block, themeId, variantId)
    if (isPhotos && PHOTOS_LEGACY[variantId]) {
      next = { ...next, ...PHOTOS_LEGACY[variantId] }
    }
    onUpdate(next)
  }

  // Single-variant, non-alignment blocks (contact, page-gallery) have nothing to show.
  if (variants.length <= 1 && !showAlignment) return null

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={220} title="Design">
      {variants.length > 1 && (
        <DesignSection label={block.type === 'text' ? 'Size' : 'Layout'}>
          <PillToggle value={current} onChange={handleVariantChange} options={variants} />
        </DesignSection>
      )}
      {showAlignment && (
        <DesignSection label="Alignment">
          <PillToggle
            value={resolveAlign(block, themeId)}
            onChange={(v) => onUpdate({ ...block, align: v })}
            options={ALIGN_OPTIONS}
          />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
