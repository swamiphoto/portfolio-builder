import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'

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

// Only include layout options that are actually rendered
const LAYOUTS = {
  photo:    [{ value: 'Full Bleed', label: 'Full Bleed' }, { value: 'Centered', label: 'Centered' }],
  photos:   [{ value: 'Stacked',      label: 'Stacked'      }, { value: 'Masonry',  label: 'Masonry'  }],
  stacked:  [{ value: 'Stacked',      label: 'Stacked'      }, { value: 'Masonry',  label: 'Masonry'  }],
  masonry:  [{ value: 'Stacked',      label: 'Stacked'      }, { value: 'Masonry',  label: 'Masonry'  }],
  video:    [{ value: 'Edge to edge', label: 'Edge to edge' }, { value: 'Centered', label: 'Centered' }],
}

const VARIANTS = {
  text: [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'S' },
  ],
  testimonial: [
    { value: 1, label: 'Photo above' },
    { value: 2, label: 'Quote above' },
  ],
}

export default function DesignPopover({ block, onUpdate, onClose, anchorEl }) {
  const blockType = block.type
  const layouts = LAYOUTS[blockType] || []
  const variants = VARIANTS[blockType] || []
  const isPhotos = blockType === 'photos' || blockType === 'stacked' || blockType === 'masonry'

  const currentLayout = isPhotos
    ? (blockType === 'masonry' ? 'Masonry' : 'Stacked')
    : (block.layout || layouts[0]?.value)

  function handleLayoutChange(layout) {
    if (isPhotos) {
      onUpdate({ ...block, type: layout === 'Masonry' ? 'masonry' : 'stacked' })
    } else {
      onUpdate({ ...block, layout })
    }
  }

  const showAlignment = blockType === 'text'
  const defaultAlign = 'center'

  if (layouts.length === 0 && variants.length === 0 && !showAlignment) return null

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={220} title="Design">
      {layouts.length > 0 && (
        <DesignSection label="Layout">
          <PillToggle
            value={currentLayout}
            onChange={handleLayoutChange}
            options={layouts}
          />
        </DesignSection>
      )}
      {variants.length > 0 && (
        <DesignSection label="Size">
          <PillToggle
            value={block.variant || variants[0].value}
            onChange={(v) => onUpdate({ ...block, variant: v })}
            options={variants}
          />
        </DesignSection>
      )}
      {showAlignment && (
        <DesignSection label="Alignment">
          <PillToggle
            value={block.align || defaultAlign}
            onChange={(v) => onUpdate({ ...block, align: v })}
            options={ALIGN_OPTIONS}
          />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
