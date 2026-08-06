import { render, screen, fireEvent, within } from '@testing-library/react'
import ThemeBar from '@/components/admin/platform/ThemeBar'

describe('ThemeBar', () => {
  it('shows the current theme as the selected option', () => {
    render(<ThemeBar siteConfig={{ design: { theme: 'manhattan' } }} onConfigChange={() => {}} />)
    // Copenhagen is the display name for the `manhattan` id
    expect(screen.getByRole('combobox')).toHaveValue('manhattan')
  })

  it('writes design.theme when a new theme is chosen', () => {
    const onConfigChange = jest.fn(fn => fn({ design: { theme: 'kyoto' } }))
    render(<ThemeBar siteConfig={{ design: { theme: 'kyoto' } }} onConfigChange={onConfigChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'manhattan' } })
    expect(onConfigChange).toHaveBeenCalled()
    const result = onConfigChange.mock.results[0].value
    expect(result.design.theme).toBe('manhattan')
  })

  it('opens the design popover when the brush is clicked', () => {
    render(<ThemeBar siteConfig={{ design: { theme: 'kyoto' }, logoType: 'sitename' }} onConfigChange={() => {}} />)
    fireEvent.click(screen.getByTitle('Design'))
    const popover = screen.getByTestId('theme-bar-design-popover')
    expect(within(popover).getByText('Navigation')).toBeInTheDocument()
    // The bar's own label above the dropdown is literally "Theme" text, so scope
    // this assertion to the popover — it should not contain a Theme section
    // (includeTheme={false} on DesignControlsBody), even though the page as a
    // whole legitimately shows the word "Theme" as the dropdown's label.
    expect(within(popover).queryByText('Theme')).not.toBeInTheDocument()
  })
})
