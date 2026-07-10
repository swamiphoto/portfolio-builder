// __tests__/library/deleteFiles.route.test.js
//
// Test-mechanic notes (deviations from brief):
// 1. Brief used `import { jest } from '@jest/globals'` — not used here; CJS-style Jest globals
//    match every other test in this project (e.g. discover.route.test.js, fetchBatch.route.test.js).
// 2. Brief used top-level `await import(...)` to load the handler after mocks. SWC/CJS Jest
//    does not support top-level await in test files. Replaced with a regular static import —
//    jest.mock() is hoisted above all imports by SWC, so mocks are in place before import runs.
// 3. All mock fn variables already use the "mock" prefix (mockDelete) so SWC hoist works correctly.

jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

const mockDelete = jest.fn().mockResolvedValue({})
jest.mock('@/common/gcsClient', () => ({ deleteFile: (...a) => mockDelete(...a), PUBLIC_URL: 'https://cdn.test' }))

import handler from '@/pages/api/admin/dedup/delete-files'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('POST /api/admin/dedup/delete-files', () => {
  beforeEach(() => mockDelete.mockClear())

  it('deletes original + thumbnail for each url', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { urls: ['https://cdn.test/users/u1/photos/import/a.jpg'] } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockDelete).toHaveBeenCalledWith('users/u1/photos/import/a.jpg')
    expect(mockDelete).toHaveBeenCalledWith('users/u1/thumbnails/import/a.jpg')
    expect(res.json.mock.calls[0][0].deleted).toBe(1)
  })
})
