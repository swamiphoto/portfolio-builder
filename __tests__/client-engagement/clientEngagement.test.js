import {
  emptyEngagement,
  applyEngagementAction,
  getClientDataPath,
  LIMITS,
} from '@/common/clientEngagement'

describe('applyEngagementAction', () => {
  const base = () => emptyEngagement()

  it('builds the client-data path', () => {
    expect(getClientDataPath('u1', 'p1')).toBe('users/u1/client-data/p1.json')
  })

  it('identify upserts a person and preserves firstSeen', () => {
    let d = applyEngagementAction(base(), { type: 'identify', deviceId: 'd1', ts: 100, name: 'Priya', email: 'p@x.com' })
    expect(d.people.d1).toEqual({ name: 'Priya', email: 'p@x.com', firstSeen: 100 })
    d = applyEngagementAction(d, { type: 'identify', deviceId: 'd1', ts: 200, name: 'Priya S', email: '' })
    expect(d.people.d1.firstSeen).toBe(100)
    expect(d.people.d1.name).toBe('Priya S')
  })

  it('favorite is idempotent per (photoUrl, deviceId); unfavorite removes', () => {
    let d = base()
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: 'https://cdn/a.jpg' })
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 2, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toHaveLength(1)
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd2', ts: 3, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toHaveLength(2)
    d = applyEngagementAction(d, { type: 'unfavorite', deviceId: 'd1', ts: 4, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toEqual([{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd2', ts: 3 }])
  })

  it('comment appends with generated id and trims text', () => {
    const d = applyEngagementAction(base(), { type: 'comment', deviceId: 'd1', ts: 5, photoUrl: 'https://cdn/a.jpg', text: '  love this  ' })
    expect(d.comments).toHaveLength(1)
    expect(d.comments[0]).toMatchObject({ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'love this', ts: 5 })
    expect(d.comments[0].id).toMatch(/^c_5_/)
  })

  it('submit records the count of that device favorites', () => {
    let d = base()
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: 'https://cdn/a.jpg' })
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 2, photoUrl: 'https://cdn/b.jpg' })
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd2', ts: 3, photoUrl: 'https://cdn/a.jpg' })
    d = applyEngagementAction(d, { type: 'submit', deviceId: 'd1', ts: 9 })
    expect(d.submissions).toEqual([{ deviceId: 'd1', ts: 9, count: 2 }])
  })

  it('rejects bad input with status 400', () => {
    const cases = [
      { type: 'nope', deviceId: 'd1', ts: 1 },
      { type: 'favorite', deviceId: '', ts: 1, photoUrl: 'x' },
      { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: '' },
      { type: 'comment', deviceId: 'd1', ts: 1, photoUrl: 'x', text: '' },
      { type: 'comment', deviceId: 'd1', ts: 1, photoUrl: 'x', text: 'a'.repeat(LIMITS.COMMENT + 1) },
      { type: 'identify', deviceId: 'd1', ts: 1, name: '', email: '' },
      { type: 'identify', deviceId: 'd1', ts: 1, name: 'a'.repeat(LIMITS.NAME + 1), email: '' },
    ]
    for (const action of cases) {
      let err
      try { applyEngagementAction(emptyEngagement(), action) } catch (e) { err = e }
      expect(err).toBeTruthy()
      expect(err.status).toBe(400)
    }
  })

  it('does not mutate its input', () => {
    const d = base()
    applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toHaveLength(0)
  })

  it('identify rejects a new deviceId when people is at MAX_PEOPLE limit', () => {
    const people = {}
    for (let i = 0; i < LIMITS.MAX_PEOPLE; i++) {
      people[`device_${i}`] = { name: `Person ${i}`, email: '', firstSeen: 1 }
    }
    const data = { ...emptyEngagement(), people }
    let err
    try {
      applyEngagementAction(data, { type: 'identify', deviceId: 'new_device', ts: 1, name: 'Newcomer', email: '' })
    } catch (e) { err = e }
    expect(err).toBeTruthy()
    expect(err.status).toBe(400)
  })

  it('submit rejects when submissions is at MAX_SUBMISSIONS limit', () => {
    const submissions = Array.from({ length: LIMITS.MAX_SUBMISSIONS }, (_, i) => ({ deviceId: `d${i}`, ts: i, count: 0 }))
    const data = { ...emptyEngagement(), submissions }
    let err
    try {
      applyEngagementAction(data, { type: 'submit', deviceId: 'd1', ts: 9999 })
    } catch (e) { err = e }
    expect(err).toBeTruthy()
    expect(err.status).toBe(400)
  })
})
