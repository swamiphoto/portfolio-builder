import { getClientIdentity, saveClientIdentity, clearClientIdentity } from '@/common/clientIdentity'

describe('clientIdentity', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing saved', () => {
    expect(getClientIdentity('swami')).toBeNull()
  })

  it('saves and round-trips identity with a generated deviceId', () => {
    const saved = saveClientIdentity('swami', { name: 'Priya', email: 'p@x.com' })
    expect(saved.deviceId).toBeTruthy()
    expect(getClientIdentity('swami')).toEqual(saved)
  })

  it('keeps the same deviceId across re-saves', () => {
    const first = saveClientIdentity('swami', { name: 'Priya', email: '' })
    const second = saveClientIdentity('swami', { name: 'Priya S', email: 'p@x.com' })
    expect(second.deviceId).toBe(first.deviceId)
    expect(second.name).toBe('Priya S')
  })

  it('is scoped per username and clearable', () => {
    saveClientIdentity('swami', { name: 'Priya', email: '' })
    expect(getClientIdentity('other')).toBeNull()
    clearClientIdentity('swami')
    expect(getClientIdentity('swami')).toBeNull()
  })

  it('survives malformed stored JSON', () => {
    localStorage.setItem('sepia:client-identity:swami', '{broken')
    expect(getClientIdentity('swami')).toBeNull()
  })
})
