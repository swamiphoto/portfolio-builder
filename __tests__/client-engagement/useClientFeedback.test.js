import { renderHook, waitFor } from '@testing-library/react'
import { useClientFeedback } from '@/components/admin/platform/useClientFeedback'

beforeEach(() => { jest.restoreAllMocks() })

it('fetches per-page feedback when enabled', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ pageId: 'p1', byPhoto: { 'u': { favCount: 1, favBy: ['A'], comments: [], commentCount: 0 } }, lastActivityTs: 9, hasFeedback: true }),
  })
  const { result } = renderHook(() => useClientFeedback('p1', true))
  await waitFor(() => expect(result.current.hasFeedback).toBe(true))
  expect(global.fetch).toHaveBeenCalledWith('/api/admin/engagement?pageId=p1')
  expect(result.current.byPhoto.u.favCount).toBe(1)
  expect(result.current.lastActivityTs).toBe(9)
})

it('does not fetch when disabled', () => {
  global.fetch = jest.fn()
  const { result } = renderHook(() => useClientFeedback('p1', false))
  expect(global.fetch).not.toHaveBeenCalled()
  expect(result.current.hasFeedback).toBe(false)
  expect(result.current.byPhoto).toEqual({})
})

it('returns empty shape on fetch failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('boom'))
  const { result } = renderHook(() => useClientFeedback('p1', true))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.hasFeedback).toBe(false)
})
