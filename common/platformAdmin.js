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
