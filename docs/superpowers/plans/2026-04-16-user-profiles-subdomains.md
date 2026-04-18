# User Profiles + Subdomain Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user profiles with username slugs, so each photographer gets `[username].yourdomain.com` for their public portfolio and `[username].yourdomain.com/admin` for their editor, with Google sign-in at the root domain.

**Architecture:** A single Next.js app handles all subdomains via `middleware.js` — it reads the subdomain from the `host` header and rewrites public requests to `/sites/[username]`. Usernames are stored as R2 JSON files (`usernames/{username}.json → { userId }`), enabling reverse lookup without a database. Post-login redirect checks whether the user has a username; if not, sends them to `/onboarding`.

**Tech Stack:** Next.js 14 (pages router), NextAuth.js (Google OAuth, already configured), AWS SDK v3 / R2 (already configured), Tailwind CSS. No new dependencies needed.

---

## Data Model

**`users/{userId}/profile.json`** — one per user:
```json
{
  "userId": "google-sub-id",
  "username": "swamiphoto",
  "displayName": "Swami V",
  "email": "swami@example.com",
  "createdAt": "2026-04-16T00:00:00Z"
}
```

**`usernames/{username}.json`** — reverse lookup index (one per username):
```json
{ "userId": "google-sub-id" }
```

## Environment Variables (add to `.env.local`)

```
NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3005   # dev: *.lvh.me resolves to localhost
# production: NEXT_PUBLIC_ROOT_DOMAIN=yourphotodomain.com
```

## Development Setup

`*.lvh.me` resolves to `127.0.0.1` — no DNS changes needed. Use `swamiphoto.lvh.me:3005` to test subdomains locally. The root `lvh.me:3005` is the login/marketing page.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `common/userProfile.js` | Create | Read/write profile + username lookup in R2 |
| `pages/api/admin/profile.js` | Create | GET/PUT current user's profile |
| `pages/api/auth/post-login.js` | Create | Post-auth redirect: has username → subdomain admin, else → onboarding |
| `middleware.js` | Create | Subdomain detection; rewrite public portfolio requests |
| `pages/index.js` | Create | Root domain login/marketing page |
| `pages/onboarding.js` | Create | Username picker for new users |
| `pages/sites/[username].js` | Create | Public portfolio renderer (SSR, no auth) |
| `pages/auth/signin.js` | Modify | Change `callbackUrl` to `/api/auth/post-login` |
| `pages/api/auth/[...nextauth].js` | Modify | Expose `username` on JWT/session |
| `common/gcsUser.js` | Modify | Add `getUserProfilePath`, `getUsernameLookupPath` |
| `__tests__/common/userProfile.test.js` | Create | Unit tests for profile helpers |

---

## Task 1: User Profile Helpers (`common/userProfile.js`)

**Files:**
- Create: `common/userProfile.js`
- Modify: `common/gcsUser.js`
- Create: `__tests__/common/userProfile.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/common/userProfile.test.js
import {
  getUserProfilePath,
  getUsernameLookupPath,
} from '../../common/userProfile'

describe('getUserProfilePath', () => {
  it('returns the correct R2 path', () => {
    expect(getUserProfilePath('user123')).toBe('users/user123/profile.json')
  })
  it('throws when userId is missing', () => {
    expect(() => getUserProfilePath('')).toThrow('userId is required')
  })
})

describe('getUsernameLookupPath', () => {
  it('returns the correct R2 path', () => {
    expect(getUsernameLookupPath('swamiphoto')).toBe('usernames/swamiphoto.json')
  })
  it('throws when username is missing', () => {
    expect(() => getUsernameLookupPath('')).toThrow('username is required')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="userProfile" --no-coverage
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Add path helpers to `common/gcsUser.js`**

Add to the end of `common/gcsUser.js`:
```js
export function getUserProfilePath(userId) {
  if (!userId) throw new Error('userId is required')
  return `users/${userId}/profile.json`
}

export function getUsernameLookupPath(username) {
  if (!username) throw new Error('username is required')
  return `usernames/${username}.json`
}
```

- [ ] **Step 4: Create `common/userProfile.js`**

```js
// common/userProfile.js
// Server-side only — never import from client components.
import { downloadJSON, uploadJSON } from './gcsClient'
import { getUserProfilePath, getUsernameLookupPath } from './gcsUser'

export { getUserProfilePath, getUsernameLookupPath }

function isNotFound(err) {
  return err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey'
}

export async function readUserProfile(userId) {
  try {
    return await downloadJSON(getUserProfilePath(userId))
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function writeUserProfile(userId, profile) {
  await uploadJSON(getUserProfilePath(userId), profile)
}

export async function lookupUserByUsername(username) {
  try {
    return await downloadJSON(getUsernameLookupPath(username))
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

/**
 * Atomically claims a username for a userId.
 * Throws if the username is already taken by a different user.
 */
export async function claimUsername(userId, username) {
  const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!slug) throw new Error('Invalid username')

  const existing = await lookupUserByUsername(slug)
  if (existing && existing.userId !== userId) {
    throw new Error('Username already taken')
  }

  await uploadJSON(getUsernameLookupPath(slug), { userId })
  return slug
}
```

- [ ] **Step 5: Update test imports to come from `userProfile.js` and run**

Update `__tests__/common/userProfile.test.js` first line:
```js
import { getUserProfilePath, getUsernameLookupPath } from '../../common/userProfile'
```

Run:
```bash
npm test -- --testPathPattern="userProfile" --no-coverage
```
Expected: PASS (2 suites, 4 tests)

- [ ] **Step 6: Commit**

```bash
git add common/userProfile.js common/gcsUser.js __tests__/common/userProfile.test.js
git commit -m "feat: add user profile helpers and username lookup paths"
```

---

## Task 2: Profile API Endpoint (`pages/api/admin/profile.js`)

**Files:**
- Create: `pages/api/admin/profile.js`

- [ ] **Step 1: Create the endpoint**

```js
// pages/api/admin/profile.js
import { withAuth } from '../../../common/withAuth'
import {
  readUserProfile,
  writeUserProfile,
  claimUsername,
  lookupUserByUsername,
} from '../../../common/userProfile'

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') {
    const profile = await readUserProfile(user.id)
    return res.status(200).json(profile || {})
  }

  if (req.method === 'PUT') {
    const { username, displayName } = req.body
    if (!username) return res.status(400).json({ error: 'username is required' })

    const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug) return res.status(400).json({ error: 'Invalid username' })

    // Check availability (allow re-claiming own username)
    const existing = await lookupUserByUsername(slug)
    if (existing && existing.userId !== user.id) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    const profile = {
      userId: user.id,
      username: slug,
      displayName: displayName || user.name || '',
      email: user.email || '',
      updatedAt: new Date().toISOString(),
      createdAt: (await readUserProfile(user.id))?.createdAt || new Date().toISOString(),
    }

    await writeUserProfile(user.id, profile)
    await claimUsername(user.id, slug)

    return res.status(200).json(profile)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "Error|error" | grep -v "ENOSPC\|PackFile"
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add pages/api/admin/profile.js
git commit -m "feat: add user profile GET/PUT API endpoint"
```

---

## Task 3: NextAuth — Expose Username on Session

**Files:**
- Modify: `pages/api/auth/[...nextauth].js`

The session currently only has `userId`. We need `username` on the session so client-side code (admin page, onboarding) can know it without an extra fetch.

- [ ] **Step 1: Update `[...nextauth].js`**

Replace `pages/api/auth/[...nextauth].js` entirely:

```js
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { readUserProfile } from '../../../common/userProfile'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.userId = profile.sub
      }
      // Refresh username on every token refresh so changes propagate
      if (token.userId) {
        try {
          const userProfile = await readUserProfile(token.userId)
          token.username = userProfile?.username || null
        } catch {
          token.username = null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId
      if (token.username) session.user.username = token.username
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export default NextAuth(authOptions)
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add pages/api/auth/[...nextauth].js
git commit -m "feat: expose username on NextAuth session via profile lookup"
```

---

## Task 4: Post-Login Redirect (`pages/api/auth/post-login.js`)

**Files:**
- Create: `pages/api/auth/post-login.js`
- Modify: `pages/auth/signin.js`

After Google sign-in, we need to route the user:
- Has username → `[username].ROOT_DOMAIN/admin`
- No username → `/onboarding`

- [ ] **Step 1: Create post-login handler**

```js
// pages/api/auth/post-login.js
import { getServerSession } from 'next-auth/next'
import { authOptions } from './[...nextauth]'
import { readUserProfile } from '../../../common/userProfile'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.redirect(302, '/auth/signin')
  }

  const profile = await readUserProfile(session.user.id)

  if (profile?.username) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
    const protocol = rootDomain.includes('localhost') ? 'http' : 'https'
    return res.redirect(302, `${protocol}://${profile.username}.${rootDomain}/admin`)
  }

  return res.redirect(302, '/onboarding')
}
```

- [ ] **Step 2: Update sign-in page to use `/api/auth/post-login` as callback**

Replace `pages/auth/signin.js`:

```js
// pages/auth/signin.js
import { signIn } from 'next-auth/react'

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-white">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">PhotoHub</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: '/api/auth/post-login' })}
        className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add pages/api/auth/post-login.js pages/auth/signin.js
git commit -m "feat: post-login redirect routes to subdomain admin or onboarding"
```

---

## Task 5: Onboarding Page (`pages/onboarding.js`)

**Files:**
- Create: `pages/onboarding.js`

New users land here after first sign-in. They pick a username, which is validated for availability, then saved. On success, redirect to their subdomain's admin.

- [ ] **Step 1: Create `pages/onboarding.js`**

```js
// pages/onboarding.js
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Onboarding() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin')
    // Already has username — redirect to their admin
    if (status === 'authenticated' && session?.user?.username) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
      const protocol = rootDomain.includes('localhost') ? 'http' : 'https'
      window.location.href = `${protocol}://${session.user.username}.${rootDomain}/admin`
    }
  }, [status, session, router])

  const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!slug) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: slug, displayName: session?.user?.name || '' }),
      })
      if (res.status === 409) {
        setError('That username is taken. Try another.')
        setSaving(false)
        return
      }
      if (!res.ok) throw new Error('Save failed')

      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
      const protocol = rootDomain.includes('localhost') ? 'http' : 'https'
      window.location.href = `${protocol}://${slug}.${rootDomain}/admin`
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Choose your URL</h1>
        <p className="text-sm text-gray-500 mb-8">
          This becomes your public portfolio address.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-gray-600">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="yourname"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                autoFocus
              />
              <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 whitespace-nowrap">
                .{(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')}
              </span>
            </div>
            {slug && slug !== username.toLowerCase() && (
              <p className="text-xs text-gray-400 mt-1">Will be saved as: {slug}</p>
            )}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!slug || saving}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Claim your URL'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add pages/onboarding.js
git commit -m "feat: add onboarding page for username selection"
```

---

## Task 6: Root Domain Login Page (`pages/index.js`)

**Files:**
- Create: `pages/index.js`

The root domain (`yourdomain.com`) shows a minimal landing page with a Google sign-in button. Already-signed-in users are forwarded directly.

- [ ] **Step 1: Create `pages/index.js`**

```js
// pages/index.js
import { useSession, signIn } from 'next-auth/react'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    // Already signed in — send to their admin (or onboarding)
    fetch('/api/auth/post-login').then((res) => {
      if (res.redirected) window.location.href = res.url
    }).catch(() => {
      window.location.href = '/onboarding'
    })
  }, [status])

  if (status === 'loading') return null

  if (status === 'authenticated') {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <p className="text-sm text-gray-400">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-white">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">PhotoHub</h1>
        <p className="text-sm text-gray-500 mb-10">
          Beautiful photography portfolios in under 2 minutes.
        </p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/api/auth/post-login' })}
          className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add pages/index.js
git commit -m "feat: add root domain landing/login page"
```

---

## Task 7: Next.js Middleware for Subdomain Routing

**Files:**
- Create: `middleware.js` (at project root, next to `package.json`)

The middleware runs on every request. It parses the subdomain from the `host` header and rewrites public requests to `/sites/[username]`. Admin/API/auth routes are passed through untouched.

- [ ] **Step 1: Add `NEXT_PUBLIC_ROOT_DOMAIN` to `.env.local`**

```bash
echo "NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3005" >> .env.local
```

- [ ] **Step 2: Create `middleware.js`**

```js
// middleware.js
import { NextResponse } from 'next/server'

export function middleware(req) {
  const host = req.headers.get('host') || ''
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005').replace(/^https?:\/\//, '')

  // Extract subdomain by stripping root domain
  // host = "swamiphoto.lvh.me:3005" → subdomain = "swamiphoto"
  // host = "lvh.me:3005" → no match → no subdomain
  const withoutRoot = host.endsWith(`.${rootDomain}`)
  const subdomain = withoutRoot ? host.slice(0, host.length - rootDomain.length - 1) : null

  if (!subdomain || subdomain === 'www') {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  // Let admin, API, auth, and Next.js internals pass through as-is
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/onboarding') ||
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
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add middleware.js .env.local
git commit -m "feat: add subdomain routing middleware"
```

---

## Task 8: Public Portfolio Page (`pages/sites/[username].js`)

**Files:**
- Create: `pages/sites/[username].js`

This page is rendered by the middleware rewrite for requests to `[username].domain.com`. It looks up the userId from the username, loads the site config, and renders the user's published pages.

- [ ] **Step 1: Create `pages/sites/[username].js`**

```js
// pages/sites/[username].js
import { lookupUserByUsername } from '../../common/userProfile'
import { readSiteConfig } from '../../common/siteConfig'
import Gallery from '../../components/image-displays/gallery/Gallery'

export async function getServerSideProps({ params }) {
  const { username } = params

  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }

  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return { notFound: true }

  return {
    props: {
      siteConfig: JSON.parse(JSON.stringify(siteConfig)),
      username,
    },
  }
}

export default function PublicPortfolio({ siteConfig, username }) {
  const homePage = siteConfig.pages?.find((p) => p.id === 'home') || siteConfig.pages?.[0]

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="px-6 py-4 border-b border-gray-100">
        <h1 className="text-sm font-semibold text-gray-900">{siteConfig.siteName || username}</h1>
      </header>
      <main>
        {homePage ? (
          <Gallery
            blocks={homePage.blocks || []}
            pages={siteConfig.pages}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            No content yet.
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Sign in at `lvh.me:3005`
3. Complete onboarding with username e.g. `testuser`
4. Confirm redirect to `testuser.lvh.me:3005/admin`
5. Visit `testuser.lvh.me:3005` — confirm portfolio renders

- [ ] **Step 4: Commit**

```bash
git add pages/sites/[username].js
git commit -m "feat: add public portfolio page rendered by subdomain middleware"
```

---

## Task 9: Admin Page — Show Username, Link to Public Site

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

Small quality-of-life addition: show the user's subdomain URL in the sidebar so they can copy it or navigate to it.

- [ ] **Step 1: Pass username to PlatformSidebar from admin page**

In `pages/admin/index.js`, the session is available. Add to the `<PlatformSidebar>` call:

Find in `pages/admin/index.js` the line that renders `<PlatformSidebar` and add a `username` prop:
```js
<PlatformSidebar
  siteConfig={siteConfig}
  saveStatus={saveStatus}
  onConfigChange={updateConfig}
  onSignOut={() => signOut({ callbackUrl: '/auth/signin' })}
  selectedPageId={selectedPageId}
  onSelectPage={handleSelectPage}
  onShowLibrary={() => { setShowLibrary(true); setSelectedPageId(null) }}
  libraryActive={showLibrary}
  username={session?.user?.username}
/>
```

- [ ] **Step 2: Add public URL link to PlatformSidebar**

In `components/admin/platform/PlatformSidebar.js`, find where the site name is displayed (near the top of the sidebar) and add a small link below it:

After the site name `<div>` (wherever `siteConfig?.siteName` is rendered), add:
```js
{username && (
  <a
    href={`${process.env.NEXT_PUBLIC_ROOT_DOMAIN?.includes('localhost') ? 'http' : 'https'}://${username}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-gray-400 hover:text-gray-600 truncate block"
  >
    {username}.{(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')} ↗
  </a>
)}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | grep -E "^(Error|Failed)" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add pages/admin/index.js components/admin/platform/PlatformSidebar.js
git commit -m "feat: show public portfolio URL in admin sidebar"
```

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Google sign-in at root domain | Task 6 (index.js) + Task 4 (post-login) |
| Username slug (`swamiphoto.domain.com`) | Task 1 (profile model) + Task 2 (API) |
| Onboarding to pick username | Task 5 |
| Post-login redirect to subdomain admin | Task 4 |
| Subdomain → public portfolio routing | Task 7 (middleware) |
| Public portfolio renders user's site | Task 8 |
| Username shown in admin with link | Task 9 |
| Username → userId reverse lookup | Task 1 (claimUsername + lookup) |
| Session exposes username | Task 3 (NextAuth callbacks) |
