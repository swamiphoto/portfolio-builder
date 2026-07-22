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
  purchaseState: { all: false },
  openPurchase: jest.fn(),
  ...over,
})
afterEach(() => jest.clearAllMocks())

it('renders "View Packages" and opens the drawer', () => {
  const ctx = base()
  useClientEngagement.mockReturnValue(ctx)
  render(<PurchasePrompt />)
  fireEvent.click(screen.getByRole('button', { name: /view packages/i }))
  expect(ctx.openPurchase).toHaveBeenCalled()
})

it('still shows even when the client already owns everything (no per-client hide)', () => {
  useClientEngagement.mockReturnValue(base({ purchaseState: { all: true } }))
  render(<PurchasePrompt />)
  expect(screen.getByRole('button', { name: /view packages/i })).toBeInTheDocument()
})

it('hides when purchase is not active or no packages', () => {
  useClientEngagement.mockReturnValue(base({ features: { purchase: false } }))
  const { container } = render(<PurchasePrompt />)
  expect(container).toBeEmptyDOMElement()
})
