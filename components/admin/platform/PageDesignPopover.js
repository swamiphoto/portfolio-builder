// components/admin/platform/PageDesignPopover.js
import PopoverShell from './PopoverShell'
import { DesignSection, PillToggle } from './designControls'

export default function PageDesignPopover({ page, themeId = 'kyoto', onUpdate, onClose, anchorEl }) {
  const cover = page.cover || { imageUrl: '', height: 'partial', overlayText: '', variant: 'showcase', buttonStyle: 'solid' }

  function update(patch) {
    onUpdate({ ...page, cover: { ...cover, ...patch } })
  }

  // The style control only affects the primary (first) opener button, so when more
  // than one button is present, label it "Primary button style" to be clear.
  const buttonCount = [page.slideshow?.enabled, page.clientFeatures?.enabled, page.clientFeatures?.purchase?.enabled].filter(Boolean).length
  const showButtonStyle = buttonCount > 0
  // Florence and Amsterdam open on a fixed-height wall, so hero height doesn't apply.
  const showHeroHeight = themeId !== 'florence' && themeId !== 'amsterdam'

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width="max-content" minWidth={272} maxWidth="calc(100vw - 24px)" title="Design">
      {/* Amsterdam opener headline face — the display type on this page's hero /
          title panel. Condensed = bold poster (Anton, default), Editorial = Fraunces. */}
      {themeId === 'amsterdam' && (
        <DesignSection label="Font">
          <PillToggle
            value={cover.amsterdamHeadline === 'editorial' ? 'editorial' : 'condensed'}
            onChange={(v) => update({ amsterdamHeadline: v })}
            options={[
              { value: 'condensed', label: 'Condensed' },
              { value: 'editorial', label: 'Editorial' },
            ]}
          />
        </DesignSection>
      )}
      {/* Where the page's sub-links sit relative to the opener title (Amsterdam +
          Florence show a horizontal row above, or the default column below). */}
      {(themeId === 'amsterdam' || themeId === 'florence') && (
        <DesignSection label="Links">
          <PillToggle
            value={cover.linksPosition === 'above' ? 'above' : 'below'}
            onChange={(v) => update({ linksPosition: v })}
            options={[
              { value: 'below', label: 'Below title' },
              { value: 'above', label: 'Above title' },
            ]}
          />
        </DesignSection>
      )}
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
        <DesignSection label={buttonCount > 1 ? 'Primary button style' : 'Button style'}>
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
