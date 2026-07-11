/** @jest-environment node */

import { isPrivateIp, assertHttpUrl } from '@/common/import/safeFetch'

describe('isPrivateIp', () => {
  it('returns true for loopback 127.0.0.1', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true)
  })
  it('returns true for 10.x.x.x', () => {
    expect(isPrivateIp('10.0.0.5')).toBe(true)
  })
  it('returns true for 192.168.x.x', () => {
    expect(isPrivateIp('192.168.1.1')).toBe(true)
  })
  it('returns true for 172.16.x.x', () => {
    expect(isPrivateIp('172.16.0.1')).toBe(true)
  })
  it('returns true for link-local metadata 169.254.169.254', () => {
    expect(isPrivateIp('169.254.169.254')).toBe(true)
  })
  it('returns true for IPv6 loopback ::1', () => {
    expect(isPrivateIp('::1')).toBe(true)
  })
  it('returns true for IPv6 link-local fe80::1', () => {
    expect(isPrivateIp('fe80::1')).toBe(true)
  })
  it('returns true for IPv6 ULA fc00::1', () => {
    expect(isPrivateIp('fc00::1')).toBe(true)
  })
  it('returns true for non-parseable IP (treat as unsafe)', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true)
  })
  it('returns false for public 8.8.8.8', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false)
  })
  it('returns false for public 1.1.1.1', () => {
    expect(isPrivateIp('1.1.1.1')).toBe(false)
  })
  it('returns false for public IPv6 2606:4700:4700::1111', () => {
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false)
  })
})

describe('assertHttpUrl', () => {
  it('throws for file:// scheme', () => {
    expect(() => assertHttpUrl('file:///etc/passwd')).toThrow('blocked URL scheme')
  })
  it('throws for ftp:// scheme', () => {
    expect(() => assertHttpUrl('ftp://x/y')).toThrow('blocked URL scheme')
  })
  it('throws for gopher:// scheme', () => {
    expect(() => assertHttpUrl('gopher://x')).toThrow('blocked URL scheme')
  })
  it('returns a URL for https', () => {
    const u = assertHttpUrl('https://example.com/a.jpg')
    expect(u).toBeInstanceOf(URL)
    expect(u.hostname).toBe('example.com')
  })
})
