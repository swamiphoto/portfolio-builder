# Invite-Code Gated Access (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate new-tenant creation behind shareable invite codes with a 60-day trial clock, while grandfathering everyone who already has a site.

**Architecture:** Soft gate at the onboarding choke point (`PUT /api/admin/profile`, which claims a username and provisions a tenant). A brand-new user must supply a valid, unexpired, unexhausted invite code; redeeming it stamps `trialEndsAt` and an `invite` record on their profile. Anyone who already has a `username` is grandfathered (no code, no trial clock). Invites live in a new R2 namespace `invites/{code}.json`, mirroring the existing `usernames/{username}.json` and `domains/{hostname}.json` lookups. A platform-admin-only endpoint mints and lists codes.

**Tech Stack:** Next.js (pages router), NextAuth (Google OAuth, JWT), Cloudflare R2 via the S3 SDK (helpers in `common/gcsClient.js`), Jest + `@testing-library/react`. Path alias `@/` → repo root.

**Spec:** GitHub issue #95 "Gating Access" and its approved-recommendation comment (option A, 60-day trial, storage cap out of scope). See https://github.com/swamiphoto/portfolio-builder/issues/95

## Global Constraints

- Codes are **case-insensitive**; normalize to a canonical form before any read/write/compare (uppercase, trimmed, only `A-Z 0-9 -`).
- R2 has **no transactions**; redemption is read-modify-write. Acceptable for Phase 1 (single admin minting, low volume). Make redemption **idempotent per user** (re-submitting the same code by the same user must not double-count) to neutralize the common retry race. Note the residual multi-user race in a code comment.
- Server-only modules (anything importing `common/gcsClient`, `common/invites`, `common/userProfile`) must **never** be imported from client components. Shared client/server constants go in a pure module with no server imports.
- Storage-cap / upload-quota work is **out of scope** for this plan.
- Default new-invite policy: `maxUses = null` (unlimited), `expiresAt = null` (never expires), `trialDays = 60`.
- Follow existing style: no semicolons, single quotes, 2-space indent, `import` syntax, comments explain *why* not *what*.
- Test files live in `__tests__/**/*.test.js` and use the `@/` alias in `jest.mock(...)`.

---

### Task 1: Invite path builder + shared error constants

**Files:**
- Modify: `common/gcsUser.js` (add `getInviteLookupPath`)
- Create: `common/inviteMessages.js` (pure — safe to import from client)
- Test: `__tests__/invites/inviteMessages.test.js`
- Test: `__tests__/invites/gcsUser.invitePath.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getInviteLookupPath(code: string) => string` — returns `invites/${code}.json`. Caller passes an already-normalized code.
  - `common/inviteMessages.js` exports:
    - `INVITE_ERRORS = { REQUIRED: 'INVITE_REQUIRED', NOT_FOUND: 'INVITE_NOT_FOUND', EXPIRED: 'INVITE_EXPIRED', EXHAUSTED: 'INVITE_EXHAUSTED' }`
    - `inviteErrorMessage(code: string) => string` — maps an `INVITE_ERRORS` value (or anything unknown) to a user-facing message.

- [ ] **Step 1: Write the failing test for inviteMessages**

```js
// __tests__/invites/inviteMessages.test.js
import { INVITE_ERRORS, inviteErrorMessage } from '@/common/inviteMessages'

describe('inviteMessages', () => {
  it('exposes the four error codes', () => {
    expect(INVITE_ERRORS).toEqual({
      REQUIRED: 'INVITE_REQUIRED',
      NOT_FOUND: 'INVITE_NOT_FOUND',
      EXPIRED: 'INVITE_EXPIRED',
      EXHAUSTED: 'INVITE_EXHAUSTED',
    })
  })

  it('maps each code to a distinct, non-empty message', () => {
    const msgs = Object.values(INVITE_ERRORS).map(inviteErrorMessage)
    msgs.forEach((m) => expect(typeof m === 'string' && m.length > 0).toBe(true))
    expect(new Set(msgs).size).toBe(msgs.length)
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(inviteErrorMessage('WAT')).toMatch(/invite/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/invites/inviteMessages.test.js`
Expected: FAIL — cannot find module `@/common/inviteMessages`.

- [ ] **Step 3: Create `common/inviteMessages.js`**

```js
// common/inviteMessages.js
// Pure constants + copy shared between the server (invite redemption) and the
// client (onboarding form). No server imports — safe in client components.

export const INVITE_ERRORS = {
  REQUIRED: 'INVITE_REQUIRED',
  NOT_FOUND: 'INVITE_NOT_FOUND',
  EXPIRED: 'INVITE_EXPIRED',
  EXHAUSTED: 'INVITE_EXHAUSTED',
}

const MESSAGES = {
  [INVITE_ERRORS.REQUIRED]: 'An invite code is required to create a site.',
  [INVITE_ERRORS.NOT_FOUND]: "That invite code isn't valid. Double-check it and try again.",
  [INVITE_ERRORS.EXPIRED]: 'That invite code has expired.',
  [INVITE_ERRORS.EXHAUSTED]: 'That invite code has already been used up.',
}

export function inviteErrorMessage(code) {
  return MESSAGES[code] || "That invite code couldn't be used. Please try again."
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/invites/inviteMessages.test.js`
Expected: PASS

- [ ] **Step 5: Write the failing test for the path builder**

```js
// __tests__/invites/gcsUser.invitePath.test.js
import { getInviteLookupPath } from '@/common/gcsUser'

describe('getInviteLookupPath', () => {
  it('builds the invites/ key from a normalized code', () => {
    expect(getInviteLookupPath('SEPIA-EARLY')).toBe('invites/SEPIA-EARLY.json')
  })

  it('throws when code is missing', () => {
    expect(() => getInviteLookupPath('')).toThrow(/code is required/)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest __tests__/invites/gcsUser.invitePath.test.js`
Expected: FAIL — `getInviteLookupPath is not a function`.

- [ ] **Step 7: Add `getInviteLookupPath` to `common/gcsUser.js`**

Add after `getDomainLookupPath`:

```js
export function getInviteLookupPath(code) {
  if (!code) throw new Error('code is required')
  return `invites/${code}.json`
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest __tests__/invites/gcsUser.invitePath.test.js`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add common/inviteMessages.js common/gcsUser.js __tests__/invites/
git commit -m "feat(invites): add invite path builder and shared error messages"
```

---

### Task 2: Invite store — normalize, read/write, create

**Files:**
- Create: `common/invites.js`
- Test: `__tests__/invites/invites.store.test.js`

**Interfaces:**
- Consumes: `downloadJSON`, `uploadJSON` from `@/common/gcsClient`; `getInviteLookupPath` from `@/common/gcsUser`.
- Produces:
  - `normalizeInviteCode(raw: string) => string` — uppercase, trim, strip anything outside `A-Z 0-9 -`. Returns `''` for falsy/empty input.
  - `readInvite(code: string) => Promise<InviteDoc | null>` — normalizes, reads `invites/{code}.json`, returns `null` on NoSuchKey.
  - `writeInvite(invite: InviteDoc) => Promise<void>` — writes to `invites/{invite.code}.json` (code already normalized on the doc).
  - `createInvite({ code?, label?, maxUses?, expiresAt?, trialDays? }) => Promise<InviteDoc>` — normalizes or generates a code, writes it, returns the stored doc.
  - `InviteDoc` shape: `{ code, label, createdAt, maxUses, uses, redeemedBy: [{ userId, at }], expiresAt, trialDays }`.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/invites/invites.store.test.js
const mockDownload = jest.fn()
const mockUpload = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/gcsClient', () => ({
  downloadJSON: (...a) => mockDownload(...a),
  uploadJSON: (...a) => mockUpload(...a),
}))

import { normalizeInviteCode, readInvite, writeInvite, createInvite } from '@/common/invites'

beforeEach(() => {
  jest.clearAllMocks()
  mockUpload.mockResolvedValue(undefined)
})

describe('normalizeInviteCode', () => {
  it('uppercases, trims, and strips illegal chars', () => {
    expect(normalizeInviteCode('  sepia-early!! ')).toBe('SEPIA-EARLY')
  })
  it('returns empty string for falsy input', () => {
    expect(normalizeInviteCode('')).toBe('')
    expect(normalizeInviteCode(undefined)).toBe('')
  })
})

describe('readInvite', () => {
  it('normalizes the code and returns the doc', async () => {
    mockDownload.mockResolvedValue({ code: 'SEPIA-EARLY', uses: 0 })
    const doc = await readInvite('sepia-early')
    expect(mockDownload).toHaveBeenCalledWith('invites/SEPIA-EARLY.json')
    expect(doc.code).toBe('SEPIA-EARLY')
  })
  it('returns null when the key is missing', async () => {
    mockDownload.mockRejectedValue({ name: 'NoSuchKey' })
    expect(await readInvite('nope')).toBeNull()
  })
})

describe('createInvite', () => {
  it('stores a normalized explicit code with defaults', async () => {
    const doc = await createInvite({ code: 'sepia-early', label: 'Batch 1' })
    expect(doc.code).toBe('SEPIA-EARLY')
    expect(doc.label).toBe('Batch 1')
    expect(doc.maxUses).toBeNull()
    expect(doc.expiresAt).toBeNull()
    expect(doc.trialDays).toBe(60)
    expect(doc.uses).toBe(0)
    expect(doc.redeemedBy).toEqual([])
    expect(typeof doc.createdAt).toBe('string')
    expect(mockUpload).toHaveBeenCalledWith('invites/SEPIA-EARLY.json', doc)
  })
  it('generates a code when none is given', async () => {
    const doc = await createInvite({})
    expect(doc.code).toMatch(/^[A-Z0-9-]+$/)
    expect(doc.code.length).toBeGreaterThanOrEqual(6)
    expect(mockUpload).toHaveBeenCalledWith(`invites/${doc.code}.json`, doc)
  })
  it('honors explicit maxUses, expiresAt, trialDays', async () => {
    const doc = await createInvite({ code: 'ONE', maxUses: 1, expiresAt: '2027-01-01T00:00:00.000Z', trialDays: 30 })
    expect(doc.maxUses).toBe(1)
    expect(doc.expiresAt).toBe('2027-01-01T00:00:00.000Z')
    expect(doc.trialDays).toBe(30)
  })
})

describe('writeInvite', () => {
  it('writes to the code key', async () => {
    await writeInvite({ code: 'SEPIA-EARLY', uses: 2 })
    expect(mockUpload).toHaveBeenCalledWith('invites/SEPIA-EARLY.json', { code: 'SEPIA-EARLY', uses: 2 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/invites/invites.store.test.js`
Expected: FAIL — cannot find module `@/common/invites`.

- [ ] **Step 3: Create `common/invites.js` (store + create; redeem comes in Task 3)**

```js
// common/invites.js
// Server-side only — never import from client components (pulls in gcsClient).
import crypto from 'crypto'
import { downloadJSON, uploadJSON } from './gcsClient'
import { getInviteLookupPath } from './gcsUser'

const DEFAULT_TRIAL_DAYS = 60

function isNotFound(err) {
  return err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey'
}

export function normalizeInviteCode(raw) {
  if (!raw) return ''
  return String(raw).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

// Ambiguous characters (0/O, 1/I) left out so hand-typed codes are unambiguous.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(len = 8) {
  const bytes = crypto.randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

export async function readInvite(code) {
  const key = getInviteLookupPath(normalizeInviteCode(code))
  try {
    return await downloadJSON(key)
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function writeInvite(invite) {
  await uploadJSON(getInviteLookupPath(invite.code), invite)
}

export async function createInvite({ code, label = '', maxUses = null, expiresAt = null, trialDays = DEFAULT_TRIAL_DAYS } = {}) {
  const normalized = code ? normalizeInviteCode(code) : generateCode()
  if (!normalized) throw new Error('Invalid invite code')
  const invite = {
    code: normalized,
    label,
    createdAt: new Date().toISOString(),
    maxUses: maxUses == null ? null : Number(maxUses),
    uses: 0,
    redeemedBy: [],
    expiresAt: expiresAt || null,
    trialDays: Number(trialDays) || DEFAULT_TRIAL_DAYS,
  }
  await writeInvite(invite)
  return invite
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/invites/invites.store.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add common/invites.js __tests__/invites/invites.store.test.js
git commit -m "feat(invites): invite store — normalize, read/write, create"
```

---

### Task 3: Redeem invite (validation + idempotency)

**Files:**
- Modify: `common/invites.js` (add `redeemInvite`)
- Test: `__tests__/invites/invites.redeem.test.js`

**Interfaces:**
- Consumes: `readInvite`, `writeInvite`, `normalizeInviteCode` (own module); `INVITE_ERRORS` from `@/common/inviteMessages`.
- Produces:
  - `class InviteError extends Error` with a `.code` property set to an `INVITE_ERRORS` value.
  - `redeemInvite(rawCode: string, userId: string) => Promise<{ code: string, trialDays: number }>` — validates and records the redemption. Throws `InviteError` with:
    - `INVITE_ERRORS.NOT_FOUND` if the code doesn't exist.
    - `INVITE_ERRORS.EXPIRED` if `expiresAt` is set and in the past.
    - `INVITE_ERRORS.EXHAUSTED` if `maxUses != null` and `uses >= maxUses`.
    - On success (or if this `userId` already redeemed it — idempotent), appends `{ userId, at }` to `redeemedBy` and increments `uses` **only on first redemption by this user**, then writes the doc.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/invites/invites.redeem.test.js
const mockDownload = jest.fn()
const mockUpload = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/gcsClient', () => ({
  downloadJSON: (...a) => mockDownload(...a),
  uploadJSON: (...a) => mockUpload(...a),
}))

import { redeemInvite, InviteError } from '@/common/invites'
import { INVITE_ERRORS } from '@/common/inviteMessages'

function invite(overrides = {}) {
  return { code: 'SEPIA-EARLY', label: '', createdAt: 't', maxUses: null, uses: 0, redeemedBy: [], expiresAt: null, trialDays: 60, ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpload.mockResolvedValue(undefined)
})

it('throws NOT_FOUND for a missing code', async () => {
  mockDownload.mockRejectedValue({ name: 'NoSuchKey' })
  await expect(redeemInvite('nope', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.NOT_FOUND })
})

it('throws EXPIRED when past expiresAt', async () => {
  mockDownload.mockResolvedValue(invite({ expiresAt: '2000-01-01T00:00:00.000Z' }))
  await expect(redeemInvite('SEPIA-EARLY', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.EXPIRED })
})

it('throws EXHAUSTED when uses >= maxUses', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 1, uses: 1 }))
  await expect(redeemInvite('SEPIA-EARLY', 'u1')).rejects.toMatchObject({ code: INVITE_ERRORS.EXHAUSTED })
})

it('redeems: increments uses, records the user, returns trialDays', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 5, uses: 2 }))
  const result = await redeemInvite('sepia-early', 'u1')
  expect(result).toEqual({ code: 'SEPIA-EARLY', trialDays: 60 })
  const written = mockUpload.mock.calls[0][1]
  expect(written.uses).toBe(3)
  expect(written.redeemedBy).toHaveLength(1)
  expect(written.redeemedBy[0].userId).toBe('u1')
  expect(typeof written.redeemedBy[0].at).toBe('string')
})

it('is idempotent for the same user (no double count)', async () => {
  mockDownload.mockResolvedValue(invite({ maxUses: 1, uses: 1, redeemedBy: [{ userId: 'u1', at: 't' }] }))
  const result = await redeemInvite('SEPIA-EARLY', 'u1')
  expect(result).toEqual({ code: 'SEPIA-EARLY', trialDays: 60 })
  // Already redeemed by u1 → allowed even though exhausted, and uses not bumped again
  if (mockUpload.mock.calls.length) {
    expect(mockUpload.mock.calls[0][1].uses).toBe(1)
  }
})

it('InviteError carries a code', () => {
  const e = new InviteError(INVITE_ERRORS.NOT_FOUND, 'nope')
  expect(e).toBeInstanceOf(Error)
  expect(e.code).toBe(INVITE_ERRORS.NOT_FOUND)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/invites/invites.redeem.test.js`
Expected: FAIL — `redeemInvite`/`InviteError` not exported.

- [ ] **Step 3: Add `InviteError` + `redeemInvite` to `common/invites.js`**

Add the import at the top (below the existing imports):

```js
import { INVITE_ERRORS } from './inviteMessages'
```

Add at the end of the file:

```js
export class InviteError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'InviteError'
    this.code = code
  }
}

/**
 * Validates and records an invite redemption.
 * Idempotent per user: a repeat redemption by the same userId succeeds without
 * bumping `uses`, which neutralizes the common double-submit race. NOTE: R2 has
 * no transactions, so two *different* users redeeming the last slot of a
 * maxUses-limited code concurrently could both succeed — acceptable for the
 * low-volume Phase-1 beta.
 */
export async function redeemInvite(rawCode, userId) {
  const code = normalizeInviteCode(rawCode)
  const invite = await readInvite(code)
  if (!invite) throw new InviteError(INVITE_ERRORS.NOT_FOUND)

  const alreadyRedeemed = (invite.redeemedBy || []).some((r) => r.userId === userId)

  if (!alreadyRedeemed) {
    if (invite.expiresAt && Date.parse(invite.expiresAt) < Date.now()) {
      throw new InviteError(INVITE_ERRORS.EXPIRED)
    }
    if (invite.maxUses != null && (invite.uses || 0) >= invite.maxUses) {
      throw new InviteError(INVITE_ERRORS.EXHAUSTED)
    }
    invite.uses = (invite.uses || 0) + 1
    invite.redeemedBy = [...(invite.redeemedBy || []), { userId, at: new Date().toISOString() }]
    await writeInvite(invite)
  }

  return { code: invite.code, trialDays: Number(invite.trialDays) || 60 }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/invites/invites.redeem.test.js`
Expected: PASS

- [ ] **Step 5: Run the full invites suite**

Run: `npx jest __tests__/invites/`
Expected: PASS (all files)

- [ ] **Step 6: Commit**

```bash
git add common/invites.js __tests__/invites/invites.redeem.test.js
git commit -m "feat(invites): redeemInvite with validation and per-user idempotency"
```

---

### Task 4: Gate onboarding in the profile route

**Files:**
- Modify: `pages/api/admin/profile.js`
- Test: `__tests__/invites/profile.gate.route.test.js`

**Interfaces:**
- Consumes: `redeemInvite`, `InviteError` from `@/common/invites`; `INVITE_ERRORS` from `@/common/inviteMessages`; existing `readUserProfile`, `writeUserProfile`, `claimUsername`, `lookupUserByUsername`.
- Produces: modified `PUT` behavior:
  - **New tenant** (no `existingProfile.username`): requires `req.body.inviteCode`. Missing → `400 { error: INVITE_ERRORS.REQUIRED }`. Invalid → `403 { error: <InviteError.code> }`. On success, stamps `trialEndsAt = now + trialDays days` (ISO) and `invite = { code, redeemedAt }` on the new profile.
  - **Existing tenant** (grandfathered): behaves exactly as today — no code required; preserves any existing `trialEndsAt`/`invite`.
  - Username-taken check unchanged (`409`). Redemption happens **after** the availability check and **before** writing the profile.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/invites/profile.gate.route.test.js
const mockGetSession = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a) => mockGetSession(...a) }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockReadProfile = jest.fn()
const mockWriteProfile = jest.fn().mockResolvedValue(undefined)
const mockClaim = jest.fn().mockResolvedValue('taken-slug')
const mockLookup = jest.fn()
jest.mock('@/common/userProfile', () => ({
  readUserProfile: (...a) => mockReadProfile(...a),
  writeUserProfile: (...a) => mockWriteProfile(...a),
  claimUsername: (...a) => mockClaim(...a),
  lookupUserByUsername: (...a) => mockLookup(...a),
}))

const mockRedeem = jest.fn()
jest.mock('@/common/invites', () => {
  const actual = jest.requireActual('@/common/invites')
  return { ...actual, redeemInvite: (...a) => mockRedeem(...a) }
})

import handler from '@/pages/api/admin/profile'
import { INVITE_ERRORS } from '@/common/inviteMessages'
import { InviteError } from '@/common/invites'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}
const USER = { id: 'u1', email: 'a@b.com', name: 'Ann' }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ user: USER })
  mockLookup.mockResolvedValue(null)
  mockClaim.mockResolvedValue('ann')
})

it('new tenant without a code → 400 INVITE_REQUIRED', async () => {
  mockReadProfile.mockResolvedValue(null)
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann' } }, res)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({ error: INVITE_ERRORS.REQUIRED })
  expect(mockWriteProfile).not.toHaveBeenCalled()
})

it('new tenant with an invalid code → 403 with the error code', async () => {
  mockReadProfile.mockResolvedValue(null)
  mockRedeem.mockRejectedValue(new InviteError(INVITE_ERRORS.NOT_FOUND))
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann', inviteCode: 'nope' } }, res)
  expect(res.status).toHaveBeenCalledWith(403)
  expect(res.json).toHaveBeenCalledWith({ error: INVITE_ERRORS.NOT_FOUND })
  expect(mockWriteProfile).not.toHaveBeenCalled()
})

it('new tenant with a valid code → 200, stamps trialEndsAt + invite', async () => {
  mockReadProfile.mockResolvedValue(null)
  mockRedeem.mockResolvedValue({ code: 'SEPIA-EARLY', trialDays: 60 })
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann', inviteCode: 'sepia-early' } }, res)
  expect(mockRedeem).toHaveBeenCalledWith('sepia-early', 'u1')
  expect(res.status).toHaveBeenCalledWith(200)
  const profile = res.json.mock.calls[0][0]
  expect(profile.username).toBe('ann')
  expect(profile.invite).toEqual({ code: 'SEPIA-EARLY', redeemedAt: expect.any(String) })
  const days = (Date.parse(profile.trialEndsAt) - Date.now()) / 86400000
  expect(days).toBeGreaterThan(59)
  expect(days).toBeLessThan(61)
  expect(mockWriteProfile).toHaveBeenCalled()
  expect(mockClaim).toHaveBeenCalledWith('u1', 'ann')
})

it('existing tenant is grandfathered — no code needed, trial preserved', async () => {
  mockReadProfile.mockResolvedValue({ userId: 'u1', username: 'ann', createdAt: 'orig', trialEndsAt: '2099-01-01T00:00:00.000Z', invite: { code: 'OLD', redeemedAt: 't' } })
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann' } }, res)
  expect(mockRedeem).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledWith(200)
  const profile = res.json.mock.calls[0][0]
  expect(profile.trialEndsAt).toBe('2099-01-01T00:00:00.000Z')
  expect(profile.invite).toEqual({ code: 'OLD', redeemedAt: 't' })
})

it('username taken → 409 before any redemption', async () => {
  mockReadProfile.mockResolvedValue(null)
  mockLookup.mockResolvedValue({ userId: 'someone-else' })
  const res = mockRes()
  await handler({ method: 'PUT', body: { username: 'ann', inviteCode: 'sepia-early' } }, res)
  expect(res.status).toHaveBeenCalledWith(409)
  expect(mockRedeem).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/invites/profile.gate.route.test.js`
Expected: FAIL — new tenant currently gets `200` without a code; `trialEndsAt`/`invite` absent.

- [ ] **Step 3: Modify `pages/api/admin/profile.js`**

Add imports at the top (below the existing `userProfile` import):

```js
import { redeemInvite, InviteError } from '../../../common/invites'
import { INVITE_ERRORS } from '../../../common/inviteMessages'
```

Replace the entire `if (req.method === 'PUT') { ... }` block with:

```js
  if (req.method === 'PUT') {
    const { username, displayName, bio, inviteCode } = req.body
    if (!username) return res.status(400).json({ error: 'username is required' })

    const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug) return res.status(400).json({ error: 'Invalid username' })

    // Check availability (allow re-claiming own username)
    const existing = await lookupUserByUsername(slug)
    if (existing && existing.userId !== user.id) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    const existingProfile = await readUserProfile(user.id)
    // Grandfather anyone who already has a site: they never need a code and keep
    // whatever trial state they had (usually none). Only brand-new tenants are gated.
    const isNewTenant = !existingProfile?.username

    let trialEndsAt = existingProfile?.trialEndsAt || null
    let invite = existingProfile?.invite || null

    if (isNewTenant) {
      if (!inviteCode) return res.status(400).json({ error: INVITE_ERRORS.REQUIRED })
      let redemption
      try {
        redemption = await redeemInvite(inviteCode, user.id)
      } catch (err) {
        if (err instanceof InviteError) return res.status(403).json({ error: err.code })
        throw err
      }
      const now = new Date()
      trialEndsAt = new Date(now.getTime() + redemption.trialDays * 86400000).toISOString()
      invite = { code: redemption.code, redeemedAt: now.toISOString() }
    }

    const profile = {
      userId: user.id,
      username: slug,
      displayName: displayName || user.name || '',
      bio: bio || existingProfile?.bio || '',
      email: user.email || '',
      updatedAt: new Date().toISOString(),
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(invite ? { invite } : {}),
    }

    await writeUserProfile(user.id, profile)
    await claimUsername(user.id, slug)

    return res.status(200).json(profile)
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/invites/profile.gate.route.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/profile.js __tests__/invites/profile.gate.route.test.js
git commit -m "feat(invites): gate new-tenant onboarding on a valid invite code"
```

---

### Task 5: Platform-admin helper + mint/list endpoint

**Files:**
- Create: `common/platformAdmin.js`
- Create: `pages/api/admin/invites.js`
- Test: `__tests__/invites/platformAdmin.test.js`
- Test: `__tests__/invites/invites.route.test.js`

**Interfaces:**
- Consumes: `withAuth` from `@/common/withAuth`; `createInvite` from `@/common/invites`; `listFiles`, `downloadJSON` from `@/common/gcsClient`.
- Produces:
  - `common/platformAdmin.js`: `isPlatformAdmin(user) => boolean` — true if `user.email` (lowercased) is in the comma-separated `SEPIA_ADMIN_EMAILS` env. Empty/unset env → always false.
  - `pages/api/admin/invites.js` (wrapped in `withAuth`):
    - Non-admin (any method) → `403 { error: 'Forbidden' }`.
    - `POST` with `{ label?, maxUses?, expiresAt?, trialDays?, code? }` → `201 { invite }`.
    - `GET` → `200 { invites: InviteDoc[] }` (lists everything under `invites/`).
    - Other methods → `405`.

- [ ] **Step 1: Write the failing test for `isPlatformAdmin`**

```js
// __tests__/invites/platformAdmin.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/invites/platformAdmin.test.js`
Expected: FAIL — cannot find module `@/common/platformAdmin`.

- [ ] **Step 3: Create `common/platformAdmin.js`**

```js
// common/platformAdmin.js
// Who is allowed to mint invite codes / act as the Sepia platform operator.
// Allowlist of emails in SEPIA_ADMIN_EMAILS (comma-separated). Server-side only.

export function isPlatformAdmin(user) {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  const allow = (process.env.SEPIA_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/invites/platformAdmin.test.js`
Expected: PASS

- [ ] **Step 5: Write the failing test for the route**

```js
// __tests__/invites/invites.route.test.js
const mockGetSession = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a) => mockGetSession(...a) }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockIsAdmin = jest.fn()
jest.mock('@/common/platformAdmin', () => ({ isPlatformAdmin: (...a) => mockIsAdmin(...a) }))

const mockCreate = jest.fn()
jest.mock('@/common/invites', () => ({ createInvite: (...a) => mockCreate(...a) }))

const mockList = jest.fn()
const mockDownload = jest.fn()
jest.mock('@/common/gcsClient', () => ({
  listFiles: (...a) => mockList(...a),
  downloadJSON: (...a) => mockDownload(...a),
}))

import handler from '@/pages/api/admin/invites'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ user: { id: 'u1', email: 'owner@sepia.photo' } })
  mockIsAdmin.mockReturnValue(true)
})

it('403s a non-admin', async () => {
  mockIsAdmin.mockReturnValue(false)
  const res = mockRes()
  await handler({ method: 'POST', body: {} }, res)
  expect(res.status).toHaveBeenCalledWith(403)
  expect(mockCreate).not.toHaveBeenCalled()
})

it('POST creates an invite → 201', async () => {
  mockCreate.mockResolvedValue({ code: 'SEPIA-EARLY', trialDays: 60 })
  const res = mockRes()
  await handler({ method: 'POST', body: { label: 'Batch 1', maxUses: 10 } }, res)
  expect(mockCreate).toHaveBeenCalledWith({ label: 'Batch 1', maxUses: 10, expiresAt: undefined, trialDays: undefined, code: undefined })
  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith({ invite: { code: 'SEPIA-EARLY', trialDays: 60 } })
})

it('GET lists all invites → 200', async () => {
  mockList.mockResolvedValue(['invites/SEPIA-EARLY.json', 'invites/ONE.json'])
  mockDownload.mockImplementation((k) => Promise.resolve({ code: k.includes('ONE') ? 'ONE' : 'SEPIA-EARLY' }))
  const res = mockRes()
  await handler({ method: 'GET' }, res)
  expect(res.status).toHaveBeenCalledWith(200)
  const body = res.json.mock.calls[0][0]
  expect(body.invites.map((i) => i.code).sort()).toEqual(['ONE', 'SEPIA-EARLY'])
})

it('405s other methods', async () => {
  const res = mockRes()
  await handler({ method: 'DELETE' }, res)
  expect(res.status).toHaveBeenCalledWith(405)
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest __tests__/invites/invites.route.test.js`
Expected: FAIL — cannot find module `@/pages/api/admin/invites`.

- [ ] **Step 7: Create `pages/api/admin/invites.js`**

```js
import { withAuth } from '../../../common/withAuth'
import { isPlatformAdmin } from '../../../common/platformAdmin'
import { createInvite } from '../../../common/invites'
import { listFiles, downloadJSON } from '../../../common/gcsClient'

export default withAuth(async (req, res, user) => {
  if (!isPlatformAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'POST') {
    const { label, maxUses, expiresAt, trialDays, code } = req.body || {}
    const invite = await createInvite({ label, maxUses, expiresAt, trialDays, code })
    return res.status(201).json({ invite })
  }

  if (req.method === 'GET') {
    const keys = await listFiles('invites/')
    const invites = await Promise.all(
      keys.filter((k) => k.endsWith('.json')).map((k) => downloadJSON(k))
    )
    return res.status(200).json({ invites })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest __tests__/invites/invites.route.test.js`
Expected: PASS

- [ ] **Step 9: Document the env var**

Add to `.env.local.example` (near the other server vars):

```
# Comma-separated emails allowed to mint invite codes (platform operators)
SEPIA_ADMIN_EMAILS=
```

- [ ] **Step 10: Commit**

```bash
git add common/platformAdmin.js pages/api/admin/invites.js __tests__/invites/platformAdmin.test.js __tests__/invites/invites.route.test.js .env.local.example
git commit -m "feat(invites): platform-admin mint/list endpoint"
```

---

### Task 6: Onboarding UI — invite field + friendly errors

**Files:**
- Modify: `components/admin/onboarding/UrlClaimStep.js`
- Modify: `pages/onboarding.js`
- Test: `__tests__/invites/urlClaimStep.test.js`

**Interfaces:**
- Consumes: `inviteErrorMessage`, `INVITE_ERRORS` from `@/common/inviteMessages`.
- Produces:
  - `UrlClaimStep` gains two props: `inviteCode: string`, `setInviteCode: (v: string) => void`. It renders a labelled invite-code text input below the username hero; submit stays disabled unless **both** `slug` and a non-empty `inviteCode` are present.
  - `pages/onboarding.js` holds `inviteCode` state, passes it to `UrlClaimStep`, includes it in the `PUT /api/admin/profile` body, and on a `400`/`403` maps `body.error` through `inviteErrorMessage` into the existing `error` display.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/invites/urlClaimStep.test.js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlClaimStep from '@/components/admin/onboarding/UrlClaimStep'

function setup(props = {}) {
  const setUsername = jest.fn()
  const setInviteCode = jest.fn()
  const onSubmit = jest.fn((e) => e.preventDefault())
  render(
    <UrlClaimStep
      rootDomain="sepia.photo"
      username={props.username ?? ''}
      setUsername={setUsername}
      slug={props.slug ?? ''}
      inviteCode={props.inviteCode ?? ''}
      setInviteCode={setInviteCode}
      error={props.error ?? ''}
      saving={false}
      onSubmit={onSubmit}
    />
  )
  return { setUsername, setInviteCode, onSubmit }
}

it('renders an invite code field', () => {
  setup()
  expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()
})

it('typing an invite code calls setInviteCode', async () => {
  const { setInviteCode } = setup()
  await userEvent.type(screen.getByLabelText(/invite code/i), 'X')
  expect(setInviteCode).toHaveBeenCalled()
})

it('disables submit until both slug and invite code are present', () => {
  setup({ slug: 'ann', inviteCode: '' })
  expect(screen.getByRole('button', { name: /claim/i })).toBeDisabled()
})

it('enables submit when slug and invite code are present', () => {
  setup({ username: 'ann', slug: 'ann', inviteCode: 'SEPIA-EARLY' })
  expect(screen.getByRole('button', { name: /claim/i })).toBeEnabled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/invites/urlClaimStep.test.js`
Expected: FAIL — no invite code field; button gating uses only `slug`.

- [ ] **Step 3: Add the invite field to `components/admin/onboarding/UrlClaimStep.js`**

Change the function signature to accept the new props:

```js
export default function UrlClaimStep({ rootDomain, username, setUsername, slug, inviteCode, setInviteCode, error, saving, onSubmit }) {
```

Insert this block immediately **before** the `{error && (` block:

```js
        <div style={{ marginTop: 30, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
          <label htmlFor="claim-invite" style={{ display: 'block', fontFamily: MONO, fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8967a', marginBottom: 8 }}>
            Invite code
          </label>
          <input
            id="claim-invite"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="SEPIA-XXXX"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', padding: '11px 13px', border: '1px solid rgba(120,100,70,0.3)',
              borderRadius: 6, background: 'rgba(255,255,255,0.5)', outline: 'none',
              fontFamily: MONO, fontSize: 14, letterSpacing: '0.06em', color: '#2c2416',
            }}
          />
        </div>
```

Update the submit button so it's gated on both fields. Replace `disabled={!slug || saving}` with:

```js
          disabled={!slug || !inviteCode || saving}
```

and in the inline `style`, replace the two `!slug || saving` conditions with `!slug || !inviteCode || saving`, and the two hover handlers' `if (slug && !saving)` with `if (slug && inviteCode && !saving)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/invites/urlClaimStep.test.js`
Expected: PASS

- [ ] **Step 5: Wire `pages/onboarding.js`**

Add the import near the top:

```js
import { inviteErrorMessage } from '../common/inviteMessages'
```

Add state next to the other `useState` calls:

```js
  const [inviteCode, setInviteCode] = useState('')
```

In `handleSubmit`, include the code in the request body — change the `body: JSON.stringify({ username: slug, displayName: ... })` line to:

```js
        body: JSON.stringify({ username: slug, displayName: session?.user?.name || '', inviteCode: inviteCode.trim() }),
```

Replace the `if (res.status === 409) { ... }` block with handling for the gate responses too:

```js
      if (res.status === 409) {
        setError('That username is taken. Try another.')
        setSaving(false)
        return
      }
      if (res.status === 400 || res.status === 403) {
        const body = await res.json().catch(() => ({}))
        setError(inviteErrorMessage(body.error))
        setSaving(false)
        return
      }
```

Pass the new props to `UrlClaimStep` at the bottom `return`:

```jsx
    <UrlClaimStep
      rootDomain={rootDomain}
      username={username}
      setUsername={(v) => { setUsername(v); setError('') }}
      slug={slug}
      inviteCode={inviteCode}
      setInviteCode={(v) => { setInviteCode(v); setError('') }}
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
    />
```

- [ ] **Step 6: Run the full invites suite + the existing onboarding-adjacent tests**

Run: `npx jest __tests__/invites/ __tests__/middleware.test.js`
Expected: PASS

- [ ] **Step 7: Manual verification (dev server already runs on port 3000)**

Confirm behavior end-to-end without a full account:
1. `npx jest` — whole suite green.
2. Mint a code locally (with `SEPIA_ADMIN_EMAILS` set to your Google email in `.env.local`): `curl` is awkward without a session cookie, so instead verify via a one-off node REPL or trust the route tests; the primary gate (profile route) and store logic are covered by tests.

(Full click-through — sign in with a fresh Google account, land on onboarding, try claiming with no code → error, with a good code → site created + `trialEndsAt` on the profile — is the reviewer's smoke test.)

- [ ] **Step 8: Commit**

```bash
git add components/admin/onboarding/UrlClaimStep.js pages/onboarding.js __tests__/invites/urlClaimStep.test.js
git commit -m "feat(invites): invite-code field and error handling in onboarding"
```

---

## Self-Review

**Spec coverage:**
- Shareable invite codes stored at `invites/{code}.json` → Task 1 (path), Task 2 (store/create). ✓
- Gate new-tenant creation at onboarding (option A) → Task 4. ✓
- Grandfather existing users → Task 4 (`isNewTenant`). ✓
- Stamp `trialEndsAt = now + 60 days` and record redeemed code → Task 3 (returns trialDays), Task 4 (stamps profile). ✓
- You-only way to mint codes → Task 5 (`isPlatformAdmin` + `/api/admin/invites`). ✓
- Mirrors existing username/domain lookup pattern → Task 1 adds `getInviteLookupPath` alongside `getDomainLookupPath`; helpers mirror `userProfile.js`. ✓
- Validation: unexpired, unexhausted → Task 3. ✓
- Storage cap explicitly out of scope → not implemented. ✓

**Placeholder scan:** No TBD/TODO; every code step has concrete code. ✓

**Type consistency:**
- `redeemInvite` returns `{ code, trialDays }` in Task 3 and is consumed with those exact fields in Task 4. ✓
- `InviteError.code` set in Task 3, read as `err.code` in Task 4. ✓
- `INVITE_ERRORS` values defined in Task 1, used in Tasks 3/4/6. ✓
- `createInvite({ code, label, maxUses, expiresAt, trialDays })` signature in Task 2 matches the call in Task 5. ✓
- Profile fields `trialEndsAt`, `invite: { code, redeemedAt }` written in Task 4 match assertions in Task 4's tests. ✓
- `UrlClaimStep` new props `inviteCode`/`setInviteCode` defined in Task 6 and passed from `onboarding.js` in Task 6. ✓
