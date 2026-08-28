import { isPlatformAdmin } from '@/common/platformAdmin'

const OLD = process.env.SEPIA_ADMIN_EMAILS
afterEach(() => { process.env.SEPIA_ADMIN_EMAILS = OLD })

it('returns false when env is unset', () => {
  delete process.env.SEPIA_ADMIN_EMAILS
  expect(isPlatformAdmin({ email: 'a@b.com' })).toBe(false)
})

it('matches case-insensitively against the allowlist', () => {
  process.env.SEPIA_ADMIN_EMAILS = 'Owner@Sepia.Photo, second@x.com'
  expect(isPlatformAdmin({ email: 'owner@sepia.photo' })).toBe(true)
  expect(isPlatformAdmin({ email: 'SECOND@X.COM' })).toBe(true)
  expect(isPlatformAdmin({ email: 'nope@x.com' })).toBe(false)
  expect(isPlatformAdmin({})).toBe(false)
})
