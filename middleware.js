// middleware.js
import { NextResponse } from 'next/server'

export function middleware(req) {
  const host = req.headers.get('host') || ''
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005').replace(/^https?:\/\//, '')

  // Extract subdomain: "swamiphoto.lvh.me:3005" → "swamiphoto"
  // "lvh.me:3005" → no subdomain
  const withoutRoot = host.endsWith(`.${rootDomain}`)
  const subdomain = withoutRoot ? host.slice(0, host.length - rootDomain.length - 1) : null

  if (!subdomain || subdomain === 'www') {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  // Let admin, API, auth, Next.js internals, and explicit /sites/ paths pass through as-is
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/sites/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Rewrite public portfolio requests to /sites/[username][path]
  const url = req.nextUrl.clone()
  url.pathname = `/sites/${subdomain}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
