# Auth + Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth via NextAuth.js, per-user GCS paths, session provider setup, and auth middleware so all subsequent platform features have a secure multi-tenant foundation.

**Architecture:** NextAuth.js handles Google OAuth; sessions carry the user's Google ID which becomes the GCS namespace prefix (`users/{userId}/`). A `withAuth` higher-order function wraps all admin API routes. The existing `gcsClient.js` is extended with user-scoped path helpers.

**Tech Stack:** next-auth ^4, Next.js 14 pages router, @google-cloud/storage (already installed), Jest + jest-environment-jsdom for unit tests

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add next-auth, jest, jest-environment-jsdom |
| `jest.config.js` | Create | Jest config using next/jest transformer |
| `jest.setup.js` | Create | jest-dom setup |
| `.env.local.example` | Create | Document required env vars |
| `pages/api/auth/[...nextauth].js` | Create | NextAuth handler (Google provider) |
| `pages/_app.js` | Create | Root app with SessionProvider |
| `common/gcsUser.js` | Create | Per-user GCS path helpers (pure functions) |
| `common/withAuth.js` | Create | API route auth middleware HOF |
| `pages/admin/index.js` | Create | Minimal auth-gated admin shell |
| `__tests__/common/gcsUser.test.js` | Create | Unit tests for path helpers |
| `__tests__/common/withAuth.test.js` | Create | Unit tests for auth middleware |

---

## Task 0: Install dependencies and configure Jest

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `jest.setup.js`

- [ ] **Step 1: Install next-auth and Jest**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npm install next-auth@4
npm install --save-dev jest jest-environment-jsdom @types/jest
```

Expected: clean install, no peer dep errors.

- [ ] **Step 2: Create jest.config.js**

```js
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathPattern: ['<rootDir>/__tests__/**/*.test.js'],
})
```

- [ ] **Step 3: Create jest.setup.js**

```js
// jest.setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to the `"scripts"` section:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest works**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
mkdir -p __tests__/common
echo "test('sanity', () => expect(1+1).toBe(2))" > __tests__/common/sanity.test.js
npx jest __tests__/common/sanity.test.js
```

Expected: `PASS __tests__/common/sanity.test.js`

- [ ] **Step 6: Clean up sanity test**

```bash
rm /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/__tests__/common/sanity.test.js
```

- [ ] **Step 7: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add package.json package-lock.json jest.config.js jest.setup.js
git commit -m "chore: add next-auth and jest test setup"
```

---

## Task 1: Per-user GCS path utilities

**Files:**
- Create: `common/gcsUser.js`
- Create: `__tests__/common/gcsUser.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/common/gcsUser.test.js
import {
  getUserPrefix,
  getUserSiteConfigPath,
  getUserLibraryConfigPath,
  getUserPhotoPath,
  getUserPhotosPrefix,
} from '../../common/gcsUser'

describe('getUserPrefix', () => {
  it('returns users/{userId}/', () => {
    expect(getUserPrefix('abc123')).toBe('users/abc123/')
  })

  it('throws if userId is empty', () => {
    expect(() => getUserPrefix('')).toThrow('userId is required')
  })

  it('throws if userId is undefined', () => {
    expect(() => getUserPrefix(undefined)).toThrow('userId is required')
  })
})

describe('getUserSiteConfigPath', () => {
  it('returns the correct GCS path', () => {
    expect(getUserSiteConfigPath('abc123')).toBe('users/abc123/site-config.json')
  })
})

describe('getUserLibraryConfigPath', () => {
  it('returns the correct GCS path', () => {
    expect(getUserLibraryConfigPath('abc123')).toBe('users/abc123/library-config.json')
  })
})

describe('getUserPhotosPrefix', () => {
  it('returns the photos folder prefix', () => {
    expect(getUserPhotosPrefix('abc123')).toBe('users/abc123/photos/')
  })
})

describe('getUserPhotoPath', () => {
  it('returns the correct GCS path for a filename', () => {
    expect(getUserPhotoPath('abc123', 'hero.jpg')).toBe('users/abc123/photos/hero.jpg')
  })

  it('throws if filename is empty', () => {
    expect(() => getUserPhotoPath('abc123', '')).toThrow('filename is required')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/gcsUser.test.js
```

Expected: FAIL — `Cannot find module '../../common/gcsUser'`

- [ ] **Step 3: Implement gcsUser.js**

```js
// common/gcsUser.js
// Pure functions for building per-user GCS paths.
// Server-side only — never import from client components.

export function getUserPrefix(userId) {
  if (!userId) throw new Error('userId is required')
  return `users/${userId}/`
}

export function getUserSiteConfigPath(userId) {
  return `${getUserPrefix(userId)}site-config.json`
}

export function getUserLibraryConfigPath(userId) {
  return `${getUserPrefix(userId)}library-config.json`
}

export function getUserPhotosPrefix(userId) {
  return `${getUserPrefix(userId)}photos/`
}

export function getUserPhotoPath(userId, filename) {
  if (!filename) throw new Error('filename is required')
  return `${getUserPhotosPrefix(userId)}${filename}`
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/gcsUser.test.js
```

Expected: `PASS __tests__/common/gcsUser.test.js` — 9 tests passing

- [ ] **Step 5: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add common/gcsUser.js __tests__/common/gcsUser.test.js
git commit -m "feat: add per-user GCS path helpers"
```

---

## Task 2: API auth middleware

**Files:**
- Create: `common/withAuth.js`
- Create: `__tests__/common/withAuth.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/common/withAuth.test.js
import { withAuth } from '../../common/withAuth'

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))
import { getServerSession } from 'next-auth/next'

function makeReqRes() {
  const req = { method: 'GET', headers: {} }
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  }
  return { req, res }
}

describe('withAuth', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls handler with session user when authenticated', async () => {
    const session = { user: { id: 'user-123', email: 'test@example.com', name: 'Test User' } }
    getServerSession.mockResolvedValue(session)

    const handler = jest.fn()
    const { req, res } = makeReqRes()

    await withAuth(handler)(req, res)

    expect(handler).toHaveBeenCalledWith(req, res, session.user)
  })

  it('returns 401 when not authenticated', async () => {
    getServerSession.mockResolvedValue(null)

    const handler = jest.fn()
    const { req, res } = makeReqRes()

    await withAuth(handler)(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 500 if getServerSession throws', async () => {
    getServerSession.mockRejectedValue(new Error('auth service down'))

    const handler = jest.fn()
    const { req, res } = makeReqRes()

    await withAuth(handler)(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    expect(handler).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/withAuth.test.js
```

Expected: FAIL — `Cannot find module '../../common/withAuth'`

- [ ] **Step 3: Implement withAuth.js**

```js
// common/withAuth.js
// Higher-order function wrapping Next.js API routes with auth checks.
// Server-side only.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'

/**
 * Wraps an API handler, injecting the authenticated user or returning 401.
 *
 * Usage:
 *   export default withAuth(async (req, res, user) => {
 *     // user = { id, email, name }
 *   })
 */
export function withAuth(handler) {
  return async function (req, res) {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      return handler(req, res, session.user)
    } catch (err) {
      console.error('[withAuth] error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/withAuth.test.js
```

Expected: `PASS __tests__/common/withAuth.test.js` — 3 tests passing

- [ ] **Step 5: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add common/withAuth.js __tests__/common/withAuth.test.js
git commit -m "feat: add withAuth API middleware"
```

---

## Task 3: NextAuth configuration

**Files:**
- Create: `pages/api/auth/[...nextauth].js`
- Create: `.env.local.example`

This task has no unit tests — NextAuth config is integration-tested manually in Task 5.

- [ ] **Step 1: Create .env.local.example**

```bash
cat > /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/.env.local.example << 'EOF'
# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Google Cloud Storage (already in use)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
EOF
```

- [ ] **Step 2: Create .env.local from the example (fill in real values)**

You need a Google OAuth app. If you don't have one:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy client ID and secret

Then generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

Create `.env.local` with real values (never commit this file).

- [ ] **Step 3: Verify .env.local is gitignored**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
cat .gitignore | grep env || echo ".env.local" >> .gitignore
```

Expected: `.env.local` appears in .gitignore output, or was just added.

- [ ] **Step 4: Create the NextAuth handler**

```js
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Expose the Google sub (stable user ID) on the session and token
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.userId = profile.sub
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export default NextAuth(authOptions)
```

- [ ] **Step 5: Create sign-in page**

```js
// pages/auth/signin.js
import { signIn } from 'next-auth/react'

export default function SignIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 32 }}>PhotoHub</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: '/admin' })}
        style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#000', color: '#fff', border: 'none', borderRadius: 6 }}
      >
        Sign in with Google
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add pages/api/auth/\[...nextauth\].js pages/auth/signin.js .env.local.example .gitignore
git commit -m "feat: add NextAuth Google OAuth configuration"
```

---

## Task 4: _app.js with SessionProvider

**Files:**
- Create: `pages/_app.js`

- [ ] **Step 1: Create _app.js**

```js
// pages/_app.js
import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  )
}
```

> Note: Check that `styles/globals.css` exists. If the file is named differently, adjust the import path.

- [ ] **Step 2: Verify globals.css path**

```bash
ls /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/styles/
```

Adjust the import in `_app.js` to match the actual CSS filename if needed.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add pages/_app.js
git commit -m "feat: add _app.js with NextAuth SessionProvider"
```

---

## Task 5: Auth-gated admin index page

**Files:**
- Create: `pages/admin/index.js`

This is a minimal shell — just enough to verify the full auth flow works end-to-end. The real admin UI (sidebar, page builder) comes in later steps.

- [ ] **Step 1: Create the admin index page**

```js
// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    )
  }

  if (!session) return null

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>PhotoHub Admin</h1>
      <p>Signed in as <strong>{session.user.email}</strong></p>
      <p style={{ color: '#666', fontSize: 14 }}>User ID: {session.user.id}</p>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        style={{ marginTop: 24, padding: '8px 16px', cursor: 'pointer' }}
      >
        Sign out
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add pages/admin/index.js
git commit -m "feat: add auth-gated admin index page"
```

---

## Task 6: Manual end-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npm run dev
```

Expected: server starts on http://localhost:3000 with no errors.

- [ ] **Step 2: Verify unauthenticated redirect**

Visit http://localhost:3000/admin

Expected: redirected to `/auth/signin` (the sign-in page with "Sign in with Google" button).

- [ ] **Step 3: Sign in with Google**

Click "Sign in with Google". Complete Google OAuth flow.

Expected: redirected back to `/admin`. Page shows "Signed in as [your email]" and a non-empty User ID (the Google `sub` field).

- [ ] **Step 4: Verify sign-out**

Click "Sign out".

Expected: redirected to `/auth/signin`. Revisiting `/admin` redirects back to sign-in.

- [ ] **Step 5: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: All tests pass (gcsUser + withAuth suites).

---

## Task 7: Protect existing admin API routes

The existing routes in `pages/api/admin/` (library.js, galleries.js, upload.js, delete.js) should be wrapped with `withAuth` to lock them down. This ensures multi-tenancy is enforced from the start.

**Files:**
- Modify: `pages/api/admin/library.js`
- Modify: `pages/api/admin/galleries.js`
- Modify: `pages/api/admin/upload.js`
- Modify: `pages/api/admin/delete.js`

- [ ] **Step 1: Read each existing route to understand current export shape**

```bash
cat /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/library.js
cat /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/galleries.js
cat /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/upload.js
cat /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/delete.js
```

- [ ] **Step 2: Wrap each route's default export with withAuth**

For each file, change the pattern from:
```js
export default async function handler(req, res) {
  // ...existing logic
}
```

To:
```js
import { withAuth } from '../../../common/withAuth'

async function handler(req, res, user) {
  // user = { id, email, name } from session
  // ...existing logic unchanged (user param available for future per-user scoping)
}

export default withAuth(handler)
```

The `user` param is passed through but the existing logic doesn't need to change yet — per-user GCS paths are wired in the next step (Step 2 of the build order: page-level sidebar and site config).

- [ ] **Step 3: Manually verify admin routes still work**

With dev server running and signed in, open the browser console and test:
```js
fetch('/api/admin/library').then(r => r.json()).then(console.log)
```
Expected: returns library data (not 401).

Sign out, then retry:
```js
fetch('/api/admin/library').then(r => r.json()).then(console.log)
```
Expected: `{ error: 'Unauthorized' }` with 401 status.

- [ ] **Step 4: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add pages/api/admin/library.js pages/api/admin/galleries.js pages/api/admin/upload.js pages/api/admin/delete.js
git commit -m "feat: protect all admin API routes with withAuth middleware"
```

---

## Self-Review

**Spec coverage:**
- ✅ Google OAuth via NextAuth.js — Task 3
- ✅ Per-user GCS paths `users/{userId}/` — Task 1 (gcsUser.js)
- ✅ `_app.js` SessionProvider setup — Task 4
- ✅ Auth middleware for API routes — Task 2 (withAuth.js) + Task 7
- ✅ Dynamic routing prep — `session.user.id` (Google sub) is the stable userId used in all GCS paths
- ✅ Google `sub` exposed on session — Task 3, jwt callback

**Out of scope (next steps):**
- Per-user GCS reads in admin routes (Step 2: page-level sidebar)
- `/u/[username]` published site routing (Step 7)
- Username slug assignment during onboarding (Step 4)
