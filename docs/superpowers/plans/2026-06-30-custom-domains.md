# Custom Domains Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a photographer connect a domain they already own (auto-verified, auto-SSL via Vercel) and search availability/price for a new domain (deep-linking out to a registrar to buy).

**Architecture:** A new `common/vercel.js` wraps the Vercel REST API. Pure helpers in `common/domainUtils.js` handle DNS records, status derivation, and the legacy-string→object migration. Four API routes under `pages/api/admin/domain/` drive connect/status/remove/search and keep `customDomain` as the server-owned source of truth (read-modify-write of `site-config.json`). A public pointer file `domains/{hostname}.json` in R2 maps a custom hostname back to a username; `middleware.js` reads it over R2's public URL (edge-safe `fetch`) to rewrite custom-domain requests to `/sites/{username}`. The settings UI gains a `DomainPanel` with a connect section (records + live status poll) and a search section (results + registrar deep-link).

**Tech Stack:** Next.js (pages router), React, Jest + @testing-library/react, AWS SDK S3 client (R2), Vercel REST API.

## Global Constraints

- Host is **Vercel**; images stay on R2 (zero egress) — never proxy images through the app.
- Buy flow is **search-only (option B)**: search availability/price via Vercel, deep-link out to a registrar. No in-app purchase yet. Keep the Vercel client shaped so a `buyDomain` call drops in later.
- `customDomain` migrates from a bare string to an object `{ name, status, verification, addedAt, verifiedAt, lastError }`. Status enum: `'pending' | 'active' | 'error'` (the spec's "verifying" collapses into `'pending'`/"Pending DNS" because Vercel exposes no reliable mid-state signal).
- Display DNS records are derived (apex → `A 76.76.21.21`; subdomain → `CNAME cname.vercel-dns.com`); ownership TXT records (when present) come verbatim from Vercel's `addDomain` response.
- All `pages/api/admin/domain/*` routes are wrapped in the existing `withAuth(handler)` and export the inner `handler` as a named export for testing.
- Server-side-only modules (`common/vercel.js`, `common/gcsClient.js`) must never be imported from client components.
- Env vars to add: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`, `REGISTRAR_SEARCH_URL`, and `NEXT_PUBLIC_R2_PUBLIC_URL` (edge mirror of `R2_PUBLIC_URL` for middleware).

---

### Task 1: Pure domain helpers + wire site URL into public pages

**Files:**
- Create: `common/domainUtils.js`
- Test: `__tests__/common/domainUtils.test.js`
- Modify: `pages/sites/[username]/index.js` (siteUrl construction, ~line 60-62)
- Modify: `pages/sites/[username]/[slug].js` (siteUrl construction, ~line 60-62)

**Interfaces:**
- Produces:
  - `isApex(name: string): boolean`
  - `dnsRecordsFor(name: string): Array<{type, name, value}>`
  - `deriveStatus({verified: boolean, misconfigured: boolean}): 'active'|'pending'`
  - `normalizeCustomDomain(value: string|object|null): {name, status, verification, addedAt, verifiedAt, lastError}|null`
  - `siteUrlFor(siteConfig: object, username: string, rootDomain: string): string`
  - `parseHost(host: string, rootDomain: string): {kind: 'root'|'subdomain'|'custom', subdomain: string|null}`

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/domainUtils.test.js
import {
  isApex, dnsRecordsFor, deriveStatus, normalizeCustomDomain, siteUrlFor, parseHost,
} from '../../common/domainUtils'

describe('isApex', () => {
  it('treats a two-label name as apex', () => expect(isApex('janedoe.com')).toBe(true))
  it('treats a three-label name as a subdomain', () => expect(isApex('photos.janedoe.com')).toBe(false))
  it('returns false for empty', () => expect(isApex('')).toBe(false))
})

describe('dnsRecordsFor', () => {
  it('returns an A record for an apex domain', () => {
    expect(dnsRecordsFor('janedoe.com')).toEqual([{ type: 'A', name: '@', value: '76.76.21.21' }])
  })
  it('returns a CNAME for a subdomain using the leftmost label', () => {
    expect(dnsRecordsFor('photos.janedoe.com')).toEqual([{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }])
  })
})

describe('deriveStatus', () => {
  it('is active only when verified and not misconfigured', () => {
    expect(deriveStatus({ verified: true, misconfigured: false })).toBe('active')
  })
  it('is pending when misconfigured', () => {
    expect(deriveStatus({ verified: true, misconfigured: true })).toBe('pending')
  })
  it('is pending when not verified', () => {
    expect(deriveStatus({ verified: false, misconfigured: false })).toBe('pending')
  })
})

describe('normalizeCustomDomain', () => {
  it('returns null for null', () => expect(normalizeCustomDomain(null)).toBeNull())
  it('upgrades a legacy string to the object form', () => {
    expect(normalizeCustomDomain('photos.janedoe.com')).toEqual({
      name: 'photos.janedoe.com', status: 'pending',
      verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
      addedAt: null, verifiedAt: null, lastError: null,
    })
  })
  it('passes through an object, filling defaults', () => {
    expect(normalizeCustomDomain({ name: 'a.com', status: 'active' })).toMatchObject({ name: 'a.com', status: 'active' })
  })
})

describe('siteUrlFor', () => {
  it('uses the custom domain only when active', () => {
    expect(siteUrlFor({ customDomain: { name: 'a.com', status: 'active' } }, 'jane', 'sepia.photo:3000')).toBe('https://a.com')
  })
  it('falls back to the subdomain when the custom domain is pending', () => {
    expect(siteUrlFor({ customDomain: { name: 'a.com', status: 'pending' } }, 'jane', 'sepia.photo')).toBe('https://jane.sepia.photo')
  })
  it('falls back to the subdomain when there is no custom domain', () => {
    expect(siteUrlFor({}, 'jane', 'sepia.photo')).toBe('https://jane.sepia.photo')
  })
})

describe('parseHost', () => {
  it('detects a subdomain of the root', () => {
    expect(parseHost('jane.sepia.photo', 'sepia.photo')).toEqual({ kind: 'subdomain', subdomain: 'jane' })
  })
  it('treats the bare root as root', () => {
    expect(parseHost('sepia.photo', 'sepia.photo')).toEqual({ kind: 'root', subdomain: null })
  })
  it('treats www of the root as root', () => {
    expect(parseHost('www.sepia.photo', 'sepia.photo')).toEqual({ kind: 'root', subdomain: null })
  })
  it('treats an unrelated host as custom', () => {
    expect(parseHost('photos.janedoe.com', 'sepia.photo')).toEqual({ kind: 'custom', subdomain: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/domainUtils.test.js`
Expected: FAIL — `Cannot find module '../../common/domainUtils'`

- [ ] **Step 3: Write the implementation**

```js
// common/domainUtils.js
// Pure helpers for custom domains. Safe to import from server or client.

const APEX_IP = '76.76.21.21'
const CNAME_TARGET = 'cname.vercel-dns.com'

export function isApex(name) {
  if (!name) return false
  return name.split('.').filter(Boolean).length <= 2
}

export function dnsRecordsFor(name) {
  if (!name) return []
  if (isApex(name)) return [{ type: 'A', name: '@', value: APEX_IP }]
  return [{ type: 'CNAME', name: name.split('.')[0], value: CNAME_TARGET }]
}

export function deriveStatus({ verified, misconfigured } = {}) {
  return verified && !misconfigured ? 'active' : 'pending'
}

export function normalizeCustomDomain(value) {
  if (!value) return null
  if (typeof value === 'string') {
    return {
      name: value, status: 'pending', verification: dnsRecordsFor(value),
      addedAt: null, verifiedAt: null, lastError: null,
    }
  }
  return {
    name: value.name,
    status: value.status || 'pending',
    verification: value.verification || dnsRecordsFor(value.name),
    addedAt: value.addedAt || null,
    verifiedAt: value.verifiedAt || null,
    lastError: value.lastError || null,
  }
}

export function siteUrlFor(siteConfig, username, rootDomain) {
  const cd = normalizeCustomDomain(siteConfig?.customDomain)
  if (cd && cd.status === 'active') return `https://${cd.name}`
  const root = (rootDomain || 'localhost:3000').replace(/:\d+$/, '')
  return `https://${username}.${root}`
}

export function parseHost(host, rootDomain) {
  const h = (host || '').replace(/^https?:\/\//, '')
  const root = (rootDomain || '').replace(/^https?:\/\//, '')
  if (!root || h === root || h === `www.${root}`) return { kind: 'root', subdomain: null }
  if (h.endsWith(`.${root}`)) {
    const sub = h.slice(0, h.length - root.length - 1)
    if (sub === 'www') return { kind: 'root', subdomain: null }
    return { kind: 'subdomain', subdomain: sub }
  }
  return { kind: 'custom', subdomain: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/domainUtils.test.js`
Expected: PASS (all cases)

- [ ] **Step 5: Wire `siteUrlFor` into the two public pages**

In `pages/sites/[username]/index.js`, add the import near the other `common/` imports:
```js
import { siteUrlFor } from '../../../common/domainUtils'
```
Replace the existing block:
```js
  const rootDomainPublic = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const siteUrl = siteConfig.customDomain
    ? `https://${siteConfig.customDomain}`
    : `https://${username}.${rootDomainPublic.replace(/:\d+$/, '')}`
```
with:
```js
  const siteUrl = siteUrlFor(siteConfig, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
```
Apply the identical import + replacement in `pages/sites/[username]/[slug].js`.

- [ ] **Step 6: Run the full suite to confirm nothing regressed**

Run: `npx jest __tests__/common/domainUtils.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add common/domainUtils.js __tests__/common/domainUtils.test.js "pages/sites/[username]/index.js" "pages/sites/[username]/[slug].js"
git commit -m "feat(domains): pure domain helpers + normalized siteUrl in public pages"
```

---

### Task 2: Domain pointer path helper

**Files:**
- Modify: `common/gcsUser.js` (add export after `getUsernameLookupPath`, ~line 38)
- Test: `__tests__/common/gcsUser.test.js` (append a describe block)

**Interfaces:**
- Produces: `getDomainLookupPath(hostname: string): string` → `domains/{hostname}.json`

- [ ] **Step 1: Write the failing test** — append to `__tests__/common/gcsUser.test.js`

```js
import { getDomainLookupPath } from '../../common/gcsUser'

describe('getDomainLookupPath', () => {
  it('returns domains/{hostname}.json', () => {
    expect(getDomainLookupPath('photos.janedoe.com')).toBe('domains/photos.janedoe.com.json')
  })
  it('throws when hostname is missing', () => {
    expect(() => getDomainLookupPath('')).toThrow('hostname is required')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/gcsUser.test.js -t getDomainLookupPath`
Expected: FAIL — `getDomainLookupPath is not a function`

- [ ] **Step 3: Add the helper** to `common/gcsUser.js`

```js
export function getDomainLookupPath(hostname) {
  if (!hostname) throw new Error('hostname is required')
  return `domains/${hostname}.json`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/gcsUser.test.js -t getDomainLookupPath`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add common/gcsUser.js __tests__/common/gcsUser.test.js
git commit -m "feat(domains): add getDomainLookupPath pointer key helper"
```

---

### Task 3: Vercel API client

**Files:**
- Create: `common/vercel.js`
- Test: `__tests__/common/vercel.test.js`
- Modify: `.env.local.example` (document new env vars)

**Interfaces:**
- Produces:
  - `addDomain(name): Promise<{name, verified, verification}>`
  - `getDomain(name): Promise<{name, verified, verification}>`
  - `getDomainConfig(name): Promise<{misconfigured, ...}>`
  - `removeDomain(name): Promise<object>`
  - `checkAvailability(name): Promise<boolean>`
  - `getPrice(name): Promise<{price, period}>`
  - Thrown errors carry `.status` (HTTP code) and `.code` (Vercel error code).

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { addDomain, checkAvailability, getPrice, removeDomain } from '../../common/vercel'

const OLD_ENV = process.env
beforeEach(() => {
  process.env = { ...OLD_ENV, VERCEL_API_TOKEN: 'tok', VERCEL_PROJECT_ID: 'proj', VERCEL_TEAM_ID: 'team' }
  global.fetch = jest.fn()
})
afterEach(() => { process.env = OLD_ENV; jest.resetAllMocks() })

function ok(body) { return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }) }

describe('addDomain', () => {
  it('POSTs to the project domains endpoint with the team query and bearer token', async () => {
    global.fetch.mockReturnValue(ok({ name: 'a.com', verified: true, verification: [] }))
    const r = await addDomain('a.com')
    expect(r).toEqual({ name: 'a.com', verified: true, verification: [] })
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.vercel.com/v10/projects/proj/domains?teamId=team')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(opts.body)).toEqual({ name: 'a.com' })
  })

  it('throws an error carrying status and code on failure', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: false, status: 409, json: () => Promise.resolve({ error: { code: 'domain_already_in_use', message: 'taken' } }),
    }))
    await expect(addDomain('a.com')).rejects.toMatchObject({ status: 409, code: 'domain_already_in_use', message: 'taken' })
  })
})

describe('checkAvailability', () => {
  it('returns the boolean available flag', async () => {
    global.fetch.mockReturnValue(ok({ available: true }))
    await expect(checkAvailability('a.com')).resolves.toBe(true)
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.vercel.com/v4/domains/status?name=a.com&teamId=team')
  })
})

describe('getPrice', () => {
  it('returns price and period', async () => {
    global.fetch.mockReturnValue(ok({ price: 20, period: 1 }))
    await expect(getPrice('a.com')).resolves.toEqual({ price: 20, period: 1 })
  })
})

describe('removeDomain', () => {
  it('DELETEs the project domain', async () => {
    global.fetch.mockReturnValue(ok({}))
    await removeDomain('a.com')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.vercel.com/v9/projects/proj/domains/a.com?teamId=team')
    expect(opts.method).toBe('DELETE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/vercel.test.js`
Expected: FAIL — `Cannot find module '../../common/vercel'`

- [ ] **Step 3: Write the implementation**

```js
// common/vercel.js
// Server-side only — thin wrapper over the Vercel REST API. Never import from client code.

const API = 'https://api.vercel.com'

function cfg() {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID || ''
  if (!token || !projectId) throw new Error('Vercel API not configured (set VERCEL_API_TOKEN and VERCEL_PROJECT_ID)')
  return { token, projectId, teamId }
}

function withTeam(url, teamId) {
  if (!teamId) return url
  return url + (url.includes('?') ? '&' : '?') + `teamId=${teamId}`
}

async function vfetch(path, { method = 'GET', body } = {}) {
  const { token, teamId } = cfg()
  const res = await fetch(withTeam(`${API}${path}`, teamId), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Vercel API error (${res.status})`)
    err.status = res.status
    err.code = json?.error?.code
    throw err
  }
  return json
}

export async function addDomain(name) {
  const { projectId } = cfg()
  return vfetch(`/v10/projects/${projectId}/domains`, { method: 'POST', body: { name } })
}

export async function getDomain(name) {
  const { projectId } = cfg()
  return vfetch(`/v9/projects/${projectId}/domains/${name}`)
}

export async function getDomainConfig(name) {
  return vfetch(`/v6/domains/${name}/config`)
}

export async function removeDomain(name) {
  const { projectId } = cfg()
  return vfetch(`/v9/projects/${projectId}/domains/${name}`, { method: 'DELETE' })
}

export async function checkAvailability(name) {
  const r = await vfetch(`/v4/domains/status?name=${encodeURIComponent(name)}`)
  return !!r.available
}

export async function getPrice(name) {
  const r = await vfetch(`/v4/domains/price?name=${encodeURIComponent(name)}`)
  return { price: r.price, period: r.period }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/vercel.test.js`
Expected: PASS

- [ ] **Step 5: Document env vars** — append to `.env.local.example`

```bash
# Vercel API — custom domains (connect + availability search)
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
# Registrar deep-link base for "find a new domain" results (domain is appended, URL-encoded)
REGISTRAR_SEARCH_URL=https://www.namecheap.com/domains/registration/results/?domain=
# Edge-readable mirror of R2_PUBLIC_URL (middleware reads the domain pointer over this)
NEXT_PUBLIC_R2_PUBLIC_URL=
```

- [ ] **Step 6: Commit**

```bash
git add common/vercel.js __tests__/common/vercel.test.js .env.local.example
git commit -m "feat(domains): Vercel API client + env documentation"
```

---

### Task 4: Connect route

**Files:**
- Create: `pages/api/admin/domain/connect.js`
- Test: `__tests__/api/domain-connect.test.js`

**Interfaces:**
- Consumes: `addDomain`, `getDomainConfig` (Task 3); `readSiteConfig`, `writeSiteConfig`; `uploadJSON`; `getDomainLookupPath` (Task 2); `dnsRecordsFor`, `deriveStatus` (Task 1).
- Produces: `POST /api/admin/domain/connect` body `{ name }` → `200 { customDomain }` | `400` invalid/no-slug | `409` already-in-use | `500`. Named export `handler(req, res, user)`.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/connect'

jest.mock('../../common/vercel', () => ({
  addDomain: jest.fn(),
  getDomainConfig: jest.fn(),
}))
jest.mock('../../common/siteConfig', () => ({
  readSiteConfig: jest.fn(),
  writeSiteConfig: jest.fn(),
}))
jest.mock('../../common/gcsClient', () => ({ uploadJSON: jest.fn() }))

import { addDomain, getDomainConfig } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'
import { uploadJSON } from '../../common/gcsClient'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1', email: 'a@b.c' }

beforeEach(() => {
  jest.clearAllMocks()
  readSiteConfig.mockResolvedValue({ userId: 'u1', slug: 'jane', pages: [] })
})

it('rejects an invalid domain with 400', async () => {
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'not a domain' } }, res, USER)
  expect(res.statusCode).toBe(400)
})

it('connects a subdomain: stores pending config + writes the pointer', async () => {
  addDomain.mockResolvedValue({ name: 'photos.janedoe.com', verified: true, verification: [] })
  getDomainConfig.mockResolvedValue({ misconfigured: true })
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'photos.janedoe.com' } }, res, USER)

  expect(res.statusCode).toBe(200)
  expect(res.body.customDomain).toMatchObject({
    name: 'photos.janedoe.com', status: 'pending',
    verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
  })
  expect(writeSiteConfig).toHaveBeenCalledWith('u1', expect.objectContaining({
    customDomain: expect.objectContaining({ name: 'photos.janedoe.com', status: 'pending' }),
  }))
  expect(uploadJSON).toHaveBeenCalledWith('domains/photos.janedoe.com.json', { username: 'jane', userId: 'u1' })
})

it('marks active when verified and not misconfigured', async () => {
  addDomain.mockResolvedValue({ name: 'janedoe.com', verified: true, verification: [] })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'janedoe.com' } }, res, USER)
  expect(res.body.customDomain.status).toBe('active')
  expect(res.body.customDomain.verifiedAt).toBeTruthy()
})

it('maps an already-in-use conflict to 409', async () => {
  const err = new Error('taken'); err.status = 409; err.code = 'domain_already_in_use'
  addDomain.mockRejectedValue(err)
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'taken.com' } }, res, USER)
  expect(res.statusCode).toBe(409)
})

it('400s when the user has no slug yet', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', slug: '', pages: [] })
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'janedoe.com' } }, res, USER)
  expect(res.statusCode).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/domain-connect.test.js`
Expected: FAIL — `Cannot find module '.../connect'`

- [ ] **Step 3: Write the implementation**

```js
// pages/api/admin/domain/connect.js
import { withAuth } from '../../../../common/withAuth'
import { addDomain, getDomainConfig } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { uploadJSON } from '../../../../common/gcsClient'
import { getDomainLookupPath } from '../../../../common/gcsUser'
import { dnsRecordsFor, deriveStatus } from '../../../../common/domainUtils'

const HOST_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/

export async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const name = String(req.body?.name || '')
    .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!HOST_RE.test(name)) {
    return res.status(400).json({ error: 'Enter a valid domain like photos.yourname.com' })
  }

  const config = await readSiteConfig(user.id)
  if (!config) return res.status(400).json({ error: 'Site not set up yet' })
  if (!config.slug) return res.status(400).json({ error: 'Set your site URL before adding a custom domain' })

  try {
    const added = await addDomain(name)
    const { misconfigured } = await getDomainConfig(name)
    const status = deriveStatus({ verified: added.verified, misconfigured })
    const verification = [
      ...dnsRecordsFor(name),
      ...((added.verification || []).map((v) => ({ type: v.type, name: v.domain, value: v.value }))),
    ]
    const now = new Date().toISOString()
    const customDomain = {
      name, status, verification, addedAt: now,
      verifiedAt: status === 'active' ? now : null, lastError: null,
    }
    config.customDomain = customDomain
    await writeSiteConfig(user.id, config)
    await uploadJSON(getDomainLookupPath(name), { username: config.slug, userId: user.id })
    return res.status(200).json({ customDomain })
  } catch (err) {
    if (err.status === 409 || err.code === 'domain_already_in_use') {
      return res.status(409).json({ error: 'That domain is already connected to another site.' })
    }
    console.error('POST /api/admin/domain/connect error:', err)
    return res.status(500).json({ error: err.message || 'Could not connect domain' })
  }
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/domain-connect.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/domain/connect.js __tests__/api/domain-connect.test.js
git commit -m "feat(domains): connect route adds domain to Vercel + writes pointer"
```

---

### Task 5: Status route

**Files:**
- Create: `pages/api/admin/domain/status.js`
- Test: `__tests__/api/domain-status.test.js`

**Interfaces:**
- Consumes: `getDomain`, `getDomainConfig` (Task 3); `readSiteConfig`, `writeSiteConfig`; `normalizeCustomDomain`, `deriveStatus` (Task 1).
- Produces: `GET /api/admin/domain/status` → `200 { customDomain }` (null when none). On a transient Vercel error returns last-known status (still 200). Named export `handler`.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/status'

jest.mock('../../common/vercel', () => ({ getDomain: jest.fn(), getDomainConfig: jest.fn() }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), writeSiteConfig: jest.fn() }))
import { getDomain, getDomainConfig } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1' }
beforeEach(() => jest.clearAllMocks())

it('returns null when no custom domain is set', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: null, pages: [] })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.body).toEqual({ customDomain: null })
})

it('flips a pending domain to active and stamps verifiedAt', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'pending', verifiedAt: null }, pages: [] })
  getDomain.mockResolvedValue({ verified: true })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.body.customDomain.status).toBe('active')
  expect(res.body.customDomain.verifiedAt).toBeTruthy()
  expect(writeSiteConfig).toHaveBeenCalled()
})

it('returns last-known status when Vercel errors', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'pending' }, pages: [] })
  getDomain.mockRejectedValue(new Error('vercel down'))
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.statusCode).toBe(200)
  expect(res.body.customDomain.status).toBe('pending')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/domain-status.test.js`
Expected: FAIL — `Cannot find module '.../status'`

- [ ] **Step 3: Write the implementation**

```js
// pages/api/admin/domain/status.js
import { withAuth } from '../../../../common/withAuth'
import { getDomain, getDomainConfig } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { normalizeCustomDomain, deriveStatus } from '../../../../common/domainUtils'

export async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const config = await readSiteConfig(user.id)
  const cd = normalizeCustomDomain(config?.customDomain)
  if (!cd) return res.status(200).json({ customDomain: null })

  try {
    const [domain, conf] = await Promise.all([getDomain(cd.name), getDomainConfig(cd.name)])
    const status = deriveStatus({ verified: domain.verified, misconfigured: conf.misconfigured })
    cd.status = status
    if (status === 'active' && !cd.verifiedAt) cd.verifiedAt = new Date().toISOString()
    cd.lastError = null
    config.customDomain = cd
    await writeSiteConfig(user.id, config)
    return res.status(200).json({ customDomain: cd })
  } catch (err) {
    console.error('GET /api/admin/domain/status error:', err)
    return res.status(200).json({ customDomain: cd })
  }
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/domain-status.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/domain/status.js __tests__/api/domain-status.test.js
git commit -m "feat(domains): status route polls Vercel verification + SSL"
```

---

### Task 6: Remove route

**Files:**
- Create: `pages/api/admin/domain/index.js`
- Test: `__tests__/api/domain-remove.test.js`

**Interfaces:**
- Consumes: `removeDomain` (Task 3); `readSiteConfig`, `writeSiteConfig`; `deleteFile`; `getDomainLookupPath` (Task 2); `normalizeCustomDomain` (Task 1).
- Produces: `DELETE /api/admin/domain` → `200 { ok: true }`. Tolerates Vercel/pointer failures. Named export `handler`.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/index'

jest.mock('../../common/vercel', () => ({ removeDomain: jest.fn() }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), writeSiteConfig: jest.fn() }))
jest.mock('../../common/gcsClient', () => ({ deleteFile: jest.fn() }))
import { removeDomain } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'
import { deleteFile } from '../../common/gcsClient'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1' }
beforeEach(() => jest.clearAllMocks())

it('removes from Vercel, deletes the pointer, and clears config', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'active' }, pages: [] })
  const res = mockRes()
  await handler({ method: 'DELETE' }, res, USER)
  expect(removeDomain).toHaveBeenCalledWith('a.com')
  expect(deleteFile).toHaveBeenCalledWith('domains/a.com.json')
  expect(writeSiteConfig).toHaveBeenCalledWith('u1', expect.objectContaining({ customDomain: null }))
  expect(res.body).toEqual({ ok: true })
})

it('is a no-op success when no domain is set', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: null, pages: [] })
  const res = mockRes()
  await handler({ method: 'DELETE' }, res, USER)
  expect(removeDomain).not.toHaveBeenCalled()
  expect(res.body).toEqual({ ok: true })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/domain-remove.test.js`
Expected: FAIL — `Cannot find module '.../domain/index'`

- [ ] **Step 3: Write the implementation**

```js
// pages/api/admin/domain/index.js
import { withAuth } from '../../../../common/withAuth'
import { removeDomain } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { deleteFile } from '../../../../common/gcsClient'
import { getDomainLookupPath } from '../../../../common/gcsUser'
import { normalizeCustomDomain } from '../../../../common/domainUtils'

export async function handler(req, res, user) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const config = await readSiteConfig(user.id)
  const cd = normalizeCustomDomain(config?.customDomain)
  if (!cd) return res.status(200).json({ ok: true })

  try { await removeDomain(cd.name) } catch (err) { console.error('vercel removeDomain error:', err) }
  try { await deleteFile(getDomainLookupPath(cd.name)) } catch (err) { console.error('pointer deleteFile error:', err) }

  config.customDomain = null
  await writeSiteConfig(user.id, config)
  return res.status(200).json({ ok: true })
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/domain-remove.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/domain/index.js __tests__/api/domain-remove.test.js
git commit -m "feat(domains): remove route detaches domain + cleans up pointer"
```

---

### Task 7: Search route

**Files:**
- Create: `pages/api/admin/domain/search.js`
- Test: `__tests__/api/domain-search.test.js`

**Interfaces:**
- Consumes: `checkAvailability`, `getPrice` (Task 3).
- Produces: `GET /api/admin/domain/search?q=` → `200 { results: [{ domain, available, price, registrarUrl }] }`. Named export `handler`.

- [ ] **Step 1: Write the failing test**

```js
/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/search'

jest.mock('../../common/vercel', () => ({ checkAvailability: jest.fn(), getPrice: jest.fn() }))
import { checkAvailability, getPrice } from '../../common/vercel'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
beforeEach(() => {
  jest.clearAllMocks()
  process.env.REGISTRAR_SEARCH_URL = 'https://reg.example/?domain='
})

it('expands a bare query across TLDs and prices only available ones', async () => {
  checkAvailability.mockImplementation((d) => Promise.resolve(d === 'janedoe.photo'))
  getPrice.mockResolvedValue({ price: 25, period: 1 })
  const res = mockRes()
  await handler({ query: { q: 'janedoe' } }, res)

  const byDomain = Object.fromEntries(res.body.results.map((r) => [r.domain, r]))
  expect(byDomain['janedoe.com']).toMatchObject({ available: false, price: null })
  expect(byDomain['janedoe.photo']).toMatchObject({ available: true, price: 25 })
  expect(byDomain['janedoe.photo'].registrarUrl).toBe('https://reg.example/?domain=janedoe.photo')
})

it('includes an explicit TLD from the query', async () => {
  checkAvailability.mockResolvedValue(false)
  const res = mockRes()
  await handler({ query: { q: 'janedoe.studio' } }, res)
  expect(res.body.results.some((r) => r.domain === 'janedoe.studio')).toBe(true)
})

it('returns an empty result set for a blank query', async () => {
  const res = mockRes()
  await handler({ query: { q: '' } }, res)
  expect(res.body.results).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/domain-search.test.js`
Expected: FAIL — `Cannot find module '.../search'`

- [ ] **Step 3: Write the implementation**

```js
// pages/api/admin/domain/search.js
import { withAuth } from '../../../../common/withAuth'
import { checkAvailability, getPrice } from '../../../../common/vercel'

const TLDS = ['com', 'photo', 'studio', 'gallery']
const REGISTRAR = () => process.env.REGISTRAR_SEARCH_URL
  || 'https://www.namecheap.com/domains/registration/results/?domain='

function candidates(q) {
  const clean = String(q || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '')
  if (!clean) return []
  const set = new Set()
  if (clean.includes('.')) set.add(clean)
  const base = clean.replace(/\..*$/, '')
  if (base) for (const tld of TLDS) set.add(`${base}.${tld}`)
  return [...set].slice(0, 6)
}

export async function handler(req, res) {
  const names = candidates(req.query.q)
  const results = await Promise.all(names.map(async (domain) => {
    const registrarUrl = `${REGISTRAR()}${encodeURIComponent(domain)}`
    try {
      const available = await checkAvailability(domain)
      const price = available ? (await getPrice(domain)).price : null
      return { domain, available, price, registrarUrl }
    } catch {
      return { domain, available: false, price: null, registrarUrl }
    }
  }))
  return res.status(200).json({ results })
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/domain-search.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/domain/search.js __tests__/api/domain-search.test.js
git commit -m "feat(domains): search route returns availability + price + registrar link"
```

---

### Task 8: Middleware custom-domain routing

**Files:**
- Modify: `middleware.js` (full rewrite of the routing body, keeping the existing matcher)
- Test: `__tests__/middleware.test.js`

**Interfaces:**
- Consumes: `parseHost` (Task 1).
- Produces: middleware that rewrites custom-domain hosts to `/sites/{username}` via the public pointer, and falls through on a miss.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/middleware.test.js`
Expected: FAIL (current middleware is synchronous and has no custom-domain branch — rewrite assertions fail)

- [ ] **Step 3: Write the implementation** (replace the whole file)

```js
// middleware.js
import { NextResponse } from 'next/server'
import { parseHost } from './common/domainUtils'

const PASSTHROUGH = [
  '/admin', '/api/', '/_next/', '/auth/', '/onboarding', '/sites/', '/fonts/', '/images/',
]

function isPassthrough(pathname) {
  if (pathname === '/favicon.ico') return true
  return PASSTHROUGH.some((p) => pathname.startsWith(p))
}

async function lookupCustomDomain(host) {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL
  if (!base) return null
  const hostname = host.split(':')[0]
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/middleware.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add middleware.js __tests__/middleware.test.js
git commit -m "feat(domains): middleware rewrites custom hostnames via R2 pointer"
```

---

### Task 9: DomainPanel UI

**Files:**
- Create: `components/admin/platform/DomainPanel.js`
- Modify: `components/admin/platform/SiteSettingsPopover.js` (replace the `view === 'domain'` body, lines 313-334; add import)
- Test: `__tests__/components/DomainPanel.test.js`

**Interfaces:**
- Consumes: `normalizeCustomDomain` (Task 1); endpoints `POST /api/admin/domain/connect`, `GET /api/admin/domain/status`, `DELETE /api/admin/domain`, `GET /api/admin/domain/search`.
- Produces: `<DomainPanel siteConfig username onUpdate />` rendered inside the domain drill-in.

- [ ] **Step 1: Write the failing test**

```js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DomainPanel from '../../components/admin/platform/DomainPanel'

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => jest.resetAllMocks())

function jsonOnce(body) {
  global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) })
}

it('connects a domain and shows the DNS record to set', async () => {
  jsonOnce({ customDomain: {
    name: 'photos.janedoe.com', status: 'pending',
    verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
  } })
  const onUpdate = jest.fn()
  render(<DomainPanel siteConfig={{ customDomain: null }} username="jane" onUpdate={onUpdate} />)

  fireEvent.change(screen.getByPlaceholderText('photos.yourname.com'), { target: { value: 'photos.janedoe.com' } })
  fireEvent.click(screen.getByRole('button', { name: /connect/i }))

  await waitFor(() => expect(screen.getByText('cname.vercel-dns.com')).toBeInTheDocument())
  expect(screen.getByText(/CNAME/i)).toBeInTheDocument()
  expect(global.fetch).toHaveBeenCalledWith('/api/admin/domain/connect', expect.objectContaining({ method: 'POST' }))
  expect(onUpdate).toHaveBeenCalled()
})

it('shows an Active badge for a verified domain', () => {
  render(<DomainPanel siteConfig={{ customDomain: { name: 'a.com', status: 'active', verification: [] } }} username="jane" onUpdate={() => {}} />)
  expect(screen.getByText(/active/i)).toBeInTheDocument()
})

it('searches for a new domain and renders an available result with a registrar link', async () => {
  jsonOnce({ results: [
    { domain: 'janedoe.com', available: false, price: null, registrarUrl: 'https://reg/janedoe.com' },
    { domain: 'janedoe.photo', available: true, price: 25, registrarUrl: 'https://reg/janedoe.photo' },
  ] })
  render(<DomainPanel siteConfig={{ customDomain: null }} username="jane" onUpdate={() => {}} />)

  fireEvent.change(screen.getByPlaceholderText(/find a new domain/i), { target: { value: 'janedoe' } })
  fireEvent.submit(screen.getByPlaceholderText(/find a new domain/i).closest('form'))

  await waitFor(() => expect(screen.getByText('janedoe.photo')).toBeInTheDocument())
  const getIt = screen.getByRole('link', { name: /get it/i })
  expect(getIt).toHaveAttribute('href', 'https://reg/janedoe.photo')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/DomainPanel.test.js`
Expected: FAIL — `Cannot find module '.../DomainPanel'`

- [ ] **Step 3: Write the component**

```js
// components/admin/platform/DomainPanel.js
import { useState, useEffect, useRef } from 'react'
import { normalizeCustomDomain } from '../../../common/domainUtils'

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'
const input = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(160,140,110,0.32)', padding: '0 0 7px',
  fontSize: 13, color: '#2c2416', outline: 'none',
}
const label = { fontSize: 10, fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)' }

function StatusBadge({ status }) {
  const map = { active: ['Active', '#2e7d32'], pending: ['Pending DNS', '#9a7b2e'], error: ['Error', '#b03030'] }
  const [text, color] = map[status] || map.pending
  return (
    <span style={{ fontSize: 11, color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {status === 'active' ? '🔒 ' : ''}{text}
    </span>
  )
}

export default function DomainPanel({ siteConfig, username, onUpdate }) {
  const config = siteConfig || {}
  const [cd, setCd] = useState(() => normalizeCustomDomain(config.customDomain))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const pollRef = useRef(null)

  function persist(next) {
    setCd(next)
    onUpdate({ ...config, customDomain: next })
  }

  async function connect(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/admin/domain/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not connect domain'); return }
      persist(data.customDomain); setName('')
    } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true)
    try { await fetch('/api/admin/domain', { method: 'DELETE' }); persist(null) }
    finally { setBusy(false) }
  }

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/domain/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])
    } finally { setSearching(false) }
  }

  // Poll status until active.
  useEffect(() => {
    if (!cd || cd.status === 'active') return
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/admin/domain/status')
      if (!res.ok) return
      const data = await res.json()
      if (data.customDomain) persist(data.customDomain)
    }, 5000)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cd?.name, cd?.status])

  return (
    <div style={{ padding: 14 }} className="space-y-5">
      <div className="space-y-2">
        <div style={label}>Connect a domain you own</div>
        {cd ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: MONO, fontSize: 12.5, color: '#2c2416' }}>{cd.name}</span>
              <StatusBadge status={cd.status} />
            </div>
            {cd.status !== 'active' && (cd.verification || []).map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Add a <strong>{r.type}</strong> record — host{' '}
                <code style={{ fontFamily: MONO }}>{r.name}</code> → value{' '}
                <button type="button" onClick={() => navigator.clipboard?.writeText(r.value)}
                  style={{ fontFamily: MONO, background: 'rgba(160,140,110,0.12)', border: 'none', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}>
                  {r.value}
                </button>
              </div>
            ))}
            {cd.status !== 'active' && (
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Add this at your DNS provider. It activates automatically once detected.</p>
            )}
            <button type="button" onClick={remove} disabled={busy}
              style={{ fontSize: 11, color: '#b03030', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Remove domain
            </button>
          </div>
        ) : (
          <form onSubmit={connect} className="space-y-2">
            <input autoFocus style={input} placeholder="photos.yourname.com" value={name}
              onChange={(e) => setName(e.target.value)} />
            {error && <p style={{ fontSize: 10.5, color: '#b03030' }}>{error}</p>}
            <button type="submit" disabled={busy || !name.trim()}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(160,140,110,0.4)', background: 'rgba(255,253,248,0.7)', cursor: 'pointer' }}>
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        )}
      </div>

      <div className="space-y-2" style={{ borderTop: '1px solid rgba(160,140,110,0.12)', paddingTop: 14 }}>
        <div style={label}>Find a new domain</div>
        <form onSubmit={search}>
          <input style={input} placeholder="Find a new domain (e.g. your name)" value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </form>
        {searching && <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Searching…</p>}
        {results && results.map((r) => (
          <div key={r.domain} className="flex items-center justify-between" style={{ fontSize: 12 }}>
            <span style={{ fontFamily: MONO, color: r.available ? '#2c2416' : 'var(--text-muted)' }}>{r.domain}</span>
            {r.available ? (
              <span className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>${r.price}/yr</span>
                <a href={r.registrarUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: '#5c4f3a', textDecoration: 'underline' }}>Get it</a>
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Taken</span>
            )}
          </div>
        ))}
        {results && <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>After you buy it, come back and connect it above.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/DomainPanel.test.js`
Expected: PASS

- [ ] **Step 5: Integrate into `SiteSettingsPopover.js`**

Add the import near the top imports:
```js
import DomainPanel from './DomainPanel'
```
Replace the domain drill-in body (the `<div style={{ padding: '14px' }} ...> … </div>` inside `if (view === 'domain')`, lines ~317-331) with:
```js
        <DomainPanel siteConfig={config} username={username} onUpdate={onUpdate} />
```
Leave the surrounding `<PopoverShell … title="Custom Domain" …>` wrapper intact.

- [ ] **Step 6: Run the component test plus a smoke of the suite**

Run: `npx jest __tests__/components/DomainPanel.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/admin/platform/DomainPanel.js components/admin/platform/SiteSettingsPopover.js __tests__/components/DomainPanel.test.js
git commit -m "feat(domains): DomainPanel UI for connect + search, wired into settings"
```

---

### Task 10: Full-suite verification + main-settings row label

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js` (the domain drill row label, ~lines 602-605)

**Interfaces:**
- Consumes: `normalizeCustomDomain` (Task 1).

- [ ] **Step 1: Update the main-settings row to read the normalized name**

Add (if not already present from Task 9) the import:
```js
import { normalizeCustomDomain } from '../../../common/domainUtils'
```
Find the drill row that currently renders the custom domain (it reads `config.customDomain` as a string — around lines 602-605, showing either the domain or "Setup custom domain"). Replace the value expression so it reads `normalizeCustomDomain(config.customDomain)?.name`. For example, if the row is:
```js
{config.customDomain ? config.customDomain : 'Setup custom domain'}
```
change it to:
```js
{normalizeCustomDomain(config.customDomain)?.name || 'Setup custom domain'}
```
(If the actual JSX differs, apply the same substitution: guard with `normalizeCustomDomain(config.customDomain)?.name`.)

- [ ] **Step 2: Remove the now-unused `rootDomain` CNAME hint if orphaned**

The old inline hint (`Point a CNAME to {config.userId}.{rootDomain}`) was removed in Task 9. If `rootDomain` (line ~237) is no longer referenced anywhere in the file, leave it — it is also used by the preview-subdomain line (~384), so keep it. No change needed beyond confirming the file compiles.

- [ ] **Step 3: Run the entire test suite**

Run: `npx jest`
Expected: PASS — all pre-existing suites plus the new domain suites green.

- [ ] **Step 4: Manual smoke (dev server already runs on port 3000)**

Open the admin site settings → "Setup custom domain". Confirm: the connect input renders, an invalid entry shows the validation error, and the "Find a new domain" search field renders. (Live Vercel calls require the new env vars; without them connect returns a 500 with "Vercel API not configured", which is expected until the token is set.)

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat(domains): show connected domain name in settings row"
```

---

## Self-Review

**Spec coverage:**
- Hostname→user reverse lookup → Task 2 (pointer path) + Task 8 (middleware). ✓
- Data model object + `normalizeCustomDomain` + backward compat + page readers → Task 1. ✓
- Vercel client (add/status/remove/availability/price) → Task 3. ✓
- API routes connect/status/delete/search → Tasks 4-7. ✓
- UI two-section panel with records, polling status badge, remove, search + registrar deep-link → Task 9 (+ row label Task 10). ✓
- Error handling (409 conflict, transient status, cleanup tolerance, middleware fallthrough) → Tasks 4, 5, 6, 8. ✓
- Env prerequisites → Task 3 (+ edge mirror noted in Task 8). ✓
- Testing across client/routes/normalization/middleware → every task. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step is complete. ✓

**Type consistency:** `customDomain` object shape `{ name, status, verification, addedAt, verifiedAt, lastError }` is identical across Tasks 1, 4, 5, 6, 9. `verification` records are `{ type, name, value }` everywhere. Status enum `'pending'|'active'|'error'` consistent. `getDomainLookupPath` returns `domains/{hostname}.json` and is used identically in Tasks 4, 6, 8. Vercel client function names match their consumers. ✓

**Note on refinement from spec:** the spec listed a `'verifying'` status; this plan collapses it into `'pending'` ("Pending DNS") because Vercel exposes no reliable intermediate signal between "DNS not yet detected" and "active." Documented in Global Constraints.
