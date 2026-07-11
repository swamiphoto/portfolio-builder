import { render, screen } from '@testing-library/react'
import ThemeProvider, { useTheme } from '@/components/image-displays/ThemeProvider'

function Probe() {
  const theme = useTheme()
  return <span data-testid="probe">{theme.id}:{theme.navStyle}</span>
}

describe('ThemeProvider', () => {
  it('sets data-theme and exposes the theme via context', () => {
    const { container } = render(
      <ThemeProvider themeId="manhattan"><Probe /></ThemeProvider>
    )
    expect(container.querySelector('[data-theme="manhattan"]')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('manhattan:left-rail')
  })

  it('injects theme tokens as inline CSS custom properties', () => {
    const { container } = render(<ThemeProvider themeId="manhattan"><i/></ThemeProvider>)
    const wrapper = container.querySelector('[data-theme="manhattan"]')
    expect(wrapper.style.getPropertyValue('--theme-rail-width')).toBe('260px')
  })

  it('defaults to kyoto for unknown theme ids', () => {
    render(<ThemeProvider themeId="bogus"><Probe /></ThemeProvider>)
    expect(screen.getByTestId('probe').textContent).toBe('kyoto:cover-embedded')
  })
})
