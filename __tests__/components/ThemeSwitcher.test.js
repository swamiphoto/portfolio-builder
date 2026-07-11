import { themeOptions } from '@/components/admin/platform/SiteSettingsPopover'

describe('themeOptions', () => {
  it('lists registry themes as {value,label}', () => {
    expect(themeOptions()).toEqual([
      { value: 'kyoto', label: 'Kyoto' },
      { value: 'manhattan', label: 'Manhattan' },
    ])
  })
})
