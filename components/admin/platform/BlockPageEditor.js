// components/admin/platform/BlockPageEditor.js
import { useState, useCallback } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'

/**
 * Adapts a platform page (cover/single) to the BlockBuilder interface.
 * Platform page shape: { id, type, title, blocks, showInNav }
 * BlockBuilder gallery shape: { name, description, blocks, thumbnailUrl, enableSlideshow, showCover }
 */
function pageToGallery(page) {
  return {
    name: page.title,
    description: '',
    blocks: page.blocks || [],
    thumbnailUrl: '',
    enableSlideshow: false,
    showCover: false,
  }
}

function galleryToPage(page, gallery) {
  return {
    ...page,
    title: gallery.name || page.title,
    blocks: gallery.blocks || [],
  }
}

export default function BlockPageEditor({ page, saveStatus, onPageChange }) {
  const [libraryImages, setLibraryImages] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const gallery = pageToGallery(page)

  const handleGalleryChange = useCallback((updatedGallery) => {
    onPageChange(galleryToPage(page, updatedGallery))
  }, [page, onPageChange])

  const fetchLibrary = useCallback(() => {
    if (libraryImages !== null) return
    setLibraryLoading(true)
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(data => {
        setLibraryImages(data.allImages || [])
        setLibraryLoading(false)
      })
      .catch(() => setLibraryLoading(false))
  }, [libraryImages])

  const handleAddPhotosToBlock = useCallback((blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex)
    setPhotoPickerOpen(true)
    fetchLibrary()
  }, [fetchLibrary])

  const handlePhotoPickerConfirm = useCallback((urls) => {
    if (photoPickerBlockIndex === null) return
    const blocks = [...(page.blocks || [])]
    const block = blocks[photoPickerBlockIndex]
    if (!block) return
    blocks[photoPickerBlockIndex] = {
      ...block,
      imageUrls: [...(block.imageUrls || []), ...urls],
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
    <div className="flex h-full">
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
      />

      <GalleryPreview gallery={gallery} />

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          loading={libraryLoading}
          blockType={page.blocks?.[photoPickerBlockIndex]?.type || 'photo'}
          defaultFolder={null}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
        />
      )}
    </div>
  )
}
