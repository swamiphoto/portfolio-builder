// __tests__/client-engagement/purchaseSheet.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PurchaseSheet from '@/components/image-displays/engagement/PurchaseSheet'

afterEach(() => jest.clearAllMocks())

it('lists packages with formatted prices and calls startCheckout', () => {
  const startCheckout = jest.fn()
  useClientEngagement.mockReturnValue({
    purchaseCurrency: 'USD',
    purchaseState: { unlockedCount: 2, ceiling: 2, all: false, remaining: 0 },
    packages: [
      { id: 'pkg_a', label: 'Add-on pack', credits: 10, price: 4000 },
      { id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 },
    ],
    startCheckout,
  })
  render(<PurchaseSheet onClose={() => {}} />)
  expect(screen.getByText('Add-on pack')).toBeInTheDocument()
  expect(screen.getByText('10 more photos')).toBeInTheDocument() // numeric sub-label
  expect(screen.getByText('$40.00')).toBeInTheDocument()
  expect(screen.getByText('$150.00')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Entire gallery'))
  expect(startCheckout).toHaveBeenCalledWith('pkg_all')
})
