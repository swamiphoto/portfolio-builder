/** @jest-environment node */
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    rewrite: jest.fn((url) => ({ type: 'rewrite', url })),
  },
}))
import { middleware } from '../middleware'
import { NextResponse } from 'next/server'

function req(host, pathname = '/') {
  return {
    headers: { get: (k) => (k === 'host' ? host : null) },
    nextUrl: { pathname, clone: () => ({ pathname, href: `https://${host}${pathname}` }) },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'sepia.photo'
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://pub.r2.dev'
  global.fetch = jest.fn()
})

it('rewrites a known custom domain to its /sites/{username} path', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ username: 'jane' }) })
  await middleware(req('photos.janedoe.com', '/portfolio'))
  expect(global.fetch).toHaveBeenCalledWith('https://pub.r2.dev/domains/photos.janedoe.com.json', expect.any(Object))
  const rewritten = NextResponse.rewrite.mock.calls[0][0]
  expect(rewritten.pathname).toBe('/sites/jane/portfolio')
})

it('falls through when the custom domain has no pointer', async () => {
  global.fetch.mockResolvedValue({ ok: false })
  await middleware(req('unknown.com', '/'))
  expect(NextResponse.next).toHaveBeenCalled()
  expect(NextResponse.rewrite).not.toHaveBeenCalled()
})

it('still rewrites a root subdomain without any fetch', async () => {
  await middleware(req('jane.sepia.photo', '/'))
  expect(global.fetch).not.toHaveBeenCalled()
  expect(NextResponse.rewrite.mock.calls[0][0].pathname).toBe('/sites/jane')
})

it('passes through the bare root domain', async () => {
  await middleware(req('sepia.photo', '/'))
  expect(NextResponse.next).toHaveBeenCalled()
})

it('passes /print/* through on a subdomain (checkout confirmation is an app route)', async () => {
  await middleware(req('jane.sepia.photo', '/print/confirmation'))
  expect(NextResponse.next).toHaveBeenCalled()
  expect(NextResponse.rewrite).not.toHaveBeenCalled()
})

it('lowercases a mixed-case custom domain before the pointer lookup', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ username: 'jane' }) })
  await middleware(req('Photos.JaneDoe.com', '/'))
  expect(global.fetch).toHaveBeenCalledWith('https://pub.r2.dev/domains/photos.janedoe.com.json', expect.any(Object))
  const rewritten = NextResponse.rewrite.mock.calls[0][0]
  expect(rewritten.pathname).toBe('/sites/jane')
})
