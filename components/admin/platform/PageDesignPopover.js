// components/admin/platform/PageDesignPopover.js
import PopoverShell from './PopoverShell'
import { DesignSection, PillToggle } from './designControls'

export default function PageDesignPopover({ page, themeId = 'kyoto', onUpdate, onClose, anchorEl }) {
  const cover = page.cover || { imageUrl: '', height: 'partial', overlayText: '', variant: 'showcase', buttonStyle: 'solid' }

  function update(patch) {
    onUpdate({ ...page, cover: { ...cover, ...patch } })
  }

  const showButtonStyle = !!(page.slideshow?.enabled || page.clientFeatures?.enabled || page.clientFeatures?.purchase?.enabled)
  // Florence and Amsterdam open on a fixed-height wall, so hero height doesn't apply.
  const showHeroHeight = themeId !== 'florence' && themeId !== 'amsterdam'

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width="max-content" minWidth={272} maxWidth="calc(100vw - 24px)" title="Design">
      {showHeroHeight && (
        <DesignSection label="Hero height">
          <PillToggle
            value={cover.height || 'partial'}
            onChange={(v) => update({ height: v })}
            options={[
              { value: 'full',    label: 'Full'    },
              { value: 'partial', label: 'Partial' },
            ]}
          />
        </DesignSection>
      )}

      {showButtonStyle && (
        <DesignSection label="Button style">
          <PillToggle
            value={cover.buttonStyle || 'solid'}
            onChange={(v) => update({ buttonStyle: v })}
            options={[
              { value: 'solid',   label: 'Solid'   },
              { value: 'outline', label: 'Outline' },
            ]}
          />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
