// Server-side only — never import from client components (pulls in gcsClient).
import crypto from 'crypto'
import { downloadJSON, uploadJSON } from './gcsClient'
import { getInviteLookupPath } from './gcsUser'
import { INVITE_ERRORS } from './inviteMessages'

const DEFAULT_TRIAL_DAYS = 60

function isNotFound(err) {
  return err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey'
}

export function normalizeInviteCode(raw) {
  if (!raw) return ''
  // Length cap keeps hostile input from becoming a multi-KB storage key (the
  // code is used verbatim in the lookup path) — real codes are ≤ ~20 chars.
  return String(raw).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64)
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
  const normalized = normalizeInviteCode(code)
  if (!normalized) return null
  const key = getInviteLookupPath(normalized)
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

  // Never blind-write over an existing code: that would zero `uses`/`redeemedBy`
  // (destroying the audit trail) and revive exhausted or expired codes.
  const existing = await readInvite(normalized)
  if (existing) {
    const err = new Error('Invite code already exists')
    err.code = 'CODE_EXISTS'
    throw err
  }

  // Sanitize numerics at the trust boundary: `Number('abc')` is NaN, which
  // JSON-serializes to null — i.e. garbage input silently minting an UNLIMITED
  // code. Same guard for dates ("next week" → NaN → never expires).
  const parsedMaxUses = maxUses == null || maxUses === '' ? null : Number(maxUses)
  if (parsedMaxUses !== null && (!Number.isInteger(parsedMaxUses) || parsedMaxUses < 1)) {
    throw new Error('maxUses must be a positive integer')
  }
  const parsedExpiresAt = expiresAt || null
  if (parsedExpiresAt !== null && Number.isNaN(Date.parse(parsedExpiresAt))) {
    throw new Error('expiresAt must be a valid date')
  }
  const parsedTrialDays = Number(trialDays)
  if (!Number.isInteger(parsedTrialDays) || parsedTrialDays < 1) {
    throw new Error('trialDays must be a positive integer')
  }

  const invite = {
    code: normalized,
    label: String(label ?? '').slice(0, 200),
    createdAt: new Date().toISOString(),
    maxUses: parsedMaxUses,
    uses: 0,
    redeemedBy: [],
    expiresAt: parsedExpiresAt,
    trialDays: parsedTrialDays,
  }
  await writeInvite(invite)
  return invite
}

export class InviteError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'InviteError'
    this.code = code
  }
}

/**
 * Validates a code without redeeming it — for the onboarding gate screen, which
 * checks the ticket at the door while actual redemption stays on the profile
 * save. Mirrors redeemInvite's checks exactly, including treating a code this
 * user already redeemed as valid (so a refresh mid-onboarding doesn't lock
 * them out).
 */
export async function checkInvite(rawCode, userId) {
  const code = normalizeInviteCode(rawCode)
  if (!code) throw new InviteError(INVITE_ERRORS.NOT_FOUND)
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
  }
  return { code: invite.code }
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
  if (!code) throw new InviteError(INVITE_ERRORS.NOT_FOUND)
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

  return { code: invite.code, trialDays: Number(invite.trialDays) || DEFAULT_TRIAL_DAYS }
}
