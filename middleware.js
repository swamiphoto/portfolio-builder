// middleware.js
import { NextResponse } from 'next/server'
import { parseHost } from './common/domainUtils'

const PASSTHROUGH = [
  '/studio', '/api/', '/_next/', '/auth/', '/onboarding', '/sites/', '/fonts/', '/images/', '/print/',
]

function isPassthrough(pathname) {
  if (pathname === '/favicon.ico') return true
  return PASSTHROUGH.some((p) => pathname.startsWith(p))
}

async function lookupCustomDomain(host) {
  // Edge runtime only inlines NEXT_PUBLIC_* vars; set NEXT_PUBLIC_R2_PUBLIC_URL in production
  // (the R2_PUBLIC_URL fallback only works in the Node runtime, not at the edge).
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL
  if (!base) return null
  const hostname = host.split(':')[0].toLowerCase()
  try {
    const res = await fetch(`${base}/domains/${hostname}.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data?.username || null
  } catch {
    return null
  }
}

export async function middleware(req) {
  const host = req.headers.get('host') || ''
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005').replace(/^https?:\/\//, '')
  const { pathname } = req.nextUrl

  // The studio moved from /admin to /studio — redirect legacy paths (any host),
  // preserving subpath + query so old bookmarks and links keep working.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const url = req.nextUrl.clone()
    url.pathname = '/studio' + pathname.slice('/admin'.length)
    return NextResponse.redirect(url)
  }

  const parsed = parseHost(host, rootDomain)
  if (parsed.kind === 'root') return NextResponse.next()
  if (isPassthrough(pathname)) return NextResponse.next()

  const username = parsed.kind === 'subdomain'
    ? parsed.subdomain
    : await lookupCustomDomain(host)
  if (!username) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = `/sites/${username}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
