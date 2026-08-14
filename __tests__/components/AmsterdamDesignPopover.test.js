import { render } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'
import { resolveAmsterdamStyle } from '@/common/themes/variants'

describe('Amsterdam text Style control', () => {
  it('resolveAmsterdamStyle: panel by default, quiet only when stored', () => {
    expect(resolveAmsterdamStyle({ type: 'text' })).toBe('panel')
    expect(resolveAmsterdamStyle({ type: 'text', amsterdamStyle: 'quiet' })).toBe('quiet')
    expect(resolveAmsterdamStyle({ type: 'text', amsterdamStyle: 'bogus' })).toBe('panel')
    expect(resolveAmsterdamStyle(undefined)).toBe('panel')
  })

  it('offers Panel/Quiet for amsterdam text blocks only', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const props = { anchorEl: anchor, onClose: () => {}, onUpdate: () => {} }
    const ams = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="amsterdam" />)
    expect(ams.getByText('Panel')).toBeTruthy()
    expect(ams.getByText('Quiet')).toBeTruthy()
    ams.unmount()
    const kyo = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="kyoto" />)
    expect(kyo.queryByText('Panel')).toBeNull()
  })
})
