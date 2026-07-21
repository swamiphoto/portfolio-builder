// __tests__/components/pageCover.packages.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
jest.mock('@/common/imageUtils', () => ({ getSizedUrl: (u) => u }))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PageCover from '@/components/image-displays/page/PageCover'

const cover = { imageUrl: 'https://cdn/x.jpg', height: 'partial', buttonStyle: 'solid' }

afterEach(() => jest.clearAllMocks())

it('renders a View Packages action button when packages are configured, and opens the drawer on click', () => {
  const openPurchase = jest.fn()
  useClientEngagement.mockReturnValue({ features: { purchase: true }, packages: [{ id: 'p1' }], openPurchase })
  render(<PageCover cover={cover} title="Redwoods" slideshowHref="/redwoods/slideshow" />)
  const btn = screen.getByRole('button', { name: /view packages/i })
  fireEvent.click(btn)
  expect(openPurchase).toHaveBeenCalled()
})

it('the secondary (non-first) button uses the complement style (outline classes when primary is solid)', () => {
  useClientEngagement.mockReturnValue({ features: { purchase: true }, packages: [{ id: 'p1' }], openPurchase: () => {} })
  render(<PageCover cover={cover} title="Redwoods" slideshowHref="/redwoods/slideshow" />)
  // First button is "View Music Show" (solid); "View Packages" is later -> outline
  const pkg = screen.getByRole('button', { name: /view packages/i })
  expect(pkg.className).toMatch(/border/) // outline map uses `border border-white`
  const music = screen.getByRole('link', { name: /view music show/i })
  expect(music.className).toMatch(/bg-white/) // solid map
})

it('renders no View Packages button when purchase is off or context is absent', () => {
  useClientEngagement.mockReturnValue(null)
  render(<PageCover cover={cover} title="Redwoods" slideshowHref="/redwoods/slideshow" />)
  expect(screen.queryByRole('button', { name: /view packages/i })).toBeNull()
})
