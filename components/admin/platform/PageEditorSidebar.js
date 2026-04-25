// components/admin/platform/PageEditorSidebar.js
// Single-sidebar block editor with breadcrumb back to page list
import { useState, useCallback, useMemo, useEffect } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'
import { buildMultiImageFields, buildSingleImageFields, mergeImageRefs, pageDisplayThumbnail } from '../../../common/assetRefs'
import PageSettingsPanel from './PageSettingsPanel'

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

export default function PageEditorSidebar({ page, siteConfig, libraryConfig, saveStatus, onPageChange, onBack, onMoveBlockToPage, onUpdateLibraryCaption, username, blockBuilderRef, onScrollRatioChange, highlightedBlockIndex, onBlockHover, onToggleSidebarCollapse }) {
  const [libraryData, setLibraryData] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)

  const libraryImages = libraryData?.images || null

  const gallery = pageToGallery(page)
  const pages = siteConfig?.pages || []

  const assetsByUrl = useMemo(() => {
    const map = {}
    const assets = libraryConfig?.assets || {}
    for (const a of Object.values(assets)) {
      if (a?.publicUrl) map[a.publicUrl] = a
    }
    return map
  }, [libraryConfig])

  const allCollections = useMemo(() => {
    const galleries = Object.keys(libraryData?.galleries || {}).map(slug => ({ slug, type: 'gallery' }))
    const portfolios = Object.keys(libraryData?.portfolios || {}).map(slug => ({ slug, type: 'portfolio' }))
    return [...galleries, ...portfolios].sort((a, b) => a.slug.localeCompare(b.slug))
  }, [libraryData])

  const collectionsByUrl = useMemo(() => {
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

  useEffect(() => { fetchLibrary() }, [])

  const handleToggleCollection = useCallback(async (imageUrl, slug, type, add) => {
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
  }, [fetchLibrary])

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
        ...buildSingleImageFields(refs[0], 'thumbnail', 'thumbnailUrl'),
      })
      setPhotoPickerOpen(false)
      setPhotoPickerBlockIndex(null)
      return
    }

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

  if (page.type === 'link') {
    return (
      <div className="flex flex-col h-full bg-stone-50 p-3">
        <PageSettingsPanel page={page} onChange={onPageChange} />
      </div>
    )
  }

  return (
    <>
      <BlockBuilder
        ref={blockBuilderRef}
        gallery={gallery}
        onChange={handleGalleryChange}
        onScrollRatioChange={onScrollRatioChange}
        highlightedBlockIndex={highlightedBlockIndex}
        onBlockHover={onBlockHover}
        onPublish={null}
        publishing={false}
        autosaveStatus={autosaveStatus}
        hasDraft={false}
        isPublished={false}
        onAddPhotosToBlock={handleAddPhotosToBlock}
        onPickThumbnail={handlePickThumbnail}
        expanded={false}
        onToggleExpand={onToggleSidebarCollapse}
        pages={pages}
        getAssetByUrl={getAssetByUrl}
        allCollections={allCollections}
        collectionsByUrl={collectionsByUrl}
        onToggleCollection={handleToggleCollection}
        headerLabel="PAGE"
        pageSettingsSlot={
          <PageSettingsPanel
            page={page}
            onChange={onPageChange}
          />
        }
        onBack={null}
        sourcePageId={page.id}
        onMoveBlockToPage={onMoveBlockToPage}
        onUpdateLibraryCaption={onUpdateLibraryCaption}
        assetsByUrl={assetsByUrl}
        className="flex flex-col h-full bg-stone-50 text-left font-sans"
      />

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          loading={libraryLoading}
          blockType={photoPickerBlockIndex === 'thumbnail' ? 'photo' : (page.blocks?.[photoPickerBlockIndex]?.type || 'photo')}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
        />
      )}
    </>
  )
}
