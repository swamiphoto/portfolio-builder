// pages/api/admin/print/upload-master.js
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET, PUBLIC_URL, downloadJSON, uploadJSON } from '../../../../common/gcsClient'
import { getUserPrintMasterPath, getUserLibraryConfigPath } from '../../../../common/gcsUser'
import { normalizeLibraryConfig } from '../../../../common/adminConfig'
import {
  readSiteConfig,
  createDefaultSiteConfig,
  normalizePrintStore,
} from '../../../../common/siteConfig'
import { SEED_CATALOG } from '../../../../common/fulfillment/seedCatalog'
import { resolveSellableAsset } from '../../../../common/print/sellAsset'
import { withAuth } from '../../../../common/withAuth'

export const config = { api: { bodyParser: false } }

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { assetId, filename, contentType } = req.query
  if (!assetId || !filename || !contentType) {
    return res.status(400).json({ error: 'assetId, filename, contentType required' })
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = getUserPrintMasterPath(user.id, safeName)

  let width = null, height = null
  try {
    const meta = await sharp(buffer).metadata()
    width = meta.width
    height = meta.height
  } catch (err) {
    return res.status(400).json({ error: 'unreadable image file' })
  }

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }))

  const library = normalizeLibraryConfig(await downloadJSON(getUserLibraryConfigPath(user.id)), [])
  const asset = library.assets[assetId]
  if (!asset) return res.status(404).json({ error: 'asset not found' })

  const site = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
  const withMaster = {
    ...asset,
    print: { ...(asset.print || {}), masterStorageKey: key, masterWidth: width, masterHeight: height },
  }
  const { print, priceMatrix } = resolveSellableAsset(withMaster, SEED_CATALOG, site.printStore.markup, true)
  library.assets[assetId] = { ...withMaster, print, forSale: print.sellable }
  await uploadJSON(getUserLibraryConfigPath(user.id), library)

  return res.status(200).json({ print, priceMatrix })
}

export default withAuth(handler)
