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
