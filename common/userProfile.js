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
 * Claims a username for a userId. Throws if taken by a different user.
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
