import { aggregateByPhoto, lastActivityTs, hasFeedback, emptyEngagement } from '@/common/clientEngagement'

const data = () => ({
  people: { d1: { name: 'Priya', email: 'p@x.com' }, d2: { name: 'Raj' } },
  favorites: [
    { photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 10 },
    { photoUrl: 'https://cdn/a.jpg', deviceId: 'd2', ts: 12 },
    { photoUrl: 'https://cdn/b.jpg', deviceId: 'd1', ts: 5 },
  ],
  comments: [
    { id: 'c2', photoUrl: 'https://cdn/a.jpg', deviceId: 'd2', text: 'love it', ts: 20 },
    { id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'mom wants this', ts: 8 },
  ],
  submissions: [{ deviceId: 'd1', ts: 30, count: 2 }],
})

describe('aggregateByPhoto', () => {
  it('groups favorites and comments by photoUrl and resolves names', () => {
    const m = aggregateByPhoto(data())
    expect(m['https://cdn/a.jpg'].favCount).toBe(2)
    expect(m['https://cdn/a.jpg'].favBy).toEqual(['Priya', 'Raj'])
    expect(m['https://cdn/b.jpg']).toEqual({ favBy: ['Priya'], favCount: 1, comments: [], commentCount: 0 })
  })

  it('orders comments chronologically and resolves names, defaulting to "Someone"', () => {
    const d = data()
    d.comments.push({ id: 'c3', photoUrl: 'https://cdn/a.jpg', deviceId: 'dX', text: 'hi', ts: 25 })
    const m = aggregateByPhoto(d)
    expect(m['https://cdn/a.jpg'].comments.map(c => c.text)).toEqual(['mom wants this', 'love it', 'hi'])
    expect(m['https://cdn/a.jpg'].comments.map(c => c.name)).toEqual(['Priya', 'Raj', 'Someone'])
    expect(m['https://cdn/a.jpg'].commentCount).toBe(3)
  })

  it('dedupes favorites by (photoUrl, deviceId) in favBy', () => {
    const d = data()
    d.favorites.push({ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 99 })
    const m = aggregateByPhoto(d)
    expect(m['https://cdn/a.jpg'].favBy).toEqual(['Priya', 'Raj'])
  })

  it('returns {} for empty engagement', () => {
    expect(aggregateByPhoto(emptyEngagement())).toEqual({})
  })
})

describe('lastActivityTs / hasFeedback', () => {
  it('returns the max ts across favorites, comments, submissions', () => {
    expect(lastActivityTs(data())).toBe(30)
  })
  it('is 0 and false for empty', () => {
    expect(lastActivityTs(emptyEngagement())).toBe(0)
    expect(hasFeedback(emptyEngagement())).toBe(false)
  })
  it('hasFeedback is true when any favorite or comment exists', () => {
    expect(hasFeedback({ ...emptyEngagement(), comments: [{ id: 'c', photoUrl: 'u', deviceId: 'd', text: 't', ts: 1 }] })).toBe(true)
  })
})
