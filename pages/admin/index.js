// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { DragProvider } from '../../common/dragContext'
import { buildMultiImageFields, buildSingleImageFields, normalizeImageRefs } from '../../common/assetRefs'
import AdminLayout from '../../components/admin/platform/AdminLayout'
import PlatformSidebar from '../../components/admin/platform/PlatformSidebar'
import PageEditorSidebar from '../../components/admin/platform/PageEditorSidebar'
import GalleryPreview from '../../components/admin/gallery-builder/GalleryPreview'
import PhotoPickerModal from '../../components/admin/gallery-builder/PhotoPickerModal'
import AdminLibrary from '../../components/admin/AdminLibrary'
import PageCover from '../../components/image-displays/page/PageCover'
import SiteNav from '../../components/image-displays/page/SiteNav'

const AUTOSAVE_DELAY = 1500

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const [siteConfig, setSiteConfig] = useState(null)
  const [libraryConfig, setLibraryConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [thumbnailPickerPageId, setThumbnailPickerPageId] = useState(null)
  const autosaveTimer = useRef(null)

  // Hover highlight sync
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState(null)

  // Scroll sync — proportional ratio between sidebar and preview
  const previewContainerRef = useRef(null)
  const blockBuilderRef = useRef(null)
  const syncingRef = useRef(false)

  const handlePreviewScroll = useCallback(() => {
    if (syncingRef.current || !previewContainerRef.current || !blockBuilderRef.current) return
    const el = previewContainerRef.current
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    const ratio = el.scrollTop / max
    syncingRef.current = true
    blockBuilderRef.current.scrollToRatio(ratio)
    setTimeout(() => { syncingRef.current = false }, 100)
  }, [])

  const handleSidebarScrollRatio = useCallback((ratio) => {
    if (syncingRef.current || !previewContainerRef.current) return
    const el = previewContainerRef.current
    syncingRef.current = true
    el.scrollTop = ratio * Math.max(0, el.scrollHeight - el.clientHeight)
    setTimeout(() => { syncingRef.current = false }, 100)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/admin/library').then(r => r.json()).then(setLibraryConfig).catch(() => {})
  }, [status])

  const handleUpdateLibraryCaption = useCallback(async (assetId, caption) => {
    if (!assetId) return
    setLibraryConfig(prev => prev ? {
      ...prev,
      assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), caption } }
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

  const assetsByUrl = useMemo(() => {
    const map = {}
    for (const a of Object.values(libraryConfig?.assets || {})) {
      if (a?.publicUrl) map[a.publicUrl] = a
    }
    return map
  }, [libraryConfig])

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
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Autosave failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [])

  const updateConfig = useCallback((updater) => {
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

  const handleSelectPage = useCallback((pageId) => {
    setSelectedPageId(pageId)
    setShowLibrary(false)
  }, [])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        Loading...
      </div>
    )
  }

  if (!session || !siteConfig) return null

  const selectedPage = selectedPageId
    ? siteConfig.pages.find(p => p.id === selectedPageId) || null
    : null

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
    />
  )

  const panel = (selectedPage && selectedPage.type !== 'link') ? (
    <PageEditorSidebar
      page={selectedPage}
      siteConfig={siteConfig}
      libraryConfig={libraryConfig}
      saveStatus={saveStatus}
      onPageChange={(updated) => updatePage(selectedPageId, updated)}
      onBack={null}
      onMoveBlockToPage={handleMoveBlockToPage}
      onUpdateLibraryCaption={handleUpdateLibraryCaption}
      username={session?.user?.username}
      blockBuilderRef={blockBuilderRef}
      onScrollRatioChange={handleSidebarScrollRatio}
      highlightedBlockIndex={hoveredBlockIndex}
      onBlockHover={setHoveredBlockIndex}
    />
  ) : null



  let content
  if (showLibrary) {
    content = <AdminLibrary />
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
      const slideshowHref = (selectedPage.slideshow?.enabled && username)
        ? `/sites/${username}/${selectedPage.slug || selectedPage.id}/slideshow`
        : null
      const navVariant = selectedPage.cover?.imageUrl ? undefined : 'header-dropdown'
      const isChildPage = !!selectedPage.parentId
      const childPages = isChildPage
        ? siteConfig.pages.filter(p => p.parentId === selectedPage.parentId && p.showInNav !== false)
        : siteConfig.pages.filter(p => p.parentId === selectedPage.id && p.showInNav !== false)
      const activeChildId = isChildPage ? selectedPage.id : null
      content = (
        <div ref={previewContainerRef} onScroll={handlePreviewScroll} className="flex-1 h-full min-w-0 overflow-y-auto bg-white relative">
          <SiteNav siteConfig={siteConfig} username={username} variant={navVariant} onPageClick={handleSelectPage} />
          <PageCover
                cover={selectedPage.cover}
                title={selectedPage.title}
                description={selectedPage.description}
                slideshowHref={slideshowHref}
              />
          <GalleryPreview
            gallery={{
              name: selectedPage.title,
              description: selectedPage.description || '',
              blocks: selectedPage.blocks || [],
            }}
            pages={siteConfig.pages}
            childPages={childPages}
            activeChildId={activeChildId}
            username={username}
            assetsByUrl={assetsByUrl}
            noWrap
            enableSlideshow={!!slideshowHref}
            onSlideshowClick={() => { if (slideshowHref) window.open(slideshowHref, '_blank', 'noopener,noreferrer') }}
            onChildPageClick={handleSelectPage}
            highlightedBlockIndex={hoveredBlockIndex}
            onBlockHover={setHoveredBlockIndex}
          />
        </div>
      )
    }
  } else {
    content = (
      <div className="flex items-center justify-center h-full text-sm text-gray-300">
        Select a page to edit
      </div>
    )
  }

  return (
    <DragProvider>
      <AdminLayout sidebar={sidebar} panel={panel}>
        {content}
      </AdminLayout>
      {thumbnailPickerPageId && (
        <PhotoPickerModal
          images={libraryConfig?.images || []}
          loading={!libraryConfig}
          blockType="photo"
          onConfirm={handleThumbnailConfirm}
          onClose={() => setThumbnailPickerPageId(null)}
        />
      )}
    </DragProvider>
  )
}
