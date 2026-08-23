// Center-crop an arbitrary image to a square favicon so browsers don't squish a
// non-square source. Fetches the picked image, crops to a centred square (cover —
// aspect ratio preserved, no distortion), uploads the PNG to the user's library,
// and returns its public URL. `position` (a sharp gravity like 'centre'/'north')
// lets the crop be nudged; pixel-level reposition can build on this later.
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { withAuth } from '../../../common/withAuth'
import { s3, BUCKET, PUBLIC_URL } from '../../../common/gcsClient'
import { getUserPhotoPath } from '../../../common/gcsUser'

const VALID_POSITIONS = new Set(['centre', 'center', 'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'])

export default withAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).end()
  const { sourceUrl, position } = req.body || {}
  if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl is required' })

  try {
    const resp = await fetch(sourceUrl)
    if (!resp.ok) return res.status(400).json({ error: 'Could not fetch the source image' })
    const input = Buffer.from(await resp.arrayBuffer())

    const gravity = VALID_POSITIONS.has(position) ? position : 'centre'
    const output = await sharp(input)
      .resize(512, 512, { fit: 'cover', position: gravity })
      .png()
      .toBuffer()

    const key = getUserPhotoPath(user.id, `library/favicon-${Date.now()}.png`)
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: output, ContentType: 'image/png' }))

    return res.status(200).json({ url: `${PUBLIC_URL}/${key}` })
  } catch (err) {
    console.error('favicon crop failed', err.message)
    return res.status(500).json({ error: 'Favicon processing failed' })
  }
})
