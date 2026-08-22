// components/admin/platform/PageEditorSidebar.js
// Single-sidebar block editor with breadcrumb back to page list
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'
import { buildMultiImageFields, buildSingleImageFields, mergeImageRefs, pageDisplayThumbnail, getPagePhotos, normalizeImageRef } from '../../../common/assetRefs'
import { uploadFile } from '../UploadModal'
import PageSettingsPanel from './PageSettingsPanel'
import PageSettingsPopover from './PageSettingsPopover'
import { generatePageId } from '../../../common/siteConfig'
import { amsterdamGroundPlan } from '../../../common/themes/variants'
import { amsterdamInkColors, resolveAmsterdamInk } from '../../../common/themes/amsterdam'
import { getPageTheme } from '../../../common/themes'
import { resolveHomePage } from '../../../common/homePage'

function pageToGallery(page) {
  return {
    name: page.title,
    slug: page.id,
    description: page.description || '',
    blocks: page.blocks || [],
    thumbnail: page.thumbnail || null,
    thumbnailUrl: pageDisplayThumbnail(page),
    visibility: page.visibility || 'public',
    enableSlideshow: page.enableSlideshow || false,
    showCover: false,
  }
}

function galleryToPage(page, gallery) {
  return {
    ...page,
    title: gallery.name || page.title,
    description: gallery.description || '',
    blocks: gallery.blocks || [],
    thumbnail: gallery.thumbnail || page.thumbnail || null,
    thumbnailUrl: gallery.thumbnailUrl || pageDisplayThumbnail(page),
    visibility: gallery.visibility || 'public',
    enableSlideshow: gallery.enableSlideshow || false,
  }
}

export default function PageEditorSidebar({ page, siteConfig, libraryConfig, saveStatus, onPageChange, onUpdatePage, onBack, onMoveBlockToPage, onUpdateLibraryCaption, onPrintChange, username, blockBuilderRef, onScrollPreviewToBlock, highlightedBlockIndex, onBlockHover, onToggleSidebarCollapse, titleFocusTs }) {
  const [libraryData, setLibraryData] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [pageSettingsAnchorEl, setPageSettingsAnchorEl] = useState(null)
  const [thumbnailDefaultPageId, setThumbnailDefaultPageId] = useState(null)

  const libraryImages = libraryData?.images || null

  const gallery = pageToGallery(page)
  const pages = siteConfig?.pages || []
  // The block design controls must match the theme the page RENDERS in — its theme
  // override when set, not the site theme. Otherwise an overridden page shows the
  // wrong theme's layout/frame options (e.g. a Kyoto-overridden page under a Florence
  // site showing Fill + Frame).
  const pageThemeId = getPageTheme(siteConfig, page)?.id || siteConfig?.design?.theme || 'kyoto'

  // Amsterdam: the default (rotation) ground each block would take on auto, so the
  // block's Ink swatches can mark which one is the site's choice. Mirrors the wall's
  // opener rule (a home page with a cover opens on a photo hero = dark start).
  const heroOpener = page?.id === resolveHomePage(siteConfig)?.id && !!page?.cover?.imageUrl
  const blockGroundDefaults = useMemo(
    () => amsterdamGroundPlan(gallery.blocks || [], { heroOpener }).map((g) => g.def),
    [gallery.blocks, heroOpener]
  )

  // The block-level Ink swatch's "ink" option paints the block in the SITE's ink
  // ground — so its swatch must show the actual chosen ink color (red / blue /
  // black / light), not a hardcoded red. Resolve it from the site design here.
  const amsterdamInk = useMemo(() => {
    const id = resolveAmsterdamInk(siteConfig?.design)
    const names = { vermilion: 'Red', ultramarine: 'Blue', black: 'Black', light: 'Light' }
    return { color: amsterdamInkColors(siteConfig?.design).ink, name: names[id] || 'Ink' }
  }, [siteConfig?.design])

  const pagesData = useMemo(() => (siteConfig?.pages || [])
    .map(p => ({ id: p.id, title: p.title || 'Untitled', imageUrls: getPagePhotos(p) }))
    .filter(p => p.imageUrls.length > 0)
  , [siteConfig])

  const assetsByUrl = useMemo(() => {
    const map = {}
    const assets = libraryConfig?.assets || {}
    for (const a of Object.values(assets)) {
      if (a?.publicUrl) map[a.publicUrl] = a
    }
    return map
  }, [libraryConfig])

  const allSets = useMemo(() => {
    const galleries = Object.keys(libraryData?.galleries || {}).map(slug => ({ slug, type: 'gallery' }))
    const portfolios = Object.keys(libraryData?.portfolios || {}).map(slug => ({ slug, type: 'portfolio' }))
    return [...galleries, ...portfolios].sort((a, b) => a.slug.localeCompare(b.slug))
  }, [libraryData])

  const setsByUrl = useMemo(() => {
    const map = {}
    Object.entries(libraryData?.galleries || {}).forEach(([slug, urls]) => {
      ;(urls || []).forEach(url => { if (!map[url]) map[url] = []; map[url].push({ slug, type: 'gallery' }) })
    })
    Object.entries(libraryData?.portfolios || {}).forEach(([slug, urls]) => {
      ;(urls || []).forEach(url => { if (!map[url]) map[url] = []; map[url].push({ slug, type: 'portfolio' }) })
    })
    return map
  }, [libraryData])

  const getAssetByUrl = useCallback(url => assetsByUrl[url] || null, [assetsByUrl])

  const handleGalleryChange = useCallback((updatedGallery) => {
    const nextPage = galleryToPage(page, updatedGallery)
    // When the title changed (e.g. from the editable masthead), keep the slug in
    // sync the same way the Title field does: re-derive it unless the user set a
    // custom slug.
    if (updatedGallery.name !== page.title) {
      const prevDerived = generatePageId(page.title || '')
      nextPage.slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(updatedGallery.name || '')
    }
    onPageChange(nextPage)
  }, [page, onPageChange])

  const fetchLibrary = useCallback(() => {
    if (libraryData !== null) return
    setLibraryLoading(true)
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(data => { setLibraryData(data); setLibraryLoading(false) })
      .catch(() => setLibraryLoading(false))
  }, [libraryData])

  useEffect(() => { fetchLibrary() }, [])

  const handleToggleSet = useCallback(async (imageUrl, slug, type, add) => {
    const section = type === 'portfolio' ? 'portfolios' : 'galleries'
    setLibraryData(prev => {
      if (!prev) return prev
      const current = prev[section]?.[slug] || []
      const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl)
      return { ...prev, [section]: { ...prev[section], [slug]: updated } }
    })
    const galleries = libraryData?.galleries || {}
    const portfolios = libraryData?.portfolios || {}
    const assets = libraryData?.assets || {}
    const sectionData = section === 'galleries' ? galleries : portfolios
    const current = sectionData[slug] || []
    const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl)
    await fetch('/api/admin/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ galleries, portfolios, assets, [section]: { ...sectionData, [slug]: updated } }),
    })
  }, [libraryData])

  const handleAddPhotosToBlock = useCallback((blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex)
    setPhotoPickerOpen(true)
    fetchLibrary()
  }, [fetchLibrary])

  const handlePickThumbnail = useCallback(() => {
    setPhotoPickerBlockIndex('thumbnail')
    setPhotoPickerOpen(true)
    fetchLibrary()
    // Smart default: use this page as filter if it has photos to choose from
    const pageImages = getPagePhotos(page)
    const explicitThumb = page.thumbnail?.imageUrl
    const choosable = explicitThumb ? pageImages.filter(u => u !== explicitThumb) : pageImages
    setThumbnailDefaultPageId(choosable.length > 0 ? page.id : null)
  }, [fetchLibrary, page])

  // Latest page, so an async drop-upload applies onto current state (not a stale
  // closure captured when a memoized block card last rendered).
  const pageRef = useRef(page)
  useEffect(() => { pageRef.current = page }, [page])

  // Add image refs to a photo/testimonial (single) or a photo set (append), shared
  // by the library picker and drag-and-drop upload. Reads the latest page via the ref
  // so an async upload can't overwrite edits made while it was in flight.
  const addRefsToBlock = useCallback((blockIndex, refs) => {
    if (typeof blockIndex !== 'number' || !refs?.length) return
    const current = pageRef.current
    const blocks = [...(current.blocks || [])]
    const block = blocks[blockIndex]
    if (!block) return
    if (block.type === 'photo' || block.type === 'testimonial') {
      blocks[blockIndex] = {
        ...block,
        ...(block.type === 'testimonial' ? { imageUrl: refs[0].url } : buildSingleImageFields(refs[0])),
      }
    } else {
      const merged = mergeImageRefs(block.images || block.imageUrls || [], refs)
      blocks[blockIndex] = { ...block, ...buildMultiImageFields(merged) }
    }
    onPageChange({ ...current, blocks })
  }, [onPageChange])

  const handlePhotoPickerConfirm = useCallback((refs) => {
    if (photoPickerBlockIndex === null) return
    if (!refs.length) return

    if (photoPickerBlockIndex === 'cover') {
      onPageChange({
        ...page,
        cover: { ...(page.cover || { height: 'full', overlayText: '' }), imageUrl: refs[0].url },
      })
      setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null); return
    }

    if (photoPickerBlockIndex === 'thumbnail') {
      onPageChange({
        ...page,
        thumbnail: { ...(page.thumbnail || {}), imageUrl: refs[0].url, useCover: false, focalPoint: null },
        thumbnailUrl: refs[0].url,
      })
      setPhotoPickerOpen(false)
      setPhotoPickerBlockIndex(null)
      return
    }

    addRefsToBlock(photoPickerBlockIndex, refs)
    setPhotoPickerOpen(false)
    setPhotoPickerBlockIndex(null)
  }, [photoPickerBlockIndex, page, onPageChange, addRefsToBlock])

  // Seed EXIF capture onto the uploaded assets' library records (mirrors the photo
  // picker's registerCaptures). The upload itself already lands the file in the
  // library's R2 store, which the library GET lists lazily — this only enriches it.
  const registerUploadedAssets = useCallback(async (uploaded) => {
    const withCapture = uploaded.filter((u) => u.capture)
    if (!withCapture.length || !libraryData?.assets) return
    try {
      const { createAssetIdFromUrl } = await import('../../../common/adminConfig')
      const { seedUploadedAsset } = await import('../../../common/import/uploadedAsset')
      const now = new Date().toISOString()
      const assets = { ...libraryData.assets }
      for (const { url, capture } of withCapture) {
        const id = createAssetIdFromUrl(url)
        assets[id] = seedUploadedAsset({ url, capture, now }, { ...(libraryData.assets[id] || {}), assetId: id })
      }
      setLibraryData((prev) => (prev ? { ...prev, assets } : prev))
      await fetch('/api/admin/library', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolios: libraryData.portfolios || {}, galleries: libraryData.galleries || {}, assets }),
      })
    } catch (err) { console.error('Drag-drop upload: capture registration failed', err) }
  }, [libraryData])

  // Files dropped straight onto a photo block: upload to the library, then add to
  // the block. Returns when done so the block can clear its uploading state.
  const handleUploadFilesToBlock = useCallback(async (blockIndex, files) => {
    const list = Array.from(files || []).filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f.name))
    if (!list.length) return
    const uploaded = []
    for (const file of list) {
      try {
        const { gcsUrl, capture } = await uploadFile(file, { folder: 'photos' })
        uploaded.push({ url: gcsUrl, capture })
      } catch (err) { console.error('Drag-drop upload failed:', file.name, err) }
    }
    if (!uploaded.length) return
    await registerUploadedAssets(uploaded)
    const refs = uploaded.map((u) => normalizeImageRef(u.url)).filter(Boolean)
    addRefsToBlock(blockIndex, refs)
  }, [registerUploadedAssets, addRefsToBlock])

  const autosaveStatus = saveStatus === 'saving' ? 'saving'
    : saveStatus === 'saved' ? 'saved'
    : saveStatus === 'error' ? 'unsaved'
    : 'idle'

  if (page.type === 'link') {
    return (
      <div className="flex flex-col h-full p-3">
        <PageSettingsPanel page={page} onChange={onPageChange} themeId={siteConfig?.design?.theme || 'kyoto'} />
      </div>
    )
  }

  return (
    <>
      <BlockBuilder
        ref={blockBuilderRef}
        gallery={gallery}
        onChange={handleGalleryChange}
        onScrollPreviewToBlock={onScrollPreviewToBlock}
        highlightedBlockIndex={highlightedBlockIndex}
        onBlockHover={onBlockHover}
        onPublish={null}
        publishing={false}
        autosaveStatus={autosaveStatus}
        hasDraft={false}
        isPublished={false}
        onAddPhotosToBlock={handleAddPhotosToBlock}
        onUploadFilesToBlock={handleUploadFilesToBlock}
        onPickThumbnail={handlePickThumbnail}
        expanded={false}
        onToggleExpand={onToggleSidebarCollapse}
        pages={pages}
        onUpdatePage={onUpdatePage}
        getAssetByUrl={getAssetByUrl}
        allSets={allSets}
        setsByUrl={setsByUrl}
        onToggleSet={handleToggleSet}
        headerLabel="PAGE"
        autoFocusTitle={titleFocusTs}
        blockGroundDefaults={blockGroundDefaults}
        amsterdamInk={amsterdamInk}
        infoCardHidden={siteConfig?.design?.theme === 'manhattan'}
        pageSettingsSlot={
          <PageSettingsPanel
            page={page}
            onChange={onPageChange}
            onPageSettings={(anchorEl) => setPageSettingsAnchorEl(anchorEl)}
            onAddBlockBelow={(rect) => blockBuilderRef?.current?.openAddBlockMenu(0, rect)}
            themeId={siteConfig?.design?.theme || 'kyoto'}
          />
        }
        onOpenPageSettings={(anchorEl) => setPageSettingsAnchorEl(anchorEl)}
        onBack={null}
        sourcePageId={page.id}
        onMoveBlockToPage={onMoveBlockToPage}
        onUpdateLibraryCaption={onUpdateLibraryCaption}
        onPrintChange={onPrintChange}
        assetsByUrl={assetsByUrl}
        className="flex flex-col h-full bg-stone-50 text-left font-sans"
        themeId={pageThemeId}
        libraryImages={libraryImages}
        libraryConfig={libraryData}
        libraryLoading={libraryLoading}
      />

      {pageSettingsAnchorEl && (
        <PageSettingsPopover
          page={page}
          anchorEl={pageSettingsAnchorEl}
          onUpdate={onPageChange}
          onClose={() => setPageSettingsAnchorEl(null)}
          username={username}
          onPickThumbnail={() => { setPageSettingsAnchorEl(null); handlePickThumbnail() }}
          siteConfig={siteConfig}
          assetsByUrl={assetsByUrl}
        />
      )}

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          libraryConfig={libraryData}
          loading={libraryLoading}
          blockType={photoPickerBlockIndex === 'thumbnail' ? 'photo' : (page.blocks?.[photoPickerBlockIndex]?.type || 'photo')}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
          pages={pagesData}
          defaultPageId={photoPickerBlockIndex === 'thumbnail' ? thumbnailDefaultPageId : null}
        />
      )}
    </>
  )
}
