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
