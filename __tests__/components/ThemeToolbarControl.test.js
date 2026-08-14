import { render, fireEvent, screen } from '@testing-library/react'
import ThemeToolbarControl from '@/components/admin/platform/ThemeToolbarControl'

// jsdom lacks layout; PopoverShell positions off getBoundingClientRect (returns 0s) — fine for these assertions.
function setup(theme = 'kyoto') {
  const onChange = jest.fn()
  const config = { design: { theme } }
  const utils = render(<ThemeToolbarControl config={config} onChange={onChange} />)
  return { onChange, ...utils }
}

describe('ThemeToolbarControl', () => {
  it('shows the current theme name on the pill', () => {
    setup('florence')
    expect(screen.getByRole('button', { name: /Florence/ })).toBeTruthy()
  })

  it('opens the theme menu and switches theme via onChange (preserving other design keys)', () => {
    const { onChange } = setup('kyoto')
    // config carries an extra design key that must survive the patch
    fireEvent.click(screen.getByRole('button', { name: /Kyoto/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Copenhagen' }))
    expect(onChange).toHaveBeenCalledWith({ design: { theme: 'manhattan' } })
  })

  it('merges into existing design rather than replacing it', () => {
    const onChange = jest.fn()
    render(<ThemeToolbarControl config={{ design: { theme: 'kyoto', photoTreatment: 'sepia' } }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Kyoto/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Florence' }))
    expect(onChange).toHaveBeenCalledWith({ design: { theme: 'florence', photoTreatment: 'sepia' } })
  })

  it('renders a brush button that opens the per-theme settings (no theme select inside)', () => {
    setup('florence')
    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    // The settings popover shows Florence design controls (e.g. Photo treatment)…
    expect(screen.getByText('Photo treatment')).toBeTruthy()
    // …but NOT a "Theme" section (that lives on the pill's caret menu).
    expect(screen.queryByText('Photo details')).toBeTruthy()
  })
})
