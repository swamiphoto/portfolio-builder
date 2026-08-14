// __tests__/components/SidebarSection.test.js
import { render } from '@testing-library/react'
import SidebarSection from '@/components/admin/platform/SidebarSection'

describe('SidebarSection empty-state spacing', () => {
  it('reserves a drop-target min-height when empty (so you can drag pages in)', () => {
    const { container } = render(
      <SidebarSection label="" pages={[]} renderRow={() => null} droppableId="main-nav" />
    )
    const drop = container.querySelector('[data-droppable="main-nav"]')
    expect(drop.style.minHeight).toBe('44px')
  })

  it('drops the reserved min-height while a new-page draft is rendered right after it (no gap above the draft row)', () => {
    const { container } = render(
      <SidebarSection label="" pages={[]} renderRow={() => null} droppableId="main-nav" draftingHere />
    )
    const drop = container.querySelector('[data-droppable="main-nav"]')
    expect(drop.style.minHeight).toBe('')
  })
})
