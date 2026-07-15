import { describeStatus } from '@/components/admin/platform/PlatformSidebar'

describe('describeStatus', () => {
  it('reports saving and error states', () => {
    expect(describeStatus({ saveStatus: 'saving' })).toBe('Saving…')
    expect(describeStatus({ saveStatus: 'error' })).toBe('Save failed')
  })
  it('reports a single "Changes made" line for unpublished edits', () => {
    const now = Date.now()
    expect(describeStatus({ hasUnpublishedChanges: true, lastSavedAt: now })).toBe('Changes made just now')
  })
  it('returns null when there is nothing to say (published/idle)', () => {
    expect(describeStatus({ hasUnpublishedChanges: false, lastPublishedAt: Date.now() })).toBeNull()
    expect(describeStatus({})).toBeNull()
  })
})
