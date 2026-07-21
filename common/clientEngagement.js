// Per-page client engagement (favorites, comments, submissions) stored as one
// JSON per page in R2. applyEngagementAction is a pure reducer so validation
// and shape logic are testable without I/O. Read-modify-write is unlocked —
// acceptable at client-gallery volumes.
import { downloadJSON, uploadJSON } from './gcsClient'

export const LIMITS = { NAME: 100, EMAIL: 200, COMMENT: 1000, MAX_FAVORITES: 5000, MAX_COMMENTS: 2000, MAX_PEOPLE: 500, MAX_SUBMISSIONS: 200, MAX_DOWNLOADS: 10000 }

export function getClientDataPath(userId, pageId) {
  return `users/${userId}/client-data/${pageId}.json`
}

export function emptyEngagement() {
  return { people: {}, favorites: [], comments: [], submissions: [], downloads: [] }
}

function bad(message) {
  const err = new Error(message)
  err.status = 400
  return err
}

export function applyEngagementAction(data, action) {
  const { type, deviceId, ts } = action || {}
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) throw bad('invalid deviceId')
  if (typeof ts !== 'number') throw bad('invalid ts')

  const next = {
    people: { ...data.people },
    favorites: [...data.favorites],
    comments: [...data.comments],
    submissions: [...data.submissions],
    downloads: [...(data.downloads || [])],
  }

  if (type === 'identify') {
    const name = String(action.name || '').trim()
    const email = String(action.email || '').trim()
    if (!name || name.length > LIMITS.NAME) throw bad('invalid name')
    if (email.length > LIMITS.EMAIL) throw bad('invalid email')
    const existing = next.people[deviceId]
    if (!existing && Object.keys(next.people).length >= LIMITS.MAX_PEOPLE) throw bad('too many people')
    next.people[deviceId] = { name, email, firstSeen: existing?.firstSeen ?? ts }
    return next
  }

  if (type === 'favorite' || type === 'unfavorite') {
    const photoUrl = String(action.photoUrl || '')
    if (!photoUrl) throw bad('invalid photoUrl')
    const has = next.favorites.some(f => f.photoUrl === photoUrl && f.deviceId === deviceId)
    if (type === 'favorite') {
      if (next.favorites.length >= LIMITS.MAX_FAVORITES) throw bad('too many favorites')
      if (!has) next.favorites.push({ photoUrl, deviceId, ts })
    } else {
      next.favorites = next.favorites.filter(f => !(f.photoUrl === photoUrl && f.deviceId === deviceId))
    }
    return next
  }

  if (type === 'comment') {
    const photoUrl = String(action.photoUrl || '')
    const text = String(action.text || '').trim()
    if (!photoUrl) throw bad('invalid photoUrl')
    if (!text || text.length > LIMITS.COMMENT) throw bad('invalid comment')
    if (next.comments.length >= LIMITS.MAX_COMMENTS) throw bad('too many comments')
    const id = `c_${ts}_${Math.random().toString(36).slice(2, 8)}`
    next.comments.push({ id, photoUrl, deviceId, text, ts })
    return next
  }

  if (type === 'submit') {
    if (next.submissions.length >= LIMITS.MAX_SUBMISSIONS) throw bad('too many submissions')
    const count = next.favorites.filter(f => f.deviceId === deviceId).length
    next.submissions.push({ deviceId, ts, count })
    return next
  }

  if (type === 'download') {
    const photoUrl = String(action.photoUrl || '')
    const quality = String(action.quality || 'display')
    if (!photoUrl) throw bad('invalid photoUrl')
    if (!['display', 'original'].includes(quality)) throw bad('invalid quality')
    if (next.downloads.length >= LIMITS.MAX_DOWNLOADS) throw bad('too many downloads')
    next.downloads = [...next.downloads, { photoUrl, deviceId, quality, ts }]
    return next
  }

  throw bad('unknown action')
}

export async function readEngagement(userId, pageId) {
  try {
    const data = await downloadJSON(getClientDataPath(userId, pageId))
    return {
      people: data?.people && typeof data.people === 'object' && !Array.isArray(data.people) ? data.people : {},
      favorites: Array.isArray(data?.favorites) ? data.favorites : [],
      comments: Array.isArray(data?.comments) ? data.comments : [],
      submissions: Array.isArray(data?.submissions) ? data.submissions : [],
      downloads: Array.isArray(data?.downloads) ? data.downloads : [],
    }
  } catch {
    return emptyEngagement()
  }
}

export async function writeEngagement(userId, pageId, data) {
  await uploadJSON(getClientDataPath(userId, pageId), data)
}

// Aggregate one page's engagement into a per-photoUrl map, resolving deviceId → name.
// favBy is deduped by deviceId (first-seen order by ts); comments are chronological.
export function aggregateByPhoto(data) {
  const nameOf = (deviceId) => data.people?.[deviceId]?.name || 'Someone'
  const map = {}
  const ensure = (url) => (map[url] ||= { favBy: [], favCount: 0, comments: [], commentCount: 0 })
  const seenFav = {} // url -> Set(deviceId)

  for (const f of [...(data.favorites || [])].sort((a, b) => a.ts - b.ts)) {
    const entry = ensure(f.photoUrl)
    const set = (seenFav[f.photoUrl] ||= new Set())
    if (set.has(f.deviceId)) continue
    set.add(f.deviceId)
    entry.favBy.push(nameOf(f.deviceId))
    entry.favCount = entry.favBy.length
  }

  for (const c of [...(data.comments || [])].sort((a, b) => a.ts - b.ts)) {
    const entry = ensure(c.photoUrl)
    entry.comments.push({ id: c.id, name: nameOf(c.deviceId), text: c.text, ts: c.ts })
    entry.commentCount = entry.comments.length
  }

  return map
}

export function lastActivityTs(data) {
  let max = 0
  for (const list of [data.favorites, data.comments, data.submissions]) {
    for (const item of list || []) if (item.ts > max) max = item.ts
  }
  return max
}

export function hasFeedback(data) {
  return (data.favorites?.length || 0) > 0 || (data.comments?.length || 0) > 0
}
