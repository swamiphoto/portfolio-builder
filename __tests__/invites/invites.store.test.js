const mockDownload = jest.fn()
const mockUpload = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/gcsClient', () => ({
  downloadJSON: (...a) => mockDownload(...a),
  uploadJSON: (...a) => mockUpload(...a),
}))

import { normalizeInviteCode, readInvite, writeInvite, createInvite } from '@/common/invites'

beforeEach(() => {
  jest.clearAllMocks()
  mockUpload.mockResolvedValue(undefined)
})

describe('normalizeInviteCode', () => {
  it('uppercases, trims, and strips illegal chars', () => {
    expect(normalizeInviteCode('  sepia-early!! ')).toBe('SEPIA-EARLY')
  })
  it('returns empty string for falsy input', () => {
    expect(normalizeInviteCode('')).toBe('')
    expect(normalizeInviteCode(undefined)).toBe('')
  })
})

describe('readInvite', () => {
  it('normalizes the code and returns the doc', async () => {
    mockDownload.mockResolvedValue({ code: 'SEPIA-EARLY', uses: 0 })
    const doc = await readInvite('sepia-early')
    expect(mockDownload).toHaveBeenCalledWith('invites/SEPIA-EARLY.json')
    expect(doc.code).toBe('SEPIA-EARLY')
  })
  it('returns null when the key is missing', async () => {
    mockDownload.mockRejectedValue({ name: 'NoSuchKey' })
    expect(await readInvite('nope')).toBeNull()
  })
})

describe('createInvite', () => {
  it('stores a normalized explicit code with defaults', async () => {
    const doc = await createInvite({ code: 'sepia-early', label: 'Batch 1' })
    expect(doc.code).toBe('SEPIA-EARLY')
    expect(doc.label).toBe('Batch 1')
    expect(doc.maxUses).toBeNull()
    expect(doc.expiresAt).toBeNull()
    expect(doc.trialDays).toBe(60)
    expect(doc.uses).toBe(0)
    expect(doc.redeemedBy).toEqual([])
    expect(typeof doc.createdAt).toBe('string')
    expect(mockUpload).toHaveBeenCalledWith('invites/SEPIA-EARLY.json', doc)
  })
  it('generates a code when none is given', async () => {
    const doc = await createInvite({})
    expect(doc.code).toMatch(/^[A-Z0-9-]+$/)
    expect(doc.code.length).toBeGreaterThanOrEqual(6)
    expect(mockUpload).toHaveBeenCalledWith(`invites/${doc.code}.json`, doc)
  })
  it('honors explicit maxUses, expiresAt, trialDays', async () => {
    const doc = await createInvite({ code: 'ONE', maxUses: 1, expiresAt: '2027-01-01T00:00:00.000Z', trialDays: 30 })
    expect(doc.maxUses).toBe(1)
    expect(doc.expiresAt).toBe('2027-01-01T00:00:00.000Z')
    expect(doc.trialDays).toBe(30)
  })
  it('refuses to overwrite an existing code (would wipe uses/redeemedBy)', async () => {
    mockDownload.mockResolvedValue({ code: 'SEPIA-EARLY', uses: 3, redeemedBy: [{ userId: 'u1' }] })
    await expect(createInvite({ code: 'sepia-early' })).rejects.toMatchObject({ code: 'CODE_EXISTS' })
    expect(mockUpload).not.toHaveBeenCalled()
  })
  it('rejects garbage numerics instead of silently minting an unlimited code', async () => {
    mockDownload.mockRejectedValue({ name: 'NoSuchKey' }) // no existing code
    // Number('abc') is NaN, which JSON-serializes to null — i.e. unlimited uses.
    await expect(createInvite({ code: 'A', maxUses: 'abc' })).rejects.toThrow(/maxUses/)
    await expect(createInvite({ code: 'A', expiresAt: 'next week' })).rejects.toThrow(/expiresAt/)
    await expect(createInvite({ code: 'A', trialDays: 0 })).rejects.toThrow(/trialDays/)
    expect(mockUpload).not.toHaveBeenCalled()
  })
  it('caps hostile code length so it cannot become a huge storage key', async () => {
    mockDownload.mockRejectedValue({ name: 'NoSuchKey' }) // no existing code
    const doc = await createInvite({ code: 'X'.repeat(500) })
    expect(doc.code.length).toBe(64)
  })
})

describe('writeInvite', () => {
  it('writes to the code key', async () => {
    await writeInvite({ code: 'SEPIA-EARLY', uses: 2 })
    expect(mockUpload).toHaveBeenCalledWith('invites/SEPIA-EARLY.json', { code: 'SEPIA-EARLY', uses: 2 })
  })
})
