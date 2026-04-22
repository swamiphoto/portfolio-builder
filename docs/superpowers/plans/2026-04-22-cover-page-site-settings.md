# Cover Page Site Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move cover page configuration into Site Settings (toggle + drill-in), remove Cover from the sidebar, and add an "initial page" designation so the cover button auto-wires to the right destination.

**Architecture:** `siteConfig.cover` (heading, subheading, buttonText, imageUrl, height, buttonStyle) and `siteConfig.initialPageId` are new top-level fields. The SiteSettingsPopover gains a toggle "Include a cover page" and, when on, a "Cover page →" chevron row leading to a drill-in with those fields. PlatformSidebar loses the Cover pinned entry; instead, pages in Main Nav get a "Set as initial page" option in their 3-dot menu. The public home page renders a full-screen cover from `siteConfig.cover` (no Gallery below). The admin preview switches to the home page when entering the cover drill-in.

**Tech Stack:** Next.js (pages router), React, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `common/siteConfig.js` | Add `cover` object and `initialPageId` to `createDefaultSiteConfig` |
| `__tests__/common/siteConfig.test.js` | Add assertions for new fields |
| `components/image-displays/page/PageCover.js` | Add `primaryButton` prop |
| `components/admin/platform/SiteSettingsPopover.js` | Toggle + cover drill-in, `onPickCoverImage`, `onViewCover` |
| `components/admin/platform/PlatformSidebar.js` | Remove Cover section + auto-insert effect; add initial page setter; thread `onViewCover` |
| `pages/admin/index.js` | Thread `onViewCover`; cover admin preview; thread `onPickCoverImage` |
| `pages/sites/[username]/index.js` | Render cover from `siteConfig.cover` when `hasCoverPage` is true |

---

## Task 1: siteConfig data model — add cover + initialPageId

**Files:**
- Modify: `common/siteConfig.js`
- Modify: `__tests__/common/siteConfig.test.js`

- [ ] **Step 1: Add `cover` and `initialPageId` to `createDefaultSiteConfig`**

In `common/siteConfig.js`, inside `createDefaultSiteConfig`, add after `logoType: 'sitename'`:

```js
cover: {
  heading: '',
  subheading: '',
  buttonText: 'View my portfolio',
  imageUrl: '',
  height: 'full',
  buttonStyle: 'solid',
},
initialPageId: null,
```

Full updated `createDefaultSiteConfig` return (show only the changed section):
```js
export function createDefaultSiteConfig(userId) {
  return {
    userId,
    siteName: 'My Portfolio',
    slug: '',
    hasCoverPage: true,
    customDomain: null,
    tagline: '',
    logoType: 'sitename',
    logo: '',
    favicon: '',
    cover: {
      heading: '',
      subheading: '',
      buttonText: 'View my portfolio',
      imageUrl: '',
      height: 'full',
      buttonStyle: 'solid',
    },
    initialPageId: null,
    design: {
      theme: 'minimal-light',
      navStyle: 'minimal',
      subNavStyle: 'dropdown',
      footerLayout: 'standard',
    },
    contact: {
      email: '',
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      website: '',
    },
    footer: {
      customText: `© ${new Date().getFullYear()} My Portfolio`,
    },
    analytics: {
      googleId: '',
      plausibleDomain: '',
    },
    clientDefaults: {
      notificationEmail: '',
      defaultCurrency: 'USD',
      defaultWatermarkUrl: '',
    },
    publishedAt: null,
    pages: [
      defaultPage({ id: 'home', title: 'Home', showInNav: false }),
    ],
  }
}
```

- [ ] **Step 2: Add test assertions for new fields**

In `__tests__/common/siteConfig.test.js`, inside `describe('createDefaultSiteConfig')`, add a new `it` block after the existing ones:

```js
it('includes cover config and initialPageId', () => {
  const config = createDefaultSiteConfig('user-123')
  expect(config.cover).toEqual({
    heading: '',
    subheading: '',
    buttonText: 'View my portfolio',
    imageUrl: '',
    height: 'full',
    buttonStyle: 'solid',
  })
  expect(config.initialPageId).toBeNull()
  expect(config.hasCoverPage).toBe(true)
})
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/siteConfig.test.js --no-coverage 2>&1 | tail -20
```

Expected: all tests pass (including the new one).

- [ ] **Step 4: Commit**

```bash
git add common/siteConfig.js __tests__/common/siteConfig.test.js
git commit -m "feat: add siteConfig.cover and initialPageId to data model"
```

---

## Task 2: PageCover — add primaryButton prop

**Files:**
- Modify: `components/image-displays/page/PageCover.js`

- [ ] **Step 1: Add `primaryButton` prop and prepend to buttons array**

Replace the current `PageCover` signature and buttons logic:

```jsx
export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'
  const buttonStyle = cover.buttonStyle || 'solid'

  const buttons = []
  if (primaryButton?.label) buttons.push(primaryButton)
  if (slideshowHref) buttons.push({ label: 'Start Slideshow', href: slideshowHref })
  if (clientFeaturesEnabled) buttons.push({ label: 'Client Login', href: '#client-login' })

  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {isCover && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      {isCover && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
          {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h2>}
          {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-8">{description}</p>}
          {buttons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {buttons.map((btn, i) => (
                <CtaButton key={i} label={btn.label} href={btn.href} style={buttonStyle} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/image-displays/page/PageCover.js
git commit -m "feat: add primaryButton prop to PageCover"
```

---

## Task 3: SiteSettingsPopover — toggle + cover drill-in

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js`

### Context

The file currently has:
- Props: `{ siteConfig, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon }`
- View state: `'main' | 'domain' | 'analytics' | 'payments'`
- A toggle row for `hasCoverPage` with label "Cover page" (recently added)
- `update(patch)` merges into config

### Changes

- [ ] **Step 1: Add props and helper**

Update the component signature to add `onPickCoverImage` and `onViewCover`:

```jsx
export default function SiteSettingsPopover({ siteConfig, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon, onPickCoverImage, onViewCover }) {
```

Add `updateCover` helper alongside the other update helpers (after `updateFooter`):

```jsx
function updateCover(patch) {
  update({ cover: { ...(config.cover || {}), ...patch } })
}
```

- [ ] **Step 2: Add cover drill-in view**

Add the following block **before** the `// ── Main view` section (alongside the other `if (view === ...)` blocks):

```jsx
// ── Cover page drill-in ───────────────────────────────────────────────────
if (view === 'cover') {
  const cover = config.cover || {}
  const [coverDesignOpen, setCoverDesignOpen] = useState(false)
  const coverBrushRef = useRef(null)

  const coverBrushButton = (
    <button
      ref={coverBrushRef}
      type="button"
      onClick={() => setCoverDesignOpen(v => !v)}
      className="text-stone-400 hover:text-stone-700 transition-colors"
      title="Cover design"
    >
      <BrushIcon />
    </button>
  )

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings" headerRight={coverBrushButton}>
      <DrillHeader label="Cover page" onBack={() => setView('main')} />
      <div className="px-3 py-3 space-y-3">
        <AssetField
          label="Background image"
          value={cover.imageUrl || ''}
          onChange={(v) => updateCover({ imageUrl: v })}
          onPickFromLibrary={onPickCoverImage}
          contain={false}
        />
        <Field label="Heading">
          <input
            className={inputCls}
            placeholder={config.siteName || 'My Portfolio'}
            value={cover.heading || ''}
            onChange={(e) => updateCover({ heading: e.target.value })}
          />
        </Field>
        <Field label="Subheading">
          <input
            className={inputCls}
            placeholder={config.tagline || 'Short description'}
            value={cover.subheading || ''}
            onChange={(e) => updateCover({ subheading: e.target.value })}
          />
        </Field>
        <Field label="Button text">
          <input
            className={inputCls}
            placeholder="View my portfolio"
            value={cover.buttonText || ''}
            onChange={(e) => updateCover({ buttonText: e.target.value })}
          />
        </Field>
      </div>
      {coverDesignOpen && (
        <PopoverShell anchorEl={coverBrushRef.current} onClose={() => setCoverDesignOpen(false)} width={220} title="Cover Design">
          <div className="px-3 py-3">
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">Button Style</div>
            <div className="flex items-center gap-1.5">
              {[
                { value: 'solid',   label: 'Solid'   },
                { value: 'outline', label: 'Outline' },
                { value: 'ghost',   label: 'Ghost'   },
              ].map(({ value, label }) => {
                const active = (cover.buttonStyle || 'solid') === value
                return (
                  <button key={value} type="button"
                    onClick={() => updateCover({ buttonStyle: value })}
                    className={`px-2.5 py-0.5 text-xs border transition-colors ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </PopoverShell>
      )}
    </PopoverShell>
  )
}
```

**Important:** `useState` and `useRef` inside a conditional block is illegal in React. To fix this, the `coverDesignOpen` state and `coverBrushRef` must be moved to the top of the component alongside the other state declarations:

At the top of the component (after the existing `const [designOpen, setDesignOpen] = useState(false)` line), add:

```jsx
const [coverDesignOpen, setCoverDesignOpen] = useState(false)
const coverBrushRef = useRef(null)
```

Then remove those two lines from inside the `view === 'cover'` block, since they're now declared at the top.

- [ ] **Step 3: Replace the hasCoverPage toggle in the main view**

Find the existing cover page toggle section in the main view:

```jsx
{/* Cover page toggle */}
<div className="px-3 py-2.5 flex items-center border-b border-stone-100">
  <button
    type="button"
    onClick={() => update({ hasCoverPage: config.hasCoverPage === false })}
    className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${config.hasCoverPage !== false ? 'bg-stone-700' : 'bg-stone-300'}`}
  >
    <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${config.hasCoverPage !== false ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
  </button>
  <span className="ml-2 text-xs text-stone-700 select-none">Cover page</span>
</div>
```

Replace with:

```jsx
{/* Cover page toggle + drill-in */}
<div className="flex items-center px-3 py-2.5 border-b border-stone-100">
  <button
    type="button"
    onClick={() => update({ hasCoverPage: config.hasCoverPage === false })}
    className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${config.hasCoverPage !== false ? 'bg-stone-700' : 'bg-stone-300'}`}
  >
    <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${config.hasCoverPage !== false ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
  </button>
  <span className="ml-2 text-xs text-stone-700 flex-1 select-none">Include a cover page</span>
</div>
{config.hasCoverPage !== false && (
  <DrillRow
    label="Cover page"
    onDrillIn={() => { setView('cover'); onViewCover?.() }}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat: add cover page drill-in to SiteSettingsPopover"
```

---

## Task 4: PlatformSidebar — remove Cover, add initial page setter, thread callbacks

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

### Changes

- [ ] **Step 1: Remove Cover pinned section**

Remove the entire Cover pinned entry block (from `{/* Cover pinned entry — maps to home page */}` through the closing `)()`):

```jsx
{/* Cover pinned entry — maps to home page */}
{siteConfig.hasCoverPage !== false && (() => {
  const coverPage = pages.find(p => p.id === 'home')
  if (!coverPage) return null
  ...
})()}
```

Delete all of it.

- [ ] **Step 2: Remove the auto-insert useEffect**

Remove the useEffect block that was added to auto-insert the home page:

```jsx
useEffect(() => {
  if (siteConfig.hasCoverPage === false) return
  if (siteConfig.pages?.find(p => p.id === 'home')) return
  onConfigChange(prev => ({
    ...prev,
    pages: [defaultPage({ id: 'home', title: 'Home', showInNav: false }), ...(prev.pages || [])],
  }))
}, [siteConfig.hasCoverPage, siteConfig.pages, onConfigChange])
```

Delete all of it.

- [ ] **Step 3: Add `onViewCover` to props and thread to SiteSettingsPopover**

Update the component props to add `onViewCover`:

```jsx
export default function PlatformSidebar({
  siteConfig,
  saveStatus,
  onConfigChange,
  onSignOut,
  selectedPageId,
  onSelectPage,
  onShowLibrary,
  username,
  email,
  onDropImagesToPage,
  onPickThumbnail,
  assetsByUrl,
  onPickLogo,
  onPickFavicon,
  onPickCoverImage,
  onViewCover,
}) {
```

Find where `SiteSettingsPopover` is rendered (search for `<SiteSettingsPopover`) and add the two new props:

```jsx
<SiteSettingsPopover
  siteConfig={siteConfig}
  anchorEl={siteSettingsGearRef.current}
  onUpdate={onConfigChange}
  onClose={() => setSiteSettingsOpen(false)}
  onPickLogo={onPickLogo}
  onPickFavicon={onPickFavicon}
  onPickCoverImage={onPickCoverImage}
  onViewCover={onViewCover}
/>
```

- [ ] **Step 4: Add initial page indicator to page rows**

In `renderPageRow`, find the line that renders the page title:

```jsx
<span className="flex-1 truncate">{page.title}</span>
```

Replace with:

```jsx
<span className="flex-1 truncate">{page.title}</span>
{siteConfig.initialPageId === page.id && (
  <span className="text-[9px] text-stone-400 uppercase tracking-wider flex-shrink-0 mr-1">Start</span>
)}
```

- [ ] **Step 5: Add "Set as initial page" to the 3-dot menu**

Find the 3-dot context menu (the `menuOpenId === page.id` block):

```jsx
{menuOpenId === page.id && (
  <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-lg shadow-popup py-1 w-32">
    <button onClick={() => handleRenameStart(page)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Rename</button>
    <button onClick={() => { setMenuOpenId(null); handleDelete(page.id) }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
  </div>
)}
```

Replace with:

```jsx
{menuOpenId === page.id && (
  <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-lg shadow-popup py-1 w-40">
    <button onClick={() => handleRenameStart(page)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Rename</button>
    {page.showInNav && page.type !== 'link' && (
      <button
        onClick={() => {
          setMenuOpenId(null)
          onConfigChange(prev => ({ ...prev, initialPageId: prev.initialPageId === page.id ? null : page.id }))
        }}
        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        {siteConfig.initialPageId === page.id ? 'Unset initial page' : 'Set as initial page'}
      </button>
    )}
    <button onClick={() => { setMenuOpenId(null); handleDelete(page.id) }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat: remove Cover sidebar entry, add initial page setter, thread cover callbacks"
```

---

## Task 5: admin/index.js — thread callbacks and cover admin preview

**Files:**
- Modify: `pages/admin/index.js`

### Changes

- [ ] **Step 1: Add `assetPickerTarget` support for `coverImage`**

The existing `handleAssetPickerConfirm` already handles `logo` and `favicon` targets via `updateConfig(prev => ({ ...prev, [assetPickerTarget]: refs[0].url }))`. But `coverImage` writes to `siteConfig.cover.imageUrl`, not a top-level field.

Update `handleAssetPickerConfirm`:

```jsx
const handleAssetPickerConfirm = useCallback((refs) => {
  if (!assetPickerTarget || !refs.length) return
  if (assetPickerTarget === 'coverImage') {
    updateConfig(prev => ({ ...prev, cover: { ...(prev.cover || {}), imageUrl: refs[0].url } }))
  } else {
    updateConfig(prev => ({ ...prev, [assetPickerTarget]: refs[0].url }))
  }
  setAssetPickerTarget(null)
}, [assetPickerTarget, updateConfig])
```

- [ ] **Step 2: Add `handleViewCover` callback**

After the `handleAssetPickerConfirm` definition, add:

```jsx
const handleViewCover = useCallback(() => {
  setSelectedPageId(
    siteConfig?.pages?.find(p => p.id === 'home')?.id || null
  )
  setShowLibrary(false)
}, [siteConfig])
```

- [ ] **Step 3: Pass new props to PlatformSidebar**

Find the `PlatformSidebar` JSX and add two props:

```jsx
onPickCoverImage={() => setAssetPickerTarget('coverImage')}
onViewCover={handleViewCover}
```

The full updated PlatformSidebar call:

```jsx
const sidebar = (
  <PlatformSidebar
    siteConfig={siteConfig}
    saveStatus={saveStatus}
    onConfigChange={updateConfig}
    onSignOut={() => signOut({ callbackUrl: '/auth/signin' })}
    selectedPageId={selectedPageId}
    onSelectPage={handleSelectPage}
    onShowLibrary={() => { setShowLibrary(true); setSelectedPageId(null) }}
    libraryActive={showLibrary}
    username={session?.user?.username}
    email={session?.user?.email}
    onDropImagesToPage={handleDropImagesToPage}
    onPickThumbnail={handlePickThumbnail}
    assetsByUrl={assetsByUrl}
    onPickLogo={() => setAssetPickerTarget('logo')}
    onPickFavicon={() => setAssetPickerTarget('favicon')}
    onPickCoverImage={() => setAssetPickerTarget('coverImage')}
    onViewCover={handleViewCover}
  />
)
```

- [ ] **Step 4: Update PageCover in the admin preview for the home page**

Find the `<PageCover` usage in the admin content area (inside the `else` branch that renders the page preview). It currently receives `cover={selectedPage.cover}`, `title={selectedPage.title}`, etc.

Update it to use `siteConfig.cover` when the selected page is the home cover page:

```jsx
const isCoverPage = selectedPage.id === 'home' && siteConfig.hasCoverPage !== false
const coverProps = isCoverPage
  ? {
      cover: {
        imageUrl: siteConfig.cover?.imageUrl || '',
        height: siteConfig.cover?.height || 'full',
        variant: 'cover',
        buttonStyle: siteConfig.cover?.buttonStyle || 'solid',
      },
      title: siteConfig.cover?.heading || siteConfig.siteName || '',
      description: siteConfig.cover?.subheading || siteConfig.tagline || '',
      primaryButton: {
        label: siteConfig.cover?.buttonText || 'View my portfolio',
        href: '#',
      },
    }
  : {
      cover: selectedPage.cover,
      title: selectedPage.title,
      description: selectedPage.description,
      primaryButton: null,
    }

const slideshowHref = (selectedPage.slideshow?.enabled && username)
  ? `/sites/${username}/${selectedPage.slug || selectedPage.id}/slideshow`
  : null
```

Then update the `<PageCover` usage:

```jsx
<PageCover
  cover={coverProps.cover}
  title={coverProps.title}
  description={coverProps.description}
  slideshowHref={isCoverPage ? null : slideshowHref}
  clientFeaturesEnabled={isCoverPage ? false : !!selectedPage.clientFeatures?.enabled}
  primaryButton={coverProps.primaryButton}
/>
```

The `slideshowHref` variable is still used for the `GalleryPreview` `enableSlideshow` prop when not on the cover page — keep that reference.

- [ ] **Step 5: Commit**

```bash
git add pages/admin/index.js
git commit -m "feat: thread cover image picker and cover preview into admin"
```

---

## Task 6: Public home page — render from siteConfig.cover

**Files:**
- Modify: `pages/sites/[username]/index.js`

### Context

Currently `pages/sites/[username]/index.js` finds the home page entity and passes its `cover`, `title`, and `description` to `PageCover`, then renders a `Gallery` below. With cover pages, the home should render the cover full-screen with no gallery below.

- [ ] **Step 1: Derive initialPage and cover props from siteConfig**

In `PublicPortfolio` component, after the `const homePage = ...` line, add:

```jsx
const hasCoverPage = siteConfig.hasCoverPage !== false
const coverConfig = siteConfig.cover || {}
const initialPage = hasCoverPage && siteConfig.initialPageId
  ? siteConfig.pages?.find(p => p.id === siteConfig.initialPageId)
  : null
const initialPageHref = initialPage ? `/sites/${username}/${initialPage.slug || initialPage.id}` : null
```

- [ ] **Step 2: Render cover-only view when hasCoverPage is true**

Replace the current return statement with:

```jsx
if (hasCoverPage) {
  return (
    <div className="min-h-screen bg-black font-sans relative">
      <PageCover
        cover={{
          imageUrl: coverConfig.imageUrl || '',
          height: coverConfig.height || 'full',
          variant: 'cover',
          buttonStyle: coverConfig.buttonStyle || 'solid',
        }}
        title={coverConfig.heading || siteConfig.siteName || ''}
        description={coverConfig.subheading || siteConfig.tagline || ''}
        primaryButton={initialPageHref ? { label: coverConfig.buttonText || 'View my portfolio', href: initialPageHref } : null}
        slideshowHref={null}
        clientFeaturesEnabled={false}
      />
    </div>
  )
}
```

Then keep the existing return (with `SiteNav` + `Gallery`) as the fallback for `hasCoverPage: false`:

```jsx
const resolvedBlocks = (homePage?.blocks || []).map(block => resolveBlock(block, assetsByUrl))
const navVariant = homePage?.cover?.imageUrl ? undefined : 'header-dropdown'
const slideshowHref = homePage?.slideshow?.enabled ? `/sites/${username}/${homePage.slug || homePage.id}/slideshow` : null

return (
  <div className="min-h-screen bg-white font-sans relative">
    <SiteNav siteConfig={siteConfig} username={username} variant={navVariant} />
    <main>
      <PageCover
        cover={homePage?.cover}
        title={homePage?.title}
        description={homePage?.description}
        slideshowHref={slideshowHref}
        clientFeaturesEnabled={!!homePage?.clientFeatures?.enabled}
        primaryButton={null}
      />
      {homePage ? (
        <Gallery
          name={homePage.title}
          description={homePage.description}
          blocks={resolvedBlocks}
          pages={siteConfig.pages}
          enableSlideshow={!!slideshowHref}
          onSlideshowClick={() => { if (slideshowHref) window.location.href = slideshowHref }}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">
          No content yet.
        </div>
      )}
    </main>
  </div>
)
```

- [ ] **Step 3: Commit**

```bash
git add pages/sites/[username]/index.js
git commit -m "feat: render public home page from siteConfig.cover when hasCoverPage is true"
```

---

## Self-Review

**Spec coverage:**
- ✅ Toggle "Include a cover page" — Task 3
- ✅ Chevron "Cover page →" when toggle is on — Task 3
- ✅ Drill-in: heading, subheading, button text — Task 3
- ✅ Logo shown above (heading/subheading display the site identity) — heading/subheading pre-populated from siteName/tagline
- ✅ Button text configurable, defaults to "View my portfolio" — Task 1, Task 3
- ✅ Brush icon for cover design (buttonStyle) — Task 3
- ✅ Cover removed from sidebar — Task 4
- ✅ Initial page designation in Main Nav — Task 4
- ✅ Cover button auto-wires to initial page — Task 6
- ✅ Admin preview switches to cover view when entering drill-in — Task 5
- ✅ Data model (cover + initialPageId) — Task 1

**Placeholder scan:** No placeholders detected. All code blocks are complete.

**Type consistency:**
- `siteConfig.cover.imageUrl` — used consistently across Tasks 1, 3, 5, 6
- `siteConfig.cover.buttonText` — used consistently across Tasks 1, 3, 5, 6
- `siteConfig.initialPageId` — used consistently across Tasks 1, 4, 5, 6
- `primaryButton: { label, href }` — defined in Task 2, consumed by PageCover in Tasks 5 and 6
- `onPickCoverImage`, `onViewCover` — defined in Tasks 3 and 4, threaded in Task 4, consumed in Task 5
