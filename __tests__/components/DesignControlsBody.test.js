import { render, screen } from '@testing-library/react'
import DesignControlsBody from '@/components/admin/platform/DesignControlsBody'

const base = { logoType: 'sitename', design: { theme: 'kyoto', navStyle: 'links' } }

describe('DesignControlsBody', () => {
  it('omits the Theme section by default', () => {
    render(<DesignControlsBody config={base} onChange={() => {}} />)
    expect(screen.queryByText('Theme')).not.toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Social links')).toBeInTheDocument()
  })
  it('includes the Theme section when includeTheme is set', () => {
    render(<DesignControlsBody config={base} onChange={() => {}} includeTheme />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })
  it('shows the Amsterdam ink swatches when the theme is amsterdam', () => {
    render(<DesignControlsBody config={{ design: { theme: 'amsterdam' } }} onChange={() => {}} />)
    expect(screen.getByLabelText('vermilion ink')).toBeInTheDocument()
    expect(screen.getByLabelText('ultramarine ink')).toBeInTheDocument()
    expect(screen.getByLabelText('black ink')).toBeInTheDocument()
  })
  it('hides the Amsterdam ink swatches for other themes', () => {
    render(<DesignControlsBody config={base} onChange={() => {}} />)
    expect(screen.queryByLabelText('vermilion ink')).not.toBeInTheDocument()
  })
})
