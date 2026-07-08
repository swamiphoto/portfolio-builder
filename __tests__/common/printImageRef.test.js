jest.mock('../../common/gcsClient', () => ({ PUBLIC_URL: 'https://cdn.example.com' }))
import { printImageRef } from '../../common/print/publicPrint'

describe('printImageRef', () => {
  it('builds a public URL from the master storage key', () => {
    const asset = { print: { sellable: true, masterStorageKey: 'users/u1/print-masters/pic.jpg' } }
    expect(printImageRef(asset)).toEqual({
      masterStorageKey: 'users/u1/print-masters/pic.jpg',
      imageUrl: 'https://cdn.example.com/users/u1/print-masters/pic.jpg',
    })
  })

  it('falls back to the asset display image when there is no master', () => {
    const asset = { print: { sellable: true, masterStorageKey: null }, publicUrl: 'https://cdn.example.com/display/pic.jpg' }
    expect(printImageRef(asset)).toEqual({ masterStorageKey: null, imageUrl: 'https://cdn.example.com/display/pic.jpg' })
  })

  it('returns null when there is no master and no display image', () => {
    expect(printImageRef({ print: { sellable: true } })).toBeNull()
    expect(printImageRef(null)).toBeNull()
  })
})
