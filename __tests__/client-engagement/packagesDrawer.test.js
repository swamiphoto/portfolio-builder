// __tests__/client-engagement/packagesDrawer.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PackagesDrawer from '@/components/image-displays/engagement/PackagesDrawer'

afterEach(() => jest.clearAllMocks())

it('shows "Packages", lists grants + prices, and buys via buyPackage — with no unlocked-count header', () => {
  const buyPackage = jest.fn()
  useClientEngagement.mockReturnValue({
    identity: { email: 'mia@x.com' },
    purchaseCurrency: 'USD',
    packages: [
      { id: 'pkg_a', label: 'Add-on pack', credits: 10, price: 4000 },
      { id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 },
    ],
    buyPackage,
  })
  render(<PackagesDrawer open onClose={() => {}} />)
  expect(screen.getByText('Packages')).toBeInTheDocument()
  expect(screen.getByText('10 more photos')).toBeInTheDocument()
  expect(screen.getByText('Everything in this gallery')).toBeInTheDocument()
  expect(screen.getByText('$150.00')).toBeInTheDocument()
  expect(screen.queryByText(/unlocked/i)).toBeNull()
  fireEvent.click(screen.getByText('Entire gallery'))
  expect(buyPackage).toHaveBeenCalledWith('pkg_all')
})

it('closes the drawer before calling buyPackage when the buyer has no email', () => {
  const buyPackage = jest.fn()
  const onClose = jest.fn()
  useClientEngagement.mockReturnValue({
    identity: { email: '' },
    purchaseCurrency: 'USD',
    packages: [
      { id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 },
    ],
    buyPackage,
  })
  render(<PackagesDrawer open onClose={onClose} />)
  fireEvent.click(screen.getByText('Entire gallery'))
  expect(onClose).toHaveBeenCalled()
  expect(buyPackage).toHaveBeenCalledWith('pkg_all')
})
