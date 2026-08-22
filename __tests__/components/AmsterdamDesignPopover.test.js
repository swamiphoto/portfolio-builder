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

  it('block Ink swatch reflects the site ink color + name, not a fixed red', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const props = { anchorEl: anchor, onClose: () => {}, onUpdate: () => {} }
    // With a blue (ultramarine) site ink, the "ink" swatch must read Blue, not Red.
    const blue = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="amsterdam" amsterdamInk={{ color: '#1a1690', name: 'Blue' }} />)
    expect(blue.getByLabelText(/Blue/)).toBeTruthy()
    expect(blue.queryByLabelText(/^Red/)).toBeNull()
    blue.unmount()
    // With no ink passed, it falls back to the historical red default.
    const red = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="amsterdam" />)
    expect(red.getByLabelText(/Red/)).toBeTruthy()
    red.unmount()
  })

  it('shows a single black swatch when the site ink is black (no duplicate)', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const props = { anchorEl: anchor, onClose: () => {}, onUpdate: () => {} }
    const r = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="amsterdam" amsterdamInk={{ color: '#141210', name: 'Black' }} />)
    // Light + one black (the 'ink' swatch); the fixed 'dark' duplicate is dropped.
    const blacks = Array.from(r.container.querySelectorAll('button[aria-label]')).filter(b => (b.getAttribute('style') || '').includes('rgb(20, 18, 16)') || (b.getAttribute('style') || '').includes('#141210'))
    expect(blacks.length).toBe(1)
    r.unmount()
  })
})
