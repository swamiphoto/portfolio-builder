// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { DragProvider } from '../../common/dragContext'
import { buildMultiImageFields, buildSingleImageFields, normalizeImageRefs, getPagePhotos } from '../../common/assetRefs'
import AdminLayout from '../../components/admin/platform/AdminLayout'
import ThemeToolbarControl from '../../components/admin/platform/ThemeToolbarControl'
import PlatformSidebar from '../../components/admin/platform/PlatformSidebar'
import StudioMobileGate from '../../components/admin/platform/StudioMobileGate'
import PageEditorSidebar from '../../components/admin/platform/PageEditorSidebar'
import PhotoPickerModal from '../../components/admin/gallery-builder/PhotoPickerModal'
import AdminLibrary from '../../components/admin/AdminLibrary'
import PagePreview from '../../components/admin/platform/PagePreview'
import CanvasEmptyState from '../../components/admin/onboarding/CanvasEmptyState'
import ClientFeedbackBanner from '../../components/admin/platform/ClientFeedbackBanner'
import { EditorFeedbackProvider } from '../../components/admin/gallery-builder/EditorFeedbackContext'
import { useClientFeedback } from '../../components/admin/platform/useClientFeedback'
import { defaultPage, titleForTemplate } from '../../common/siteConfig'
import { composeSite, applyComposedPages } from '../../common/import/composer'
import { assignHomeOnCreate } from '../../common/homePage'
import PageCover from '../../components/image-displays/page/PageCover'
import { useRouter } from 'next/router'
import GuidedTour from '../../components/admin/onboarding/GuidedTour'
import { useOnboarding } from '../../components/admin/onboarding/useOnboarding'
import { buildTourSteps, WELCOME, BLOCKS_TOUR_STEPS } from '../../components/admin/onboarding/tourSteps'
import { fontFamilyForSlot } from '../../common/themes/variants'
import { THEME_LIST } from '../../common/themes'
import { useIsPhone } from '../../common/useIsPhone'

const AUTOSAVE_DELAY = 1500
const themeName = (id) => (THEME_LIST.find((t) => t.id === id) || {}).name || id

// Which page is being edited/previewed right now: the explicitly selected page,
// else the homepage default (mirrors the `selectedPage` derivation below). Pulled
// out as a pure helper so the client-feedback hook can key off it above the early
// returns without duplicating the resolution.
function resolveEditingPage(siteConfig, selectedPageId, showLibrary) {
  const pages = siteConfig?.pages || []
  if (!pages.length) return null
  if (selectedPageId) {
    const explicit = pages.find(p => p.id === selectedPageId)
    if (explicit) return explicit
  }
  if (showLibrary) return null
  return pages.find(p => p.id === siteConfig.homePageId)
    || pages.find(p => p.showInNav && p.type !== 'link')
    || pages.find(p => p.type !== 'link')
    || pages[0]
    || null
}

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { onboarding, loading: onboardingLoading, error: onboardingError, markSeen, resetOnboarding } = useOnboarding()
  const importedJustNow = router.query.imported === '1'
  const rebuiltJustNow = router.query.rebuilt === '1'

  useEffect(() => {
    if (router.query.imported || router.query.rebuilt) {
      const { imported, rebuilt, ...rest } = router.query
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [siteConfig, setSiteConfig] = useState(null)
  const [libraryConfig, setLibraryConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false)
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [coverSelected, setCoverSelected] = useState(false)
  const [coverCtaHint, setCoverCtaHint] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [thumbnailPickerPageId, setThumbnailPickerPageId] = useState(null)
  const [assetPickerTarget, setAssetPickerTarget] = useState(null) // 'logo' | 'favicon' | null
  const [blockSidebarCollapsed, setBlockSidebarCollapsed] = useState(false)
  const [pageSidebarCollapsed, setPageSidebarCollapsed] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [lastPublishedAt, setLastPublishedAt] = useState(null)
  const [previewViewport, setPreviewViewport] = useState('desktop') // 'desktop' | 'mobile'
  const autosaveTimer = useRef(null)
  // Real device width (not the preview toggle): the studio editor is a wide,
  // three-column workspace, so on a phone we show a gate instead. See below.
  const isPhone = useIsPhone()

  // Hover highlight sync
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState(null)
  // First-time nudge when a photo is marked for sale but the print store is off.
  const [printNudge, setPrintNudge] = useState(false)
  const printNudgeShownRef = useRef(false)
  const printStoreEnabledRef = useRef(false)
  // Warn when the site theme changes while the open page has an override (its
  // preview won't reflect the change). selOverrideRef is set during render below.
  const [siteThemeToast, setSiteThemeToast] = useState('')
  const prevSiteThemeRef = useRef(undefined)
  const selOverrideRef = useRef(null)
  useEffect(() => {
    const cur = siteConfig?.design?.theme
    if (cur == null) return
    const prev = prevSiteThemeRef.current
    prevSiteThemeRef.current = cur
    if (prev === undefined || prev === cur) return
    const ov = selOverrideRef.current
    if (ov && ov !== cur && THEME_LIST.some((t) => t.id === ov)) {
      setSiteThemeToast(`Site theme is now ${themeName(cur)}. This page has been overridden to a different theme (${themeName(ov)}), which is why the change isn't reflected here.`)
      setTimeout(() => setSiteThemeToast(''), 9000)
    }
  }, [siteConfig?.design?.theme])

  // Click-based scroll sync between sidebar blocks and preview
  const previewContainerRef = useRef(null)
  const blockBuilderRef = useRef(null)

  const handleScrollPreviewToBlock = useCallback((index) => {
    if (!previewContainerRef.current) return
    // 'cover' scrolls to the opener/hero: the preview to the top and any horizontal
    // wall (Amsterdam/Florence) back to its start.
    if (index === 'cover') {
      previewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      const wall = previewContainerRef.current.querySelector('.ams-wall, .florence-wall')
      if (wall) wall.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    const block = previewContainerRef.current.querySelector(`[data-block-index="${index}"]`)
    if (!block) return
    block.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  const handleScrollSidebarToBlock = useCallback((index) => {
    blockBuilderRef.current?.scrollToBlock(index)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/admin/library').then(r => r.json()).then(setLibraryConfig).catch(() => {})
  }, [status])

  const handleUpdateLibraryCaption = useCallback(async (assetId, caption, url) => {
    if (!assetId) return
    setLibraryConfig(prev => prev ? {
      ...prev,
      // Ensure the cached asset carries a publicUrl so assetsByUrl (keyed by url)
      // surfaces the new caption and the block re-renders — even if this asset
      // wasn't in the initially-loaded library config.
      assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), ...(url ? { assetId, publicUrl: url } : {}), caption } }
    } : prev)
    try {
      await fetch('/api/admin/library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, patch: { caption } }),
      })
    } catch (err) {
      console.error('Library caption update failed:', err)
    }
  }, [])

  // The photo lightbox (opened from a page block) already persists the sell/print
  // change to the server via /api/admin/print/sell; this just refreshes the local
  // library cache so the block re-renders and the toggle survives close/reopen.
  const handleUpdateLibraryPrint = useCallback((assetId, print) => {
    if (!assetId) return
    // Marking a photo for sale does nothing until the print store is turned on in
    // Site Settings — let the photographer know the first time it happens.
    if (print?.sellable && !printStoreEnabledRef.current && !printNudgeShownRef.current) {
      printNudgeShownRef.current = true
      setPrintNudge(true)
      setTimeout(() => setPrintNudge(false), 7000)
    }
    setLibraryConfig(prev => prev ? {
      ...prev,
      assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), print, forSale: !!print?.sellable } },
      images: (prev.images || []).map(img => img.assetId === assetId ? { ...img, print, forSale: !!print?.sellable } : img),
    } : prev)
  }, [])

  const assetsByUrl = useMemo(() => {
    const map = {}
    for (const a of Object.values(libraryConfig?.assets || {})) {
      if (a?.publicUrl) map[a.publicUrl] = a
    }
    return map
  }, [libraryConfig])

  const pagesData = useMemo(() => (siteConfig?.pages || [])
    .map(p => ({ id: p.id, title: p.title || 'Untitled', imageUrls: getPagePhotos(p) }))
    .filter(p => p.imageUrls.length > 0)
  , [siteConfig])

  useEffect(() => {
    if (status === 'unauthenticated') {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
      const protocol = rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
      window.location.href = `${protocol}://${rootDomain}/auth/signin`
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(config => {
        setSiteConfig(config)
        setLoading(false)
        const pages = config?.pages || []
        const firstReal = pages.find(p => p.type !== 'link')
        if (!firstReal && config?.hasCoverPage !== false) {
          setCoverSelected(true)
          setSelectedPageId(null)
        } else {
          setCoverSelected(false)
          setSelectedPageId(firstReal?.id || null)
        }
      })
      .catch(err => {
        console.error('Failed to load site config:', err)
        setLoading(false)
      })
  }, [status])

  const save = useCallback(async (config) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSaveStatus('saved')
      setLastSavedAt(Date.now())
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Autosave failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [])

  const updateConfig = useCallback((updater) => {
    setHasUnpublishedChanges(true)
    setSiteConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => save(next), AUTOSAVE_DELAY)
      return next
    })
  }, [save])

  const updatePage = useCallback((pageId, updatedPage) => {
    updateConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? updatedPage : p),
    }))
  }, [updateConfig])

  const handleMoveBlockToPage = useCallback((sourcePageId, blockIndex, targetPageId) => {
    if (sourcePageId === targetPageId) return
    updateConfig(prev => {
      const pages = [...prev.pages]
      const sourcePage = pages.find(p => p.id === sourcePageId)
      const targetPage = pages.find(p => p.id === targetPageId)
      if (!sourcePage || !targetPage) return prev
      const sourceBlocks = [...(sourcePage.blocks || [])]
      const [movedBlock] = sourceBlocks.splice(blockIndex, 1)
      return {
        ...prev,
        pages: pages.map(p => {
          if (p.id === sourcePageId) return { ...p, blocks: sourceBlocks }
          if (p.id === targetPageId) return { ...p, blocks: [...(p.blocks || []), movedBlock] }
          return p
        }),
      }
    })
  }, [updateConfig])

  const handleDropImagesToPage = useCallback((targetPageId, imageRefs, sourceBlockType, sourcePageId, sourceBlockIndex) => {
    if (!imageRefs?.length) return
    const isMultiBlock = sourceBlockType === 'photos' || sourceBlockType === 'stacked' || sourceBlockType === 'masonry'
    const droppedUrls = new Set(imageRefs.map(r => r.url))
    updateConfig(prev => {
      const pages = prev.pages.map(p => {
        if (p.id === targetPageId) {
          const blocks = [...(p.blocks || [])]
          const lastBlock = blocks[blocks.length - 1]
          if (isMultiBlock && lastBlock && lastBlock.type === sourceBlockType) {
            const existing = normalizeImageRefs(lastBlock.images || lastBlock.imageUrls || [])
            const toAdd = imageRefs.filter(r => !existing.some(ex => ex.url === r.url))
            if (toAdd.length) {
              blocks[blocks.length - 1] = { ...lastBlock, ...buildMultiImageFields([...existing, ...toAdd]) }
            }
          } else {
            const newBlock = isMultiBlock
              ? { type: sourceBlockType, ...buildMultiImageFields(imageRefs) }
              : { type: 'photo', ...buildSingleImageFields(imageRefs[0]) }
            blocks.push(newBlock)
          }
          return { ...p, blocks }
        }
        if (p.id === sourcePageId && sourceBlockIndex != null) {
          const blocks = [...(p.blocks || [])]
          const src = blocks[sourceBlockIndex]
          if (src) {
            if (src.type === 'photo') {
              if (droppedUrls.has(src.imageUrl)) blocks[sourceBlockIndex] = { ...src, imageUrl: '' }
            } else {
              const remaining = normalizeImageRefs(src.images || src.imageUrls || []).filter(r => !droppedUrls.has(r.url))
              blocks[sourceBlockIndex] = { ...src, ...buildMultiImageFields(remaining) }
            }
          }
          return { ...p, blocks }
        }
        return p
      })
      return { ...prev, pages }
    })
  }, [updateConfig])

  // Rebuild-from-import: called by AdminLibrary once photos are imported and the
  // user chose to have their old site's pages recreated. Composes against the
  // *latest* siteConfig (via updateConfig's functional updater, not a stale
  // fetch) so the new pages land in this component's own state — they show up
  // in the sidebar immediately and ride the normal debounced autosave, instead
  // of AdminLibrary issuing its own site-config PUT that a moment later gets
  // overwritten by this component's next autosave of its (stale) in-memory config.
  const handleComposedPagesFromImport = useCallback((composeArgs) => {
    updateConfig(prev => {
      const { pages } = composeSite({ ...composeArgs, existingPages: prev?.pages || [] })
      if (!pages.length) return prev
      return applyComposedPages(prev, pages)
    })
  }, [updateConfig])

  const handlePickThumbnail = useCallback((pageId) => {
    setThumbnailPickerPageId(pageId)
  }, [])

  const handleThumbnailConfirm = useCallback((refs) => {
    if (!thumbnailPickerPageId || !refs.length) return
    const page = siteConfig?.pages?.find(p => p.id === thumbnailPickerPageId)
    if (page) {
      updatePage(thumbnailPickerPageId, {
        ...page,
        thumbnail: { imageUrl: refs[0].url, useCover: false },
        thumbnailUrl: refs[0].url,
      })
    }
    setThumbnailPickerPageId(null)
  }, [thumbnailPickerPageId, siteConfig, updatePage])

  const handleAssetPickerConfirm = useCallback((refs) => {
    if (!assetPickerTarget || !refs.length) return
    if (assetPickerTarget === 'coverImage') {
      // Cover images can be a set that cross-fades; append the picked ones and keep
      // imageUrl pointing at the first (used for share thumbnails).
      updateConfig(prev => {
        const existing = (prev.cover?.images && prev.cover.images.length) ? prev.cover.images : (prev.cover?.imageUrl ? [prev.cover.imageUrl] : [])
        const images = [...existing, ...refs.map(r => r.url).filter(u => !existing.includes(u))]
        return { ...prev, cover: { ...(prev.cover || {}), images, imageUrl: images[0] } }
      })
    } else if (assetPickerTarget === 'shareLarge') {
      updateConfig(prev => ({ ...prev, share: { ...(prev.share || {}), largeImage: refs[0].url } }))
    } else if (assetPickerTarget === 'shareSquare') {
      updateConfig(prev => ({ ...prev, share: { ...(prev.share || {}), squareImage: refs[0].url } }))
    } else if (assetPickerTarget === 'favicon') {
      // A favicon must be square or the browser squishes it. Crop the picked
      // image to a centred square server-side, then store that URL. Show the raw
      // pick immediately for feedback; swap to the cropped square when it's ready.
      const src = refs[0].url
      updateConfig(prev => ({ ...prev, favicon: src }))
      fetch('/api/admin/favicon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: src }),
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => { if (data?.url) updateConfig(prev => ({ ...prev, favicon: data.url })) })
        .catch(() => {})
    } else {
      updateConfig(prev => ({ ...prev, [assetPickerTarget]: refs[0].url }))
    }
    setAssetPickerTarget(null)
  }, [assetPickerTarget, updateConfig])

  const handleViewCover = useCallback(() => {
    setCoverSelected(true)
    setSelectedPageId(null)
    setShowLibrary(false)
    setCoverCtaHint(false)
  }, [])

  const handleDisableCover = useCallback(() => {
    const pages = siteConfig?.pages || []
    const targetId = siteConfig?.homePageId
      || pages.find(p => p.showInNav && p.type !== 'link')?.id
    if (!siteConfig?.homePageId && targetId) {
      updateConfig(prev => ({ ...prev, homePageId: targetId }))
    }
    setCoverSelected(false)
    setSelectedPageId(targetId || null)
    setShowLibrary(false)
  }, [siteConfig, updateConfig])

  const handleSelectPage = useCallback((pageId) => {
    setCoverSelected(false)
    setSelectedPageId(pageId)
    setShowLibrary(false)
  }, [])

  // Fires when a page is freshly created: { id, ts }. The block sidebar focuses +
  // selects that page's masthead title so the user can rename "Untitled" by
  // typing immediately.
  const [titleFocus, setTitleFocus] = useState(null)
  const focusPageTitle = useCallback((id) => setTitleFocus({ id, ts: Date.now() }), [])

  const handleCreateFirstPage = useCallback(() => {
    const existingIds = new Set((siteConfig?.pages || []).map(p => p.id))
    let id = 'gallery'; let n = 2
    while (existingIds.has(id)) { id = `gallery-${n++}` }
    const sortOrder = Math.max(0, ...(siteConfig?.pages || []).filter(p => p.showInNav !== false).map(p => p.sortOrder ?? 0)) + 1
    const newPage = defaultPage({ id, title: titleForTemplate('gallery'), sortOrder, showInNav: true, parentId: null, template: 'gallery' })
    updateConfig(prev => assignHomeOnCreate({ ...prev, pages: [...prev.pages, newPage] }, newPage))
    setCoverSelected(false)
    setSelectedPageId(id)
    setShowLibrary(false)
    focusPageTitle(id)
  }, [siteConfig, updateConfig, focusPageTitle])

  // Client-feedback for the page being edited. Must run before the early returns
  // (rules of hooks); it no-ops until siteConfig loads and the page has features.
  const editingPage = useMemo(
    () => resolveEditingPage(siteConfig, selectedPageId, showLibrary),
    [siteConfig, selectedPageId, showLibrary]
  )
  const clientFeedback = useClientFeedback(editingPage?.id, !!editingPage?.clientFeatures?.enabled)

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        Loading...
      </div>
    )
  }

  if (!session || !siteConfig) return null

  // The studio can't be used on a phone-width screen — send them to a desktop.
  // Keyed off real device width, so flipping the preview to Mobile never trips it.
  if (isPhone) return <StudioMobileGate email={session?.user?.email} />

  // Resolved above the early returns (so the client-feedback hook can key off it).
  const selectedPage = editingPage
  // Keep the open page's override handy for the site-theme-change warning effect.
  selOverrideRef.current = selectedPage?.themeOverride || null

  const sidebar = (
    <PlatformSidebar
      siteConfig={siteConfig}
      saveStatus={saveStatus}
      onConfigChange={updateConfig}
      onSignOut={() => signOut({ callbackUrl: '/' })}
      selectedPageId={showLibrary || coverSelected ? null : (selectedPage?.id ?? null)}
      coverSelected={coverSelected}
      onSelectPage={handleSelectPage}
      onRequestTitleFocus={focusPageTitle}
      onReplayTour={resetOnboarding}
      onSelectCover={handleViewCover}
      onShowLibrary={() => { setShowLibrary(true); setSelectedPageId(null); setCoverSelected(false) }}
      onPublish={() => { setHasUnpublishedChanges(false); setLastPublishedAt(Date.now()) }}
      hasUnpublishedChanges={hasUnpublishedChanges}
      libraryActive={showLibrary}
      username={session?.user?.username}
      email={session?.user?.email}
      avatarImage={session?.user?.image}
      displayName={session?.user?.name}
      onDropImagesToPage={handleDropImagesToPage}
      onPickThumbnail={handlePickThumbnail}
      assetsByUrl={assetsByUrl}
      onPickLogo={() => setAssetPickerTarget('logo')}
      onPickFavicon={() => setAssetPickerTarget('favicon')}
      onPickCoverImage={() => setAssetPickerTarget('coverImage')}
      onPickShareLarge={() => setAssetPickerTarget('shareLarge')}
      onPickShareSquare={() => setAssetPickerTarget('shareSquare')}
      onViewCover={handleViewCover}
      onDisableCover={handleDisableCover}
      onCollapse={() => setPageSidebarCollapsed(true)}
      lastSavedAt={lastSavedAt}
      lastPublishedAt={lastPublishedAt}
    />
  )

  const isCoverPageSelected = coverSelected && siteConfig.hasCoverPage !== false
  const panel = (selectedPage && selectedPage.type !== 'link' && !isCoverPageSelected) ? (
    <PageEditorSidebar
      page={selectedPage}
      siteConfig={siteConfig}
      libraryConfig={libraryConfig}
      saveStatus={saveStatus}
      onPageChange={(updated) => updatePage(selectedPage.id, updated)}
      onUpdatePage={updatePage}
      onBack={null}
      onMoveBlockToPage={handleMoveBlockToPage}
      onUpdateLibraryCaption={handleUpdateLibraryCaption}
      onPrintChange={handleUpdateLibraryPrint}
      username={session?.user?.username}
      blockBuilderRef={blockBuilderRef}
      onScrollPreviewToBlock={handleScrollPreviewToBlock}
      highlightedBlockIndex={hoveredBlockIndex}
      onBlockHover={setHoveredBlockIndex}
      onToggleSidebarCollapse={() => setBlockSidebarCollapsed(true)}
      titleFocusTs={titleFocus?.id === selectedPage.id ? titleFocus.ts : null}
    />
  ) : null



  let content
  if (isCoverPageSelected) {
    const cover = siteConfig.cover || {}
    const logoImage = siteConfig.logoType === 'image' && siteConfig.logo
    const themeId = siteConfig?.design?.theme
    const titleFF = fontFamilyForSlot(themeId, cover.titleFont || 'serif')
    const descFF = fontFamilyForSlot(themeId, cover.descriptionFont || 'serif')
    const homeTarget = siteConfig.homePageId || siteConfig.pages?.find(p => p.showInNav && p.type !== 'link')?.id
    // The real cover renderer, so every design control (layout / overlay / logo /
    // fonts / rich-text description) reflects live. themeId is omitted so the generic
    // cover always renders here (Florence/Amsterdam return null from PageCover).
    content = (
      <div className="flex-1 h-full min-w-0 relative">
        <PageCover
          cover={{ ...cover, imageUrl: cover.imageUrl || '', height: cover.height || 'full', variant: 'cover' }}
          title={cover.heading || siteConfig.siteName || ''}
          description={cover.subheading || siteConfig.tagline || ''}
          siteName={siteConfig.siteName}
          logo={logoImage ? siteConfig.logo : ''}
          titleFontFamily={titleFF}
          descriptionFontFamily={descFF}
          buttonFontFamily={fontFamilyForSlot(themeId, cover.buttonFont || cover.titleFont || 'sans')}
          primaryButton={{ label: cover.buttonText || 'View my portfolio', onClick: () => { if (homeTarget) handleSelectPage(homeTarget); else setCoverCtaHint(true) } }}
        />
        {coverCtaHint && !homeTarget && (
          <p className="absolute inset-x-0 bottom-8 text-center text-xs text-white/70 z-20">Coming soon — add a page and it becomes your site’s home.</p>
        )}
      </div>
    )
  } else if (selectedPage) {
    const username = session?.user?.username
    if (selectedPage.type === 'link') {
      content = (
        <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center gap-2 bg-white text-stone-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <span className="text-sm">{selectedPage.url || 'No URL set'}</span>
          {selectedPage.url && (
            <a href={selectedPage.url} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-stone-700 underline">
              Open link ↗
            </a>
          )}
        </div>
      )
    } else {
      content = (
        <div className="h-full flex flex-col">
          <ClientFeedbackBanner />
          {/* Preview frame — driven by the deferred config so it never blocks input */}
          <div className="flex-1 min-h-0 flex justify-center">
            <div
              ref={previewContainerRef}
              className="overflow-y-auto [overflow-x:clip] w-full scroll-quiet"
            >
              <PagePreview
                config={siteConfig}
                pageId={selectedPage.id}
                username={username}
                assetsByUrl={assetsByUrl}
                onPageClick={handleSelectPage}
                onBlockHover={setHoveredBlockIndex}
                highlightedBlockIndex={hoveredBlockIndex}
                onBlockClick={handleScrollSidebarToBlock}
              />
            </div>
          </div>
        </div>
      )
    }
  } else {
    content = <CanvasEmptyState onAddPage={handleCreateFirstPage} />
  }

  const showWelcomeTour = !onboardingLoading && !onboardingError && !onboarding.tourDone
  // The blocks tour fires the first time a real page is open with the block
  // sidebar showing, after the main tour is done. We no longer gate on an empty
  // page: a page created from a template already has blocks, and the design
  // step needs at least one block present to point at (it auto-skips if none).
  const showBlocksTip =
    !onboardingLoading &&
    !onboardingError &&
    onboarding.tourDone &&
    !onboarding.blocksTipSeen &&
    selectedPage &&
    selectedPage.type !== 'link' &&
    !isCoverPageSelected &&
    !blockSidebarCollapsed

  printStoreEnabledRef.current = !!siteConfig?.printStore?.enabled

  return (
    <DragProvider>
      <EditorFeedbackProvider
        pageId={selectedPage?.id}
        feedbackByPhoto={clientFeedback.byPhoto}
        hasFeedback={clientFeedback.hasFeedback}
        lastActivityTs={clientFeedback.lastActivityTs}
      >
      <AdminLayout
        sidebar={sidebar} panel={panel}
        panelCollapsed={blockSidebarCollapsed} onTogglePanel={() => setBlockSidebarCollapsed(v => !v)}
        sidebarCollapsed={pageSidebarCollapsed} onToggleSidebar={() => setPageSidebarCollapsed(v => !v)}
        panelLabel={selectedPage ? `${selectedPage.title} Blocks` : 'Blocks'}
        username={session?.user?.username}
        pagePath={selectedPage ? `/${selectedPage.slug || selectedPage.id}` : ''}
        toolbarExtra={siteConfig ? (
          <ThemeToolbarControl
            config={siteConfig}
            onChange={(patch) => updateConfig(prev => ({ ...prev, ...patch }))}
          />
        ) : null}
      >
        {content}
      </AdminLayout>
      </EditorFeedbackProvider>

      {[
        printNudge && { key: 'print', node: <>Marked for sale. Turn on your print store in <strong>Site Settings</strong> to start selling prints.</>, dismiss: () => setPrintNudge(false) },
        siteThemeToast && { key: 'theme', node: siteThemeToast, dismiss: () => setSiteThemeToast('') },
      ].filter(Boolean).map((t, i) => (
        <div
          key={t.key}
          className="fixed left-1/2 -translate-x-1/2 flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ zIndex: 9999, bottom: 24 + i * 88, background: '#2c2416', color: '#f3ece0', boxShadow: '0 10px 30px rgba(0,0,0,0.28)', width: 340, maxWidth: 'calc(100vw - 32px)' }}
          role="status"
        >
          <span style={{ lineHeight: 1.45 }}>{t.node}</span>
          <button
            type="button"
            onClick={t.dismiss}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.7, cursor: 'pointer', flexShrink: 0, lineHeight: 1, marginTop: 1 }}
          >✕</button>
        </div>
      ))}

      {showLibrary && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 50, background: 'rgba(26,18,10,0.22)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowLibrary(false) }}
        >
          <div
            className="flex overflow-hidden"
            style={{
              position: 'absolute',
              inset: 20,
              borderRadius: 12,
              background: 'var(--desk)',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.1), 0 32px 80px rgba(26,18,10,0.35)',
            }}
          >
            <AdminLibrary onBack={() => setShowLibrary(false)} siteConfig={siteConfig} onComposedPages={handleComposedPagesFromImport} />
          </div>

        </div>
      )}
      {thumbnailPickerPageId && (
        <PhotoPickerModal
          images={libraryConfig?.images || []}
          libraryConfig={libraryConfig}
          loading={!libraryConfig}
          blockType="photo"
          onConfirm={handleThumbnailConfirm}
          onClose={() => setThumbnailPickerPageId(null)}
          pages={pagesData}
          defaultPageId={(() => {
            const p = pagesData.find(p => p.id === thumbnailPickerPageId)
            if (!p) return null
            const page = siteConfig?.pages?.find(pg => pg.id === thumbnailPickerPageId)
            const explicitThumb = page?.thumbnail?.imageUrl
            const choosable = explicitThumb ? p.imageUrls.filter(u => u !== explicitThumb) : p.imageUrls
            return choosable.length > 0 ? thumbnailPickerPageId : null
          })()}
        />
      )}
      {assetPickerTarget && (
        <PhotoPickerModal
          images={libraryConfig?.images || []}
          libraryConfig={libraryConfig}
          loading={!libraryConfig}
          blockType={assetPickerTarget === 'coverImage' ? 'photos' : 'photo'}
          onConfirm={handleAssetPickerConfirm}
          onClose={() => setAssetPickerTarget(null)}
        />
      )}
      {showWelcomeTour && (
        <GuidedTour
          steps={buildTourSteps({ imported: importedJustNow, rebuilt: rebuiltJustNow })}
          welcome={WELCOME}
          onFinish={() => markSeen('tourDone')}
        />
      )}
      {showBlocksTip && (
        <GuidedTour
          steps={BLOCKS_TOUR_STEPS}
          onFinish={() => markSeen('blocksTipSeen')}
        />
      )}
    </DragProvider>
  )
}
