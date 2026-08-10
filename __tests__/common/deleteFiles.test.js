// The send mock lives INSIDE the factory (ES imports hoist above top-level
// consts, so referencing an outer const here would hit the TDZ when gcsClient
// constructs its S3Client at import time). We read it back off the mocked module.
jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn()
  return {
    __send: send,
    S3Client: jest.fn(() => ({ send })),
    GetObjectCommand: jest.fn(),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn((input) => ({ __type: 'DeleteObjects', input })),
    ListObjectsV2Command: jest.fn(),
  }
})
jest.mock('@aws-sdk/s3-presigned-post', () => ({ createPresignedPost: jest.fn() }))

import * as s3mod from '@aws-sdk/client-s3'
import { deleteFiles } from '@/common/gcsClient'

const mockSend = s3mod.__send
const DeleteObjectsCommand = s3mod.DeleteObjectsCommand

beforeEach(() => { mockSend.mockReset(); DeleteObjectsCommand.mockClear() })

describe('deleteFiles (batch delete)', () => {
  it('batches into chunks of at most 1000 keys per request', async () => {
    mockSend.mockResolvedValue({ Deleted: [], Errors: [] })
    const keys = Array.from({ length: 2500 }, (_, i) => `users/u1/k${i}`)
    const { deleted, errors } = await deleteFiles(keys)

    expect(mockSend).toHaveBeenCalledTimes(3) // 1000 + 1000 + 500
    const chunkSizes = DeleteObjectsCommand.mock.calls.map((c) => c[0].Delete.Objects.length)
    expect(chunkSizes).toEqual([1000, 1000, 500])
    expect(deleted).toBe(2500)
    expect(errors).toEqual([])
  })

  it('aggregates per-key errors and still counts the successes', async () => {
    mockSend.mockResolvedValueOnce({ Deleted: [], Errors: [{ Key: 'users/u1/bad', Message: 'AccessDenied' }] })
    const { deleted, errors } = await deleteFiles(['users/u1/bad', 'users/u1/ok'])
    expect(errors).toEqual([{ key: 'users/u1/bad', message: 'AccessDenied' }])
    expect(deleted).toBe(1)
  })

  it('handles empty input without calling S3', async () => {
    const { deleted, errors } = await deleteFiles([])
    expect(mockSend).not.toHaveBeenCalled()
    expect(deleted).toBe(0)
    expect(errors).toEqual([])
  })
})
