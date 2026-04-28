// components/admin/platform/PageDesignPopover.js
import PopoverShell from './PopoverShell'
import { DesignSection, PillToggle } from './designControls'

export default function PageDesignPopover({ page, onUpdate, onClose, anchorEl }) {
  const cover = page.cover || { imageUrl: '', height: 'full', overlayText: '', variant: 'showcase', buttonStyle: 'solid' }

  function update(patch) {
    onUpdate({ ...page, cover: { ...cover, ...patch } })
  }

  const showButtonStyle = !!(page.slideshow?.enabled || page.clientFeatures?.enabled)

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={240} title="Page Design">
      <DesignSection label="Cover height">
        <PillToggle
          value={cover.height || 'full'}
          onChange={(v) => update({ height: v })}
          options={[
            { value: 'full',    label: 'Full'    },
            { value: 'partial', label: 'Partial' },
          ]}
        />
      </DesignSection>

      {showButtonStyle && (
        <DesignSection label="Button style">
          <PillToggle
            value={cover.buttonStyle || 'solid'}
            onChange={(v) => update({ buttonStyle: v })}
            options={[
              { value: 'solid',   label: 'Solid'   },
              { value: 'outline', label: 'Outline' },
              { value: 'ghost',   label: 'Ghost'   },
            ]}
          />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
