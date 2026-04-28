import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'

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
    { value: 1, label: 'Heading' },
    { value: 2, label: 'Subheading' },
    { value: 3, label: 'Paragraph' },
    { value: 4, label: 'Quote' },
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

  if (layouts.length === 0 && variants.length === 0) return null

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
        <DesignSection label="Style">
          <PillToggle
            value={block.variant || variants[0].value}
            onChange={(v) => onUpdate({ ...block, variant: v })}
            options={variants}
          />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
