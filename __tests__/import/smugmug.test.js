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

  it('derives a gallery site map from the album tree', async () => {
    const fetchJson = async (path) => {
      if (path.includes('!albums')) {
        return { Response: { Album: [
          { AlbumKey: 'K1', Name: 'Landscapes', Uris: { AlbumImages: { Uri: '/img/K1' } } },
          { AlbumKey: 'K2', Name: 'City Nights', Uris: { AlbumImages: { Uri: '/img/K2' } } },
        ] } }
      }
      return { Response: { AlbumImage: [{ ArchivedUri: `https://smu.gs${path}/a.jpg`, Caption: '' }] } }
    }

    const result = await smugmug.discover('https://jane.smugmug.com', { fetchJson })
    expect(result.siteMap.pages).toEqual([
      { kind: 'gallery', title: 'Landscapes', slug: 'landscapes', navOrder: 0, sourceUrl: '/img/K1', textContent: '', collectionId: 'K1' },
      { kind: 'gallery', title: 'City Nights', slug: 'city-nights', navOrder: 1, sourceUrl: '/img/K2', textContent: '', collectionId: 'K2' },
    ])
  })
})
