// components/admin/platform/BlockPageEditor.js
import { useState, useCallback, useMemo, useEffect } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'
import { buildMultiImageFields, buildSingleImageFields, mergeImageRefs, pageDisplayThumbnail } from '../../../common/assetRefs'
import { heroTitleFor } from '../../../common/pageUtils'
import { useClientFeedback } from './useClientFeedback'
import { EditorFeedbackProvider } from '../gallery-builder/EditorFeedbackContext'
import ClientFeedbackBanner from './ClientFeedbackBanner'

function pageToGallery(page) {
  return {
    // The on-canvas title edits the page's HERO title, which defaults to (and
    // tracks) the page name until the user diverges it. The nav name is edited
    // separately in the sidebar.
    name: heroTitleFor(page),
    description: '',
    blocks: page.blocks || [],
    thumbnail: page.thumbnail || null,
    thumbnailUrl: pageDisplayThumbnail(page),
    enableSlideshow: false,
    showCover: false,
  }
}

function galleryToPage(page, gallery) {
  // The canvas title edits the hero title. While it matches the page name it's
  // "still tracking" (store nothing, so renames keep flowing through); once it
  // diverges we persist `heroTitle` and it stays independent of the nav name.
  const nextHero = gallery.name || ''
  const heroTitle = nextHero === (page.title || '') ? undefined : nextHero
  return {
    ...page,
    heroTitle,
    blocks: gallery.blocks || [],
    thumbnail: gallery.thumbnail || page.thumbnail || null,
    thumbnailUrl: gallery.thumbnailUrl || pageDisplayThumbnail(page),
  }
}

export default function BlockPageEditor({ page, siteConfig, saveStatus, onPageChange }) {
  const [libraryData, setLibraryData] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)

  const feedback = useClientFeedback(page.id, !!page.clientFeatures?.enabled)

  const libraryImages = libraryData?.images || null

  const assetsByUrl = useMemo(() => {
    const map = {}
    ;(libraryData?.images || []).forEach(a => { map[a.publicUrl] = a })
    return map
  }, [libraryData])

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
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  // Prefetch library so metadata is ready when a block thumbnail is clicked
  useEffect(() => { fetchLibrary() }, [])

  const gallery = pageToGallery(page)
  const pages = siteConfig?.pages || []

  const handleGalleryChange = useCallback((updatedGallery) => {
    onPageChange(galleryToPage(page, updatedGallery))
  }, [page, onPageChange])

  const fetchLibrary = useCallback(() => {
    if (libraryData !== null) return
    setLibraryLoading(true)
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(data => { setLibraryData(data); setLibraryLoading(false) })
      .catch(() => setLibraryLoading(false))
  }, [libraryData])

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
    const current = (section === 'galleries' ? galleries : portfolios)[slug] || []
    const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl)
    await fetch('/api/admin/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ galleries, portfolios, assets, [section]: { ...(section === 'galleries' ? galleries : portfolios), [slug]: updated } }),
    })
  }, [libraryData])

  // Sync a print/sell change from a block lightbox into the library cache so
  // it survives closing/reopening the image (assetsByUrl is memoized from
  // libraryData.images). The server already persisted it; this keeps the
  // in-memory cache in step.
  const handlePrintChange = useCallback((assetId, print) => {
    setLibraryData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        images: (prev.images || []).map(img => img.assetId === assetId ? { ...img, print, forSale: print.sellable } : img),
        assets: prev.assets ? { ...prev.assets, [assetId]: { ...(prev.assets[assetId] || {}), print, forSale: print.sellable } } : prev.assets,
      }
    })
  }, [])

  const handleAddPhotosToBlock = useCallback((blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex)
    setPhotoPickerOpen(true)
    fetchLibrary()
  }, [fetchLibrary])

  const handlePhotoPickerConfirm = useCallback((refs) => {
    if (photoPickerBlockIndex === null) return
    if (!refs.length) return
    const blocks = [...(page.blocks || [])]
    const block = blocks[photoPickerBlockIndex]
    if (!block) return
    if (block.type === 'photo') {
      blocks[photoPickerBlockIndex] = {
        ...block,
        ...buildSingleImageFields(refs[0]),
      }
    } else {
      const merged = mergeImageRefs(block.images || block.imageUrls || [], refs)
      blocks[photoPickerBlockIndex] = {
        ...block,
        ...buildMultiImageFields(merged),
      }
    }
    onPageChange({ ...page, blocks })
    setPhotoPickerOpen(false)
    setPhotoPickerBlockIndex(null)
  }, [photoPickerBlockIndex, page, onPageChange])

  const autosaveStatus = saveStatus === 'saving' ? 'saving'
    : saveStatus === 'saved' ? 'saved'
    : saveStatus === 'error' ? 'unsaved'
    : 'idle'

  return (
    <EditorFeedbackProvider
      pageId={page.id}
      feedbackByPhoto={feedback.byPhoto}
      hasFeedback={feedback.hasFeedback}
      lastActivityTs={feedback.lastActivityTs}
    >
      <div className="flex flex-col h-full">
        <ClientFeedbackBanner />
        <div className="flex flex-1 min-h-0">
          <BlockBuilder
            gallery={gallery}
            onChange={handleGalleryChange}
            onPublish={null}
            publishing={false}
            autosaveStatus={autosaveStatus}
            hasDraft={false}
            isPublished={false}
            onAddPhotosToBlock={handleAddPhotosToBlock}
            onPickThumbnail={null}
            expanded={expanded}
            onToggleExpand={() => setExpanded(v => !v)}
            pages={pages}
            getAssetByUrl={getAssetByUrl}
            allSets={allSets}
            setsByUrl={setsByUrl}
            onToggleSet={handleToggleSet}
            onPrintChange={handlePrintChange}
            themeId={siteConfig?.design?.theme || 'kyoto'}
            libraryImages={libraryImages}
            libraryConfig={libraryData}
            libraryLoading={libraryLoading}
          />

          <GalleryPreview gallery={gallery} pages={pages} siteConfig={siteConfig} assetsByUrl={assetsByUrl} printStore={siteConfig?.printStore} />
        </div>

        {photoPickerOpen && (
          <PhotoPickerModal
            images={libraryImages || []}
            libraryConfig={libraryData}
            loading={libraryLoading}
            blockType={page.blocks?.[photoPickerBlockIndex]?.type || 'photo'}
            onConfirm={handlePhotoPickerConfirm}
            onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
          />
        )}
      </div>
    </EditorFeedbackProvider>
  )
}
