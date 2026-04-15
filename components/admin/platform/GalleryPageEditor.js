// components/admin/platform/GalleryPageEditor.js
import { useState, useCallback } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'

function generateAlbumId(title, existingIds) {
  const base = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  let id = base
  let n = 2
  while (existingIds.has(id)) { id = `${base}-${n++}` }
  return id
}

function albumToGallery(album) {
  return {
    name: album.title,
    description: '',
    blocks: album.blocks || [],
    thumbnailUrl: album.thumbnailUrl || '',
    enableSlideshow: false,
    showCover: false,
  }
}

function galleryToAlbum(album, gallery) {
  return {
    ...album,
    title: gallery.name || album.title,
    blocks: gallery.blocks || [],
  }
}

// ---- Album Block Editor (Level 3) ----
function AlbumEditor({ page, album, onAlbumChange, saveStatus, onBack }) {
  const [libraryImages, setLibraryImages] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const gallery = albumToGallery(album)

  const handleGalleryChange = useCallback((updatedGallery) => {
    onAlbumChange(galleryToAlbum(album, updatedGallery))
  }, [album, onAlbumChange])

  const fetchLibrary = useCallback(() => {
    if (libraryImages !== null) return
    setLibraryLoading(true)
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(data => { setLibraryImages(data.allImages || []); setLibraryLoading(false) })
      .catch(() => setLibraryLoading(false))
  }, [libraryImages])

  const handleAddPhotosToBlock = useCallback((blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex)
    setPhotoPickerOpen(true)
    fetchLibrary()
  }, [fetchLibrary])

  const handlePhotoPickerConfirm = useCallback((urls) => {
    if (photoPickerBlockIndex === null) return
    const blocks = [...(album.blocks || [])]
    const block = blocks[photoPickerBlockIndex]
    if (!block) return
    blocks[photoPickerBlockIndex] = {
      ...block,
      imageUrls: [...(block.imageUrls || []), ...urls],
    }
    onAlbumChange({ ...album, blocks })
    setPhotoPickerOpen(false)
    setPhotoPickerBlockIndex(null)
  }, [photoPickerBlockIndex, album, onAlbumChange])

  const autosaveStatus = saveStatus === 'saving' ? 'saving'
    : saveStatus === 'saved' ? 'saved'
    : saveStatus === 'error' ? 'unsaved'
    : 'idle'

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 text-xs text-gray-400 flex-shrink-0">
        <button onClick={onBack} className="hover:text-gray-700 transition-colors">
          {page.title}
        </button>
        <span>/</span>
        <span className="text-gray-700 font-medium">{album.title}</span>
      </div>

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
        />
        <GalleryPreview gallery={gallery} />
      </div>

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          loading={libraryLoading}
          blockType={album.blocks?.[photoPickerBlockIndex]?.type || 'photo'}
          defaultFolder={null}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
        />
      )}
    </div>
  )
}

// ---- Album List (Level 2) ----
function AlbumList({ page, onSelectAlbum, onPageChange }) {
  const albums = page.albums || []

  function handleAddAlbum() {
    const title = 'New Album'
    const existingIds = new Set(albums.map(a => a.id))
    const id = generateAlbumId(title, existingIds)
    const newAlbum = { id, title, thumbnailUrl: '', blocks: [] }
    onPageChange({ ...page, albums: [...albums, newAlbum] })
    onSelectAlbum(id)
  }

  function handleDeleteAlbum(albumId) {
    if (!confirm('Delete this album? This cannot be undone.')) return
    onPageChange({ ...page, albums: albums.filter(a => a.id !== albumId) })
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-6">{page.title}</div>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">{page.title}</h1>

      {albums.length === 0 ? (
        <div className="text-gray-400 text-sm mb-6">No albums yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {albums.map(album => (
            <div
              key={album.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors cursor-pointer group relative"
              onClick={() => onSelectAlbum(album.id)}
            >
              {album.thumbnailUrl ? (
                <img src={album.thumbnailUrl} alt={album.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
                  No photos yet
                </div>
              )}
              <div className="px-3 py-2 flex items-center">
                <span className="flex-1 text-sm font-medium text-gray-800">{album.title}</span>
                <span className="text-xs text-gray-400">{(album.blocks || []).filter(b => b.type !== 'text').length} photos</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteAlbum(album.id) }}
                className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow text-gray-500 hover:text-red-600 text-xs transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAddAlbum}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        + Add Album
      </button>
    </div>
  )
}

// ---- GalleryPageEditor (top-level: Level 2 or 3) ----
export default function GalleryPageEditor({ page, saveStatus, onPageChange }) {
  const [selectedAlbumId, setSelectedAlbumId] = useState(null)

  const selectedAlbum = (page.albums || []).find(a => a.id === selectedAlbumId) || null

  const handleAlbumChange = useCallback((updatedAlbum) => {
    onPageChange({
      ...page,
      albums: (page.albums || []).map(a => a.id === updatedAlbum.id ? updatedAlbum : a),
    })
  }, [page, onPageChange])

  if (selectedAlbum) {
    return (
      <AlbumEditor
        page={page}
        album={selectedAlbum}
        onAlbumChange={handleAlbumChange}
        saveStatus={saveStatus}
        onBack={() => setSelectedAlbumId(null)}
      />
    )
  }

  return (
    <AlbumList
      page={page}
      onSelectAlbum={setSelectedAlbumId}
      onPageChange={onPageChange}
    />
  )
}
