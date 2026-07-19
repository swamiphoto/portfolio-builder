# Client Features: Favorites, Comments, Watermark — Design

Date: 2026-07-19
Status: Approved direction (flat toggles, functionality first — no lifecycle/stage presets)

## Goal

Make the existing Client Features toggles real. A photographer password-protects a gallery page, shares it with clients, and clients can heart photos and leave per-photo comments. The photographer sees activity in the sidebar bell and gets an email when a client submits their selection. A watermark toggle overlays light branding on public photos to deter screenshots of unfinished work.

Out of scope for this pass: downloads gating, purchase, photographer-to-photographer collaboration, "top picks" ranking, stage presets. All noted as future work at the end.

## Client identity ("identity-lite")

Access control stays the page password. Identity is only for attribution.

- The first time a visitor hearts or comments, an inline prompt asks for **name (required)** and **email (optional)** — copy: "So the photographer knows who this is from."
- If the feature's existing `requireEmail` toggle is on, email becomes required in that prompt.
- Identity is stored in `localStorage` per site (`sepia:client-identity:{username}`) along with a generated `deviceId` (random id). Never asked again on that device; a small "Not {name}?" affordance in the prompt-adjacent UI lets someone switch.
- Multiple clients share one password but appear as distinct people (bride, groom, parents).

## Data model

One JSON per page, written via existing R2 helpers (`uploadJSON`/`downloadJSON` in `common/gcsClient.js`):

```
users/{userId}/client-data/{pageId}.json
{
  "people":      { "<deviceId>": { "name": "Priya", "email": "p@x.com", "firstSeen": ts } },
  "favorites":   [ { "photoUrl": "...", "deviceId": "...", "ts": 123 } ],
  "comments":    [ { "id": "...", "photoUrl": "...", "deviceId": "...", "text": "...", "ts": 123 } ],
  "submissions": [ { "deviceId": "...", "count": 14, "ts": 123 } ]
}
```

- Photo identifier is the public image URL (stable; already the key of `assetsByUrl`).
- Read-modify-write on a small JSON is acceptable at client-gallery write volumes; no locking in v1.
- Comment text capped at 1000 chars; name at 100; server-side trim + validation.

## API routes

**Public** (no auth — gallery access is the password gate; server verifies the page exists and the specific feature is enabled before accepting writes):

- `GET /api/client/engagement?username={u}&pageId={p}` → `{ people: {deviceId: {name}}, favorites, comments }`. Names only — **emails are never returned on the public route**.
- `POST /api/client/engagement` → body `{ username, pageId, deviceId, action, ...payload }` where action is `identify | favorite | unfavorite | comment | submit`. `identify` upserts the person; `favorite`/`unfavorite` toggle by (photoUrl, deviceId); `comment` appends; `submit` appends a submission and, when `favorites.submitWorkflow` is on, emails the photographer via `sendMail()` (`common/email/mailer.js`) with the selected photo list. Rejects actions whose feature toggle is off (404s unknown username/pageId).

**Admin** (wrapped in `withAuth`):

- `GET /api/admin/engagement` → aggregates all `users/{userId}/client-data/*.json` into a reverse-chronological activity feed with page titles, person names + emails, and per-page favorite/comment rollups.

## Public gallery UI

- A shared `PhotoActionsOverlay` component renders on photo hover (and always-visible on touch devices via the lightbox): heart icon (filled when this device hearted it, with total count if > 0) and comment icon (with count). Rendered only when `page.clientFeatures.enabled` and the respective feature toggle is on.
- Integrated into the public photo renderers (`PhotoBlock`, masonry/stacked/grid tiles) alongside the existing buy-print hover pattern, and into `PhotoLightbox` where the icons sit in the chrome.
- Comment icon opens a small panel (lightbox side panel on desktop, bottom sheet feel on mobile) listing existing comments (name + text + relative time) with an input to add one. Comments are visible to anyone with gallery access.
- First interaction with either icon triggers the identity prompt inline; after saving, the intended action completes immediately.
- When `favorites.submitWorkflow` is on and the visitor has ≥1 heart, a floating pill shows "{n} selected · Submit favorites". Submitting confirms, records the submission, and shows a done state. Hearts remain editable after submit (client may keep refining; photographer sees new submissions).
- Engagement state loads client-side on page mount (`GET` above) so gates/SSR stay untouched; optimistic UI on toggle with rollback on failure.

## Watermark

- New page-level toggle `clientFeatures.watermark.enabled` in the Client Features panel (sits alongside Downloads/Favorites/Comments; the old `downloads.watermarkEnabled` stays for download-file watermarking later).
- When on, public photo tiles and the lightbox render a semi-transparent overlay (site logo image if `siteConfig.logo`, else `siteConfig.siteName` text, ~10–14% opacity, centered-tiled or single center mark) via CSS on top of the image. This is a screenshot deterrent, not DRM — original URLs are unchanged in v1.

## Photographer surfaces

- **Bell activity feed**: the bell in `PlatformSidebar` opens a `PopoverShell` panel fed by `/api/admin/engagement`: "Priya favorited 14 photos in Sharma Wedding", "Raj commented: 'mom wants this printed'", "Priya submitted 14 favorites". Unread badge = items newer than a `localStorage` last-seen timestamp, cleared on open.
- **Submit email**: one email per submission (subject: "{name} submitted {n} favorites — {page title}") listing thumbnails/filenames. No per-heart or per-comment emails in v1.

## Editor panel changes (PageSettingsPopover)

- Add the Watermark toggle.
- Existing Favorites (`requireEmail`, `submitWorkflow`) and Comments (`requireEmail`) toggles stay as-is and now actually drive behavior.

## Error handling

- Public POST validates username/page/feature-enabled; malformed bodies → 400; unknown page → 404; oversized text → 400.
- Client-side failures roll back optimistic state and show a quiet retry toast.
- Mailer already no-ops when SMTP is unconfigured; submission still records.

## Testing

- Unit: engagement store read/modify/write logic (toggle favorite idempotency, comment append, submission), API validation paths, public-route email redaction.
- Manual QA: full client flow on a published password-protected page (heart → identity prompt → comment → submit → bell shows activity → email attempt logged), watermark on/off, two different browsers to simulate two clients.

## Future (parked, informing this design)

- **Top picks**: clients ranking a subset of favorites ("which are the top 10?") — data model already keys by person, so ranking is an additive field.
- **Collaboration**: invite a second photographer (Google sign-in, invite-by-email role on the site); her uploads land in the owner's library tagged with an `uploadedBy` creator for filtering; peer critique reuses this same comments infra with a collaborator role before client proofing.
- **Purchase/packages**: reuses Stripe Connect from the print store; digital fulfillment = unlock file.
- **Stage presets**: optional one-tap presets over these same toggles.
