// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { DragProvider } from '../../common/dragContext'
import { buildMultiImageFields, buildSingleImageFields } from '../../common/assetRefs'
import AdminLayout from '../../components/admin/platform/AdminLayout'
import PlatformSidebar from '../../components/admin/platform/PlatformSidebar'
import PageEditorSidebar from '../../components/admin/platform/PageEditorSidebar'
import GalleryPreview from '../../components/admin/gallery-builder/GalleryPreview'
import AdminLibrary from '../../components/admin/AdminLibrary'

const AUTOSAVE_DELAY = 1500

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const [siteConfig, setSiteConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const autosaveTimer = useRef(null)

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

  const handleDropImagesToPage = useCallback((targetPageId, imageRefs, sourceBlockType) => {
    if (!imageRefs?.length) return
    const isMultiBlock = sourceBlockType === 'photos' || sourceBlockType === 'stacked' || sourceBlockType === 'masonry'
    const newBlock = isMultiBlock
      ? { type: sourceBlockType, ...buildMultiImageFields(imageRefs) }
      : { type: 'photo', ...buildSingleImageFields(imageRefs[0]) }
    updateConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p =>
        p.id === targetPageId
          ? { ...p, blocks: [...(p.blocks || []), newBlock] }
          : p
      ),
    }))
  }, [updateConfig])

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
      onDropImagesToPage={handleDropImagesToPage}
    />
  )

  const panel = selectedPage ? (
    <PageEditorSidebar
      page={selectedPage}
      siteConfig={siteConfig}
      saveStatus={saveStatus}
      onPageChange={(updated) => updatePage(selectedPageId, updated)}
      onBack={null}
      onMoveBlockToPage={handleMoveBlockToPage}
    />
  ) : null

  let content
  if (showLibrary) {
    content = <AdminLibrary />
  } else if (selectedPage) {
    content = (
      <GalleryPreview
        gallery={{
          name: selectedPage.title,
          description: selectedPage.description || '',
          blocks: selectedPage.blocks || [],
        }}
        pages={siteConfig.pages}
      />
    )
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
    </DragProvider>
  )
}
