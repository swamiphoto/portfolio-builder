import { render } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'
import { getPageTheme } from '@/common/themes'

// The editor computes the block-controls theme the same way BlockPageEditor does:
// the page's resolved theme (override-aware), NOT the site theme.
function pageThemeId(siteConfig, page) {
  return getPageTheme(siteConfig, page)?.id || siteConfig?.design?.theme || 'kyoto'
}

const photo = { type: 'photo', imageUrl: 'https://x/a.jpg' }
const anchor = document.createElement('div')

describe('block design controls follow the page theme override', () => {
  it('a page overridden to Kyoto under a Florence site shows Kyoto options (Full bleed, no Frame)', () => {
    const site = { design: { theme: 'florence' } }
    const page = { id: 'p', themeOverride: 'kyoto' }
    const themeId = pageThemeId(site, page)
    expect(themeId).toBe('kyoto')
    const { container } = render(
      <DesignPopover block={photo} themeId={themeId} onUpdate={() => {}} onClose={() => {}} anchorEl={anchor} />
    )
    expect(container.textContent).toContain('Full bleed')
    expect(container.textContent).not.toContain('Fill')
    // Kyoto has no Frame control.
    expect(container.textContent).not.toContain('Mat')
    expect(container.textContent).not.toContain('Frame')
  })

  it('a page overridden to Florence shows Florence options (Fill + Frame)', () => {
    const site = { design: { theme: 'kyoto' } }
    const page = { id: 'p', themeOverride: 'florence' }
    const themeId = pageThemeId(site, page)
    expect(themeId).toBe('florence')
    const { container } = render(
      <DesignPopover block={{ ...photo, themeState: { florence: { variant: 'centered' } } }} themeId={themeId} onUpdate={() => {}} onClose={() => {}} anchorEl={anchor} />
    )
    expect(container.textContent).toContain('Fill')
    expect(container.textContent).toContain('Frame')
  })
})
