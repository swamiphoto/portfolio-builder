import smugmug from '@/common/import/adapters/smugmug'

function fakeApi() {
  return (path) => {
    if (path.includes('!albums')) {
      return Promise.resolve({
        Response: { Album: [{ AlbumKey: 'AAA', Name: 'Travel', Uris: { AlbumImages: { Uri: '/api/v2/album/AAA!images' } } }] },
      })
    }
    if (path.includes('album/AAA!images')) {
      return Promise.resolve({
        Response: {
          AlbumImage: [
            { Caption: 'Sunset', ArchivedUri: 'https://photos.smugmug.com/AAA/sunset-O.jpg' },
            { Caption: '', ArchivedUri: 'https://photos.smugmug.com/AAA/beach-O.jpg' },
          ],
        },
      })
    }
    return Promise.reject(new Error('unexpected path ' + path))
  }
}

describe('smugmug.discover', () => {
  it('maps albums to collections and images to asset refs', async () => {
    const result = await smugmug.discover('https://joe.smugmug.com', { fetchJson: fakeApi() })
    expect(result.site.title).toBe('joe')
    expect(result.collections).toHaveLength(1)
    const col = result.collections[0]
    expect(col.name).toBe('Travel')
    expect(col.assetRefs).toEqual([
      { remoteUrl: 'https://photos.smugmug.com/AAA/sunset-O.jpg', caption: 'Sunset' },
      { remoteUrl: 'https://photos.smugmug.com/AAA/beach-O.jpg', caption: null },
    ])
  })
})
