import fetch from 'node-fetch'
import { slugify } from '../importCore'

export const PROVIDER_ID = 'smugmug'

function normalize(input) {
  const s = String(input || '').trim()
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

function nicknameFromUrl(input) {
  const u = new URL(normalize(input))
  const sub = u.hostname.split('.')[0]
  if (sub && sub !== 'www' && u.hostname.endsWith('smugmug.com')) return sub
  const seg = u.pathname.split('/').filter(Boolean)[0]
  return seg || sub
}

async function httpFetchJson(path) {
  const key = process.env.SMUGMUG_API_KEY
  if (!key) throw new Error('SMUGMUG_API_KEY not configured')
  const sep = path.includes('?') ? '&' : '?'
  const url = `https://api.smugmug.com${path}${sep}APIKey=${key}&_accept=application%2Fjson`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`SmugMug HTTP ${res.status}`)
  return res.json()
}

async function discover(input, { fetchJson = httpFetchJson } = {}) {
  const nickname = nicknameFromUrl(input)
  const albumsResp = await fetchJson(`/api/v2/user/${nickname}!albums`)
  const albums = albumsResp?.Response?.Album || []

  const collections = []
  for (const album of albums) {
    const imagesUri = album?.Uris?.AlbumImages?.Uri
    if (!imagesUri) continue
    const imgResp = await fetchJson(imagesUri)
    const images = imgResp?.Response?.AlbumImage || []
    const assetRefs = images
      .map((img) => {
        const remoteUrl = img.ArchivedUri || img.WebUri || null
        if (!remoteUrl) return null
        return { remoteUrl, caption: img.Caption ? String(img.Caption) : null }
      })
      .filter(Boolean)
    if (assetRefs.length) {
      collections.push({ id: album.AlbumKey, name: album.Name || album.AlbumKey, remoteUrl: imagesUri, assetRefs })
    }
  }

  return {
    site: { title: nickname, url: normalize(input) },
    collections,
    siteMap: {
      pages: collections.map((c, i) => ({
        kind: 'gallery',
        title: c.name,
        slug: slugify(c.name) || c.id.toLowerCase(),
        navOrder: i,
        sourceUrl: c.remoteUrl,
        textContent: '',
        collectionId: c.id,
      })),
    },
  }
}

const smugmug = {
  id: PROVIDER_ID,
  label: 'SmugMug',
  icon: 'smugmug',
  enabled: true,
  detect(input) {
    try {
      return /(^|\.)smugmug\.com$/i.test(new URL(normalize(input)).hostname)
    } catch {
      return false
    }
  },
  discover,
}
export default smugmug
