// Returns exact-duplicate fingerprints for the whole library from a single object
// listing — the R2 ETag (MD5 for single-part uploads) per photo — with NO image
// downloads. This is what makes the duplicate scan fast: gigabytes of downloads
// become one metadata call.
import { withAuth } from '@/common/withAuth'
import { listFilesWithEtags, PUBLIC_URL } from '@/common/gcsClient'
import { getUserPhotosPrefix } from '@/common/gcsUser'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  let objects
  try {
    objects = await listFilesWithEtags(getUserPhotosPrefix(user.id))
  } catch (err) {
    return res.status(502).json({ error: 'listing_failed', message: 'Could not read your library from storage.' })
  }

  // Map public URL -> etag. The photos prefix contains only originals
  // (thumbnails live under a separate /thumbnails/ prefix).
  const hashes = {}
  for (const obj of objects) {
    if (!obj.etag) continue
    hashes[`${PUBLIC_URL}/${obj.key}`] = obj.etag
  }

  return res.status(200).json({ hashes })
}

export default withAuth(handler)
