// __tests__/client-engagement/purchasePrompt.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PurchasePrompt from '@/components/image-displays/engagement/PurchasePrompt'

const base = (over) => ({
  features: { purchase: true },
  packages: [{ id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 }],
  purchaseState: { all: false, remaining: 0 },
  openPurchase: jest.fn(),
  ...over,
})
afterEach(() => jest.clearAllMocks())

it('renders and opens the purchase sheet', () => {
  const ctx = base()
  useClientEngagement.mockReturnValue(ctx)
  render(<PurchasePrompt />)
  fireEvent.click(screen.getByRole('button', { name: /get the full set/i }))
  expect(ctx.openPurchase).toHaveBeenCalled()
})

it('hides when the viewer already owns the whole gallery', () => {
  useClientEngagement.mockReturnValue(base({ purchaseState: { all: true } }))
  const { container } = render(<PurchasePrompt />)
  expect(container).toBeEmptyDOMElement()
})

it('hides when purchase is not active', () => {
  useClientEngagement.mockReturnValue(base({ features: { purchase: false } }))
  const { container } = render(<PurchasePrompt />)
  expect(container).toBeEmptyDOMElement()
})
