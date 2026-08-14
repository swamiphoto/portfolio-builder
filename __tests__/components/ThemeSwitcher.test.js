import { themeOptions } from '@/components/admin/platform/SiteSettingsPopover'

describe('themeOptions', () => {
  it('lists selectable (non-hidden) registry themes as {value,label}', () => {
    // Provence is registered but hidden while it's refined, so it's off the picker.
    expect(themeOptions()).toEqual([
      { value: 'kyoto', label: 'Kyoto' },
      { value: 'manhattan', label: 'Copenhagen' },
      { value: 'florence', label: 'Florence' },
      { value: 'amsterdam', label: 'Amsterdam' },
    ])
  })
})
