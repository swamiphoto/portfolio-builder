import { render } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'

describe('Amsterdam text block design controls', () => {
  it('no longer offers a Panel/Quiet Style control — every text block is the quiet label', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const props = { anchorEl: anchor, onClose: () => {}, onUpdate: () => {} }
    const ams = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="amsterdam" />)
    expect(ams.queryByText('Panel')).toBeNull()
    expect(ams.queryByText('Quiet')).toBeNull()
    // The Size control (L/M/S) is always available now (it was hidden for Panel before).
    expect(ams.getByText('Size')).toBeTruthy()
    ams.unmount()
  })
})
