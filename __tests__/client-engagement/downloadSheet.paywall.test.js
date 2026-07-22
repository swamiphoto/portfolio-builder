// __tests__/client-engagement/downloadSheet.paywall.test.js
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import DownloadSheet from '@/components/image-displays/engagement/DownloadSheet'

afterEach(() => jest.clearAllMocks())

function makeCtx(overrides = {}) {
  return {
    features: { purchase: true },
    identity: { deviceId: 'd1' },
    username: 'testuser',
    pageId: 'pg1',
    pageSlug: 'my-gallery',
    openPurchase: jest.fn(),
    ...overrides,
  }
}

it('calls openPurchase and closes sheet when server returns 402', async () => {
  const openPurchase = jest.fn()
  useClientEngagement.mockReturnValue(makeCtx({ openPurchase }))

  global.fetch = jest.fn().mockResolvedValue({ status: 402, ok: false })

  const onClose = jest.fn()
  render(<DownloadSheet photoUrl="https://example.com/photo.jpg" onClose={onClose} />)

  await act(async () => {
    fireEvent.click(screen.getByText('Web'))
  })

  expect(openPurchase).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
  // no navigation should have happened
  expect(document.querySelector('a[href*="download"]')).toBeNull()
})

it('creates blob download anchor and does NOT call openPurchase on 200 ok', async () => {
  const openPurchase = jest.fn()
  useClientEngagement.mockReturnValue(makeCtx({ openPurchase }))

  const blob = new Blob(['x'])
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    blob: async () => blob,
  })
  URL.createObjectURL = jest.fn(() => 'blob:x')
  URL.revokeObjectURL = jest.fn()

  const onClose = jest.fn()
  render(<DownloadSheet photoUrl="https://example.com/photo.jpg" onClose={onClose} />)

  await act(async () => {
    fireEvent.click(screen.getByText('Web'))
  })

  expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
  expect(openPurchase).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledTimes(1)
})
