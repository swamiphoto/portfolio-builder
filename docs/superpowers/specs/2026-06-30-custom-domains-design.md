# Custom Domains — Design

**Date:** 2026-06-30
**Status:** Approved, ready for implementation plan

## Problem

The "Set up custom domain" settings panel is a single text box with placeholder
`photos.yourname.com`. It saves a bare string to `config.customDomain` and shows a
static, incorrect instruction ("Point a CNAME to `{userId}.{rootDomain}`"). Nothing is
actually wired up: the domain is never registered with the host, no SSL is provisioned,
and a request arriving on that hostname never resolves to the user's site.

We want two flows, with the guiding principle of doing as much of the work for the user
as possible:

1. **Connect a domain the user already owns** — register it with the host, hand the user
   the exact DNS record to set, then verify and provision SSL automatically.
2. **Find and buy a new domain** — let the user search availability and price in-app, then
   complete the purchase at a registrar and come back to connect it.

This feature will eventually be gated behind a payment flag. That gating is out of scope
here; we build the functionality first.

## Decisions

- **Host: Vercel.** The app already runs on Vercel. Images are served directly from R2's
  public URL with zero egress, so Vercel only ships HTML/JS/JSON — its bandwidth pricing
  is not a concern. Staying on Vercel means both flows use one provider's API.
- **Buy flow: search now, buy later (option B).** Searching uses Vercel's availability and
  price API. Each result deep-links out to a registrar to complete the purchase. In-app
  purchase (charging through Vercel's buy API behind a Stripe-backed payment flag) is a
  later drop-in: the same search results gain a "buy here" action.
- **Authoritative DNS records.** We display the exact verification records Vercel returns
  rather than computing apex-versus-subdomain records ourselves, so the displayed record is
  always correct (including edge cases like `co.uk`).

## Architecture

### Hostname → user reverse lookup

`middleware.js` today maps a subdomain of `NEXT_PUBLIC_ROOT_DOMAIN` to a username and
rewrites to `/sites/{username}`. A custom hostname like `photos.janedoe.com` carries no such
hint, so we need a reverse lookup.

We mirror the existing pointer-file convention (`usernames/{username}.json`, see
`getUsernameLookupPath`) with a new `domains/{hostname}.json` pointer in R2 containing
`{ username, userId }`. It is written when a domain is connected and deleted when it is
removed.

`middleware.js` runs in the edge runtime, where the AWS SDK is unavailable. It already
avoids R2 entirely (pure header parsing). For custom domains it performs a plain `fetch`
against R2's public URL (`${R2_PUBLIC_URL}/domains/{host}.json`), which is edge-compatible
and CDN-cached. On a hit it rewrites to `/sites/{username}`; on a miss it falls through to
today's behavior.

Middleware control flow becomes:

1. Host is a subdomain of the root domain → existing rewrite (unchanged).
2. Host is the root domain or `www` → pass through (unchanged).
3. Host is anything else (a custom domain) → fetch the domain pointer. Hit → rewrite to
   `/sites/{username}{path}`. Miss → pass through (will 404, as today).

The same path-prefix passthrough list (`/api/`, `/_next/`, `/auth/`, `/sites/`, etc.) applies
in the custom-domain branch.

### Data model

`customDomain` changes from a bare string to an object stored in
`users/{userId}/site-config.json`:

```js
customDomain: {
  name: 'photos.janedoe.com',   // the connected hostname
  status: 'pending',            // 'pending' | 'verifying' | 'active' | 'error'
  verification: [ /* DNS records Vercel returned, shown verbatim to the user */ ],
  addedAt: '2026-06-30T…',
  verifiedAt: null,
  lastError: null,
}
```

Status transitions: `pending` (added to Vercel, awaiting DNS) → `verifying` (DNS seen,
SSL provisioning) → `active` (verified, SSL live). Any failure sets `error` with
`lastError`.

**Backward compatibility.** A `normalizeCustomDomain(value)` helper accepts `null`, a legacy
string, or the object form and always returns the object form (or `null`). The two
`pages/sites/[username]` files currently read `siteConfig.customDomain` as a string when
building `siteUrl`; they switch to reading `.name` from the normalized value.

### Vercel API client — `common/vercel.js`

A thin server-side wrapper over Vercel's REST API, authenticated with `VERCEL_API_TOKEN`
and scoped to `VERCEL_PROJECT_ID` (and `VERCEL_TEAM_ID` when set). Functions:

- `addDomain(name)` — attach the domain to the project; returns Vercel's verification array.
- `getDomainStatus(name)` — fetch verification + misconfigured + SSL state; used for polling.
- `removeDomain(name)` — detach the domain from the project.
- `checkAvailability(name)` — domain availability.
- `getPrice(name)` — domain price.

In-app purchase (`buyDomain`) is intentionally omitted now; it is the single addition needed
for option A later.

All functions go through one `fetch` helper that attaches the auth header, appends the team
query param when present, and normalizes Vercel error responses into thrown errors with a
user-safe message.

### API routes — `pages/api/admin/domain/`

All routes are wrapped with the existing `withAuth` and operate on the session user's config.

- `POST connect` — body `{ name }`. Validates the hostname, calls `addDomain`, saves
  `customDomain` as `pending` with the returned records, writes the `domains/{name}.json`
  pointer, and returns the records to display. Handles the "domain already in use" conflict
  with a friendly message.
- `GET status` — calls `getDomainStatus`, updates the stored status (`pending` →
  `verifying` → `active` / `error`) and `verifiedAt`, and returns the current status plus
  records. Called by the UI on a poll while a domain is not yet active.
- `DELETE` (index route) — calls `removeDomain`, clears `customDomain`, and deletes the
  pointer file.
- `GET search?q=` — runs `checkAvailability` + `getPrice` for the query across a small TLD
  set (`.com`, `.photo`, `.studio`, plus the exact query if it already has a TLD). Returns
  results `{ domain, available, price, registrarUrl }`, where `registrarUrl` is a deep-link
  to the configured registrar (optionally with an affiliate code).

### UI — `SiteSettingsPopover` domain drill-in

The single input is replaced by two sections within the existing `domain` drill view.

**Connect a domain you own.**
- Hostname input + connect button (calls `POST connect`).
- Once connected: the DNS records from Vercel, each with a copy-to-clipboard control, and a
  short "add this at your DNS provider" line.
- A live status badge — "Pending DNS" → "Verifying" → "Active" with a lock icon — driven by
  polling `GET status` every few seconds until `active` (then polling stops).
- A "Remove domain" control (calls `DELETE`).

**Find a new domain.**
- Search input (calls `GET search`).
- Results list: domain, price, an Available/Taken state. Available results show a "Get it"
  button that opens `registrarUrl` in a new tab.
- A note: "After you buy it, come back and connect it above."

## Error handling

- Vercel client normalizes API failures into thrown errors carrying a user-safe message;
  routes catch and return a clean status + message.
- `connect` surfaces the "domain already attached to another project/user" conflict
  explicitly rather than as a generic failure.
- `DELETE` cleans up all three places (Vercel, config, pointer) and tolerates a missing
  pointer.
- Middleware tolerates a failed or 404 pointer fetch by falling through rather than throwing.

## Testing

- **Vercel client**: unit tests with mocked `fetch` for each function, including the team
  query param and error normalization.
- **API routes**: `connect`, `status`, `DELETE`, and `search` with the Vercel client and R2
  mocked — asserting config writes, pointer writes/deletes, status transitions, and the
  conflict path.
- **Normalization**: `normalizeCustomDomain` for `null`, legacy string, and object inputs.
- **Middleware**: custom-domain host with a pointer hit rewrites to `/sites/{username}`;
  pointer miss falls through; subdomain and root-domain behavior unchanged.

## Prerequisites

Environment variables to add: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, optional
`VERCEL_TEAM_ID`, and a registrar deep-link base (plus optional affiliate code). The Vercel
domain must also be added to the Vercel project's allowed domains via the API at connect
time, which the token must have permission to do.

## Out of scope

- In-app domain purchase (option A) and the Stripe billing it depends on.
- The payment-flag gating that will eventually wrap this feature.
- Domain transfer (moving the registrar itself to Vercel); we connect via DNS, which does not
  require a transfer.
