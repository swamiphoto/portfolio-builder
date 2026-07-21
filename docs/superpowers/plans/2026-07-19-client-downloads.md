# Client Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow clients to download web-quality and original-resolution versions of gallery photos, gated behind email identity, with photographer control via a single on/off toggle.

**Architecture:** A new same-origin proxy API route (`/api/client/download`) validates page feature flags, verifies client identity (email required), logs the download event, then fetches the file from R2 and streams it with `Content-Disposition: attachment`. Client-side download is triggered via a programmatic `<a download>` click on the same-origin proxy URL, bypassing cross-origin restrictions that would otherwise prevent the browser from saving the file. A new `DownloadSheet` bottom-sheet presents the web/full-res quality choice after identity is confirmed. The download icon appears as a third section in the existing engagement pill.

**Tech Stack:** Next.js API routes (pages router), R2 for storage, existing `clientEngagement` data store, existing `runOrPrompt` / `IdentityPrompt` identity pattern, existing `getSizedUrl` for display-size resolution.

## Global Constraints

- No new npm packages
- Follow existing sepia color tokens: `var(--card, #fdf9f4)`, `var(--text-primary, #2c2416)`, `var(--text-muted, #8a7560)`, `var(--text-secondary)`, `var(--popover-shadow, 0 8px 40px rgba(20,14,8,0.28))`
- `getSizedUrl(url, 'display')` for web quality; bare `url` for original
- Email is always required for downloads — no per-feature toggle for this
- Download icon appears in the main engagement pill only (not compact badge / review preview)
- No download counter displayed to clients (no public analytics surface)
- `R2_PUBLIC_URL` env var is the origin-validation prefix for all R2 photo URLs

---

### Task 1: Simplify Downloads Settings Panel

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js:388–407`

**Interfaces:**
- Consumes: existing `cf.downloads?.enabled`, `updateCf('downloads', {...})`
- Produces: `clientFeatures.downloads.enabled` boolean written to page config; removes old sub-fields (`quality`, `requireEmail`, `watermarkEnabled`)

- [ ] **Step 1: Replace the downloads section with a single FeatureBlock**

In `components/admin/platform/PageSettingsPopover.js`, find the Downloads `FeatureBlock` (lines 388–407) and replace the entire block — including the three quality checkboxes, the `requireEmail` Toggle, and the `watermarkEnabled` Toggle — with:

```jsx
<FeatureBlock label="Downloads" checked={cf.downloads?.enabled || false} onToggle={(v) => updateCf('downloads', { enabled: v })}>
  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
    Clients can download web and full-res versions. Email is always required.
  </p>
</FeatureBlock>
```

- [ ] **Step 2: Verify in admin UI**

Open the builder, navigate to Client Features panel on any page. The Downloads row should be a clean toggle with description text only — no quality checkboxes, no sub-toggles. Toggling it should trigger autosave (observe the debounced save indicator).

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat(downloads): simplify settings to single on/off toggle"
```

---

### Task 2: Add Downloads to Engagement Data Store

**Files:**
- Modify: `common/clientEngagement.js`

**Interfaces:**
- Produces: `LIMITS.MAX_DOWNLOADS = 10000` (exported)
- Produces: `emptyEngagement()` returns `{ people: {}, favorites: [], comments: [], submissions: [], downloads: [] }`
- Produces: `applyEngagementAction(data, { type: 'download', deviceId, ts, photoUrl, quality })` → next data with entry appended to `downloads[]`

- [ ] **Step 1: Add MAX_DOWNLOADS to LIMITS and downloads to emptyEngagement**

In `common/clientEngagement.js`:

Replace:
```js
export const LIMITS = { NAME: 100, EMAIL: 200, COMMENT: 1000, MAX_FAVORITES: 5000, MAX_COMMENTS: 2000, MAX_PEOPLE: 500, MAX_SUBMISSIONS: 200 }

export function emptyEngagement() {
  return { people: {}, favorites: [], comments: [], submissions: [] }
}
```

With:
```js
export const LIMITS = { NAME: 100, EMAIL: 200, COMMENT: 1000, MAX_FAVORITES: 5000, MAX_COMMENTS: 2000, MAX_PEOPLE: 500, MAX_SUBMISSIONS: 200, MAX_DOWNLOADS: 10000 }

export function emptyEngagement() {
  return { people: {}, favorites: [], comments: [], submissions: [], downloads: [] }
}
```

- [ ] **Step 2: Add downloads to the shallow copy at the top of applyEngagementAction**

Replace:
```js
const next = {
  people: { ...data.people },
  favorites: [...data.favorites],
  comments: [...data.comments],
  submissions: [...data.submissions],
}
```

With:
```js
const next = {
  people: { ...data.people },
  favorites: [...data.favorites],
  comments: [...data.comments],
  submissions: [...data.submissions],
  downloads: [...(data.downloads || [])],
}
```

- [ ] **Step 3: Handle 'download' action in applyEngagementAction**

Add before the final `throw bad('unknown action')`:

```js
if (type === 'download') {
  const photoUrl = String(action.photoUrl || '')
  const quality = String(action.quality || 'display')
  if (!photoUrl) throw bad('invalid photoUrl')
  if (!['display', 'original'].includes(quality)) throw bad('invalid quality')
  if (next.downloads.length >= LIMITS.MAX_DOWNLOADS) throw bad('too many downloads')
  next.downloads = [...next.downloads, { photoUrl, deviceId, quality, ts }]
  return next
}
```

- [ ] **Step 4: Commit**

```bash
git add common/clientEngagement.js
git commit -m "feat(downloads): add download event tracking to engagement data store"
```

---

### Task 3: Download Proxy API Route

**Files:**
- Create: `pages/api/client/download.js`

**Interfaces:**
- `GET /api/client/download?username=X&pageId=Y&photoUrl=<encoded>&quality=display|original&deviceId=D`
- Validates: `photoUrl` starts with `R2_PUBLIC_URL`, page has `clientFeatures.downloads.enabled`, identity has email on file
- Logs download via `applyEngagementAction` + `writeEngagement` (best-effort, does not block delivery)
- Streams file with `Content-Type` from upstream, `Content-Disposition: attachment`

- [ ] **Step 1: Create the file**

```js
// pages/api/client/download.js
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { getSizedUrl } from '../../../common/imageUtils'
import { readEngagement, writeEngagement, applyEngagementAction } from '../../../common/clientEngagement'

const R2_PREFIX = process.env.R2_PUBLIC_URL || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { username, pageId, photoUrl: rawPhotoUrl, quality, deviceId } = req.query

    if (!username || !pageId || !rawPhotoUrl || !deviceId) {
      return res.status(400).json({ error: 'Missing params' })
    }
    if (!['display', 'original'].includes(quality)) {
      return res.status(400).json({ error: 'Invalid quality' })
    }
    // Validate URL is from our storage (prevents open-proxy abuse)
    if (R2_PREFIX && !rawPhotoUrl.startsWith(R2_PREFIX)) {
      return res.status(400).json({ error: 'Invalid photo URL' })
    }

    // Resolve page + feature flag
    const lookup = await lookupUserByUsername(String(username))
    if (!lookup) return res.status(404).json({ error: 'Not found' })
    const siteConfig = await readSiteConfig(lookup.userId)
    const page = (siteConfig?.pages || []).find(p => p.id === pageId || p.slug === pageId)
    if (!page?.clientFeatures?.enabled || !page?.clientFeatures?.downloads?.enabled) {
      return res.status(403).json({ error: 'Downloads not enabled' })
    }

    // Verify identity has email (always required for downloads)
    const data = await readEngagement(lookup.userId, page.id)
    const person = data.people?.[deviceId]
    if (!person?.email) return res.status(403).json({ error: 'Email required for downloads' })

    // Log download before streaming (best-effort — doesn't block on error)
    try {
      const next = applyEngagementAction(data, {
        type: 'download', deviceId, ts: Date.now(), photoUrl: rawPhotoUrl, quality,
      })
      await writeEngagement(lookup.userId, page.id, next)
    } catch (logErr) {
      console.error('[client/download] log error', logErr)
    }

    // Resolve and fetch
    const downloadUrl = quality === 'display'
      ? (getSizedUrl(rawPhotoUrl, 'display') || rawPhotoUrl)
      : rawPhotoUrl
    const upstream = await fetch(downloadUrl)
    if (!upstream.ok) return res.status(502).json({ error: 'Could not fetch photo' })

    const buf = await upstream.arrayBuffer()
    const buffer = Buffer.from(buf)
    const ext = rawPhotoUrl.split('.').pop()?.split('?')[0] || 'jpg'
    const filename = quality === 'display' ? `photo-web.${ext}` : `photo-original.${ext}`

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Length', buffer.length)
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[client/download]', err)
    return res.status(500).json({ error: 'Download failed' })
  }
}
```

- [ ] **Step 2: Manual smoke test**

Enable downloads on a page in the admin. In the browser or `curl`, call:

```
GET http://localhost:3000/api/client/download?username=YOUR_USERNAME&pageId=PAGE_ID&photoUrl=PHOTO_URL&quality=display&deviceId=DEVICE_ID
```

With no identity/email → expect 403 `Email required for downloads`.
With downloads disabled → expect 403 `Downloads not enabled`.
With valid params → expect file download named `photo-web.jpg`.

- [ ] **Step 3: Commit**

```bash
git add pages/api/client/download.js
git commit -m "feat(downloads): proxy endpoint for gated photo download delivery"
```

---

### Task 4: Add Downloads to ClientEngagementContext

**Files:**
- Modify: `components/image-displays/engagement/ClientEngagementContext.js`

**Interfaces:**
- Produces: `ctx.features.downloads` boolean
- Produces: `ctx.username` string, `ctx.pageId` string (consumed by DownloadSheet to build proxy URL)
- Produces: `ctx.openDownload(photoUrl)` — runs identity gate, then sets `downloadUrl` state
- Produces: `ctx.downloadUrl` string | null
- Produces: `ctx.closeDownload()` fn

- [ ] **Step 1: Add features.downloads to the features useMemo**

Replace:
```js
const features = useMemo(() => ({
  favorites: !!(enabled && clientFeatures?.favorites?.enabled),
  comments: !!(enabled && clientFeatures?.comments?.enabled),
  submitWorkflow: !!(enabled && clientFeatures?.favorites?.enabled),
  watermark: !!(enabled && clientFeatures?.watermark?.enabled),
  favoritesRequireEmail: !!(enabled && clientFeatures?.favorites?.enabled),
  commentsRequireEmail: !!(enabled && clientFeatures?.comments?.enabled),
}), [enabled, clientFeatures])
```

With:
```js
const features = useMemo(() => ({
  favorites: !!(enabled && clientFeatures?.favorites?.enabled),
  comments: !!(enabled && clientFeatures?.comments?.enabled),
  submitWorkflow: !!(enabled && clientFeatures?.favorites?.enabled),
  watermark: !!(enabled && clientFeatures?.watermark?.enabled),
  favoritesRequireEmail: !!(enabled && clientFeatures?.favorites?.enabled),
  commentsRequireEmail: !!(enabled && clientFeatures?.comments?.enabled),
  downloads: !!(enabled && clientFeatures?.downloads?.enabled),
}), [enabled, clientFeatures])
```

- [ ] **Step 2: Add downloadUrl state**

After the existing `const [commentsUrl, setCommentsUrl] = useState(null)` line, add:

```js
const [downloadUrl, setDownloadUrl] = useState(null)
```

- [ ] **Step 3: Update the interactive flag to include downloads**

Replace:
```js
const interactive = features.favorites || features.comments
```

With:
```js
const interactive = features.favorites || features.comments || features.downloads
```

- [ ] **Step 4: Update needsIdentity to always require email for downloads**

Replace:
```js
const needsIdentity = useCallback((kind) => {
  if (!identity) return true
  const wantEmail = kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail
  return wantEmail && !identity.email
}, [identity, features])
```

With:
```js
const needsIdentity = useCallback((kind) => {
  if (!identity) return true
  if (kind === 'download') return !identity.email
  const wantEmail = kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail
  return wantEmail && !identity.email
}, [identity, features])
```

- [ ] **Step 5: Add openDownload, downloadUrl, closeDownload, username, pageId to ctx**

In the `ctx` useMemo object, after `openComments`:

```js
openDownload: (photoUrl) => runOrPrompt('download', () => setDownloadUrl(photoUrl)),
downloadUrl,
closeDownload: () => setDownloadUrl(null),
username,
pageId,
```

- [ ] **Step 6: Update IdentityPrompt requireEmail for download kind**

Replace:
```jsx
{pendingAction && (
  <IdentityPrompt
    requireEmail={pendingAction.kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail}
    initial={identity}
    onSave={completeIdentity}
    onCancel={() => setPendingAction(null)}
  />
)}
```

With:
```jsx
{pendingAction && (
  <IdentityPrompt
    requireEmail={
      pendingAction.kind === 'download'
        ? true
        : pendingAction.kind === 'comment'
          ? features.commentsRequireEmail
          : features.favoritesRequireEmail
    }
    initial={identity}
    onSave={completeIdentity}
    onCancel={() => setPendingAction(null)}
  />
)}
```

- [ ] **Step 7: Wire in DownloadSheet (after Task 5 creates the file)**

Add the import at the top of the file alongside the other engagement imports:
```js
import DownloadSheet from './DownloadSheet'
```

Add rendering in the provider JSX, after the `CommentsPanel` line:
```jsx
{downloadUrl && <DownloadSheet photoUrl={downloadUrl} onClose={() => setDownloadUrl(null)} />}
```

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/engagement/ClientEngagementContext.js
git commit -m "feat(downloads): add downloads feature flag, openDownload, and username/pageId to context"
```

---

### Task 5: DownloadSheet Component

**Files:**
- Create: `components/image-displays/engagement/DownloadSheet.js`

**Interfaces:**
- Consumes: `ctx.username`, `ctx.pageId`, `ctx.identity.deviceId` from `useClientEngagement()`
- Props: `{ photoUrl: string, onClose: () => void }`
- Triggers same-origin `<a download>` to `/api/client/download?...`

- [ ] **Step 1: Create the file**

```js
// components/image-displays/engagement/DownloadSheet.js
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

export default function DownloadSheet({ photoUrl, onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)

  if (!ctx?.identity) return null

  function triggerDownload(quality) {
    setLoading(quality)
    const params = new URLSearchParams({
      username: ctx.username,
      pageId: ctx.pageId,
      photoUrl,
      quality,
      deviceId: ctx.identity.deviceId,
    })
    const a = document.createElement('a')
    a.href = `/api/client/download?${params}`
    a.download = quality === 'display' ? 'photo-web.jpg' : 'photo-original.jpg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => { setLoading(null); onClose() }, 500)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(20,14,8,0.32)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card, #fdf9f4)',
          borderRadius: '16px 16px 0 0',
          boxShadow: 'var(--popover-shadow, 0 8px 40px rgba(20,14,8,0.28))',
          padding: '20px 24px 32px',
          width: '100%',
          maxWidth: 420,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 3, background: 'rgba(44,36,22,0.18)', borderRadius: 99, margin: '0 auto 20px' }} />

        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #2c2416)', marginBottom: 16 }}>
          Download photo
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { quality: 'display', label: 'Web', sub: 'Display quality' },
            { quality: 'original', label: 'Full res', sub: 'Original file' },
          ].map(({ quality, label, sub }) => (
            <button
              key={quality}
              type="button"
              disabled={!!loading}
              onClick={() => triggerDownload(quality)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: loading === quality ? 'rgba(44,36,22,0.08)' : 'rgba(44,36,22,0.04)',
                border: '1px solid rgba(44,36,22,0.10)',
                borderRadius: 10,
                cursor: loading ? 'default' : 'pointer',
                transition: 'background 0.15s ease',
                width: '100%',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #2c2416)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #8a7560)', marginTop: 2 }}>{sub}</div>
              </div>
              {loading === quality
                ? <span style={{ fontSize: 11, color: 'var(--text-muted, #8a7560)' }}>Downloading…</span>
                : <DownloadArrow />}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', padding: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--text-muted, #8a7560)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function DownloadArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--text-muted, #8a7560)', flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
```

- [ ] **Step 2: Complete Task 4 Step 7 (wire DownloadSheet into context)**

Return to `ClientEngagementContext.js` and add the import + render as described in Task 4 Step 7.

- [ ] **Step 3: Verify the sheet in browser**

Enable downloads on a page. Open as a client (no identity set). Click a photo's download icon in the pill. Verify IdentityPrompt fires (email required). Fill in name + email. Confirm DownloadSheet appears from the bottom with "Web" and "Full res" options. Click "Web" — verify browser downloads a file named `photo-web.jpg`. Click "Full res" — verify `photo-original.jpg`.

- [ ] **Step 4: Commit**

```bash
git add components/image-displays/engagement/DownloadSheet.js components/image-displays/engagement/ClientEngagementContext.js
git commit -m "feat(downloads): DownloadSheet quality picker with identity-gated download trigger"
```

---

### Task 6: Add Download Icon to Engagement Pill

**Files:**
- Modify: `components/image-displays/engagement/EngagementActions.js`

**Interfaces:**
- Consumes: `ctx.features.downloads` (boolean), `ctx.openDownload(imageUrl)` (fn from Task 4)
- Renders download icon as third pill section with dividers between each enabled section
- Review mode unchanged (badge-only, returns before sections render)

- [ ] **Step 1: Replace EngagementActions.js**

```js
// components/image-displays/engagement/EngagementActions.js
import React from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import PhotoFeedbackBadge from './PhotoFeedbackBadge'

const PILL = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(240,232,216,0.58)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  borderRadius: 999,
  boxShadow: '0 1px 5px rgba(20,14,8,0.14)',
  overflow: 'hidden',
  transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
}

const BTN = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '8px 12px',
  fontSize: 12,
  color: '#2c2416',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  lineHeight: 1,
  transition: 'background 0.15s ease',
}

function pillIn(e) {
  e.currentTarget.style.background = 'rgba(240,232,216,0.88)'
  e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,14,8,0.20)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
function pillOut(e) {
  e.currentTarget.style.background = 'rgba(240,232,216,0.58)'
  e.currentTarget.style.boxShadow = '0 1px 5px rgba(20,14,8,0.14)'
  e.currentTarget.style.transform = 'translateY(0)'
}

function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? '#c14a4a' : 'none'} stroke={filled ? '#c14a4a' : 'currentColor'} strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

const DIVIDER = <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(44,36,22,0.09)', flexShrink: 0 }} />

export default function EngagementActions({ imageUrl }) {
  const ctx = useClientEngagement()
  if (!ctx) return null

  if (ctx.mode === 'review') {
    return (
      <div data-engagement="always-visible">
        <PhotoFeedbackBadge
          favCount={ctx.favoriteCount(imageUrl)}
          commentCount={ctx.commentCount(imageUrl)}
          onOpen={() => ctx.openReview(imageUrl)}
        />
      </div>
    )
  }

  const { favorites, comments, downloads } = ctx.features
  if (!favorites && !comments && !downloads) return null

  const mine = ctx.isFavorited(imageUrl)
  const favCount = ctx.favoriteCount(imageUrl)
  const comCount = ctx.commentCount(imageUrl)
  const sections = [favorites && 'favorites', comments && 'comments', downloads && 'downloads'].filter(Boolean)

  return (
    <div style={PILL} onMouseEnter={pillIn} onMouseLeave={pillOut}>
      {sections.map((section, i) => (
        <React.Fragment key={section}>
          {i > 0 && DIVIDER}
          {section === 'favorites' && (
            <button
              type="button"
              aria-label="Favorite photo"
              onClick={(e) => { e.stopPropagation(); ctx.toggleFavorite(imageUrl) }}
              style={BTN}
            >
              <HeartIcon filled={mine} />
              {favCount > 0 && <span>{favCount}</span>}
            </button>
          )}
          {section === 'comments' && (
            <button
              type="button"
              aria-label="Comments on photo"
              onClick={(e) => { e.stopPropagation(); ctx.openComments(imageUrl) }}
              style={BTN}
            >
              <CommentIcon />
              {comCount > 0 && <span>{comCount}</span>}
            </button>
          )}
          {section === 'downloads' && (
            <button
              type="button"
              aria-label="Download photo"
              onClick={(e) => { e.stopPropagation(); ctx.openDownload(imageUrl) }}
              style={BTN}
            >
              <DownloadIcon />
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Enable all three features (favorites, comments, downloads) on a page. Open as client. The pill should show heart | divider | comment | divider | download on each photo. With only downloads enabled, the pill shows just the download icon — no dividers. In the editor preview (review mode), the pill should show the read-only badge as before — no download icon.

Test in PhotoLightbox: the pill at top-left should include the download icon (it uses the same EngagementActions component — no changes needed there).

- [ ] **Step 3: Commit**

```bash
git add components/image-displays/engagement/EngagementActions.js
git commit -m "feat(downloads): download icon in engagement pill as third section"
```
