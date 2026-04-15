// components/admin/platform/PlatformSidebar.js
import { useState, useEffect, useRef } from 'react'

function SaveBadge({ status }) {
  if (status === 'saving') return <span className="text-xs text-gray-400">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-green-500">Saved</span>
  if (status === 'error') return <span className="text-xs text-red-500">Save failed</span>
  return null
}

function PublishBadge({ publishedAt }) {
  if (publishedAt) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        Published
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
      Draft
    </span>
  )
}

export default function PlatformSidebar({ siteConfig, saveStatus, onConfigChange, onSignOut, selectedPageId, onSelectPage }) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpenId) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId])

  if (!siteConfig) return null

  const { pages = [], siteName, publishedAt } = siteConfig

  function handleRenameStart(page) {
    setRenamingId(page.id)
    setRenameValue(page.title)
    setMenuOpenId(null)
  }

  function handleRenameCommit(pageId) {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingId(null); return }
    onConfigChange(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, title: trimmed } : p),
    }))
    setRenamingId(null)
  }

  function handleDelete(pageId) {
    if (!confirm('Delete this page? This cannot be undone.')) return
    onConfigChange(prev => ({
      ...prev,
      pages: prev.pages.filter(p => p.id !== pageId),
    }))
  }

  function handleAddPage() {
    const title = 'New Page'
    const baseId = 'new-page'

    onConfigChange(prev => {
      const existingIds = new Set(prev.pages.map(p => p.id))
      let id = baseId
      let n = 2
      while (existingIds.has(id)) { id = `${baseId}-${n++}` }
      const newPage = { id, title, showInNav: true, thumbnailUrl: '', blocks: [] }
      return { ...prev, pages: [...prev.pages, newPage] }
    })

    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    let id = baseId
    let n = 2
    while (existingIds.has(id)) { id = `${baseId}-${n++}` }
    setRenamingId(id)
    setRenameValue(title)
  }

  function handlePublishToggle() {
    onConfigChange(prev => ({
      ...prev,
      publishedAt: prev.publishedAt ? null : new Date().toISOString(),
    }))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 select-none">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="font-bold text-gray-900 text-base truncate">{siteName || 'My Portfolio'}</div>
        <div className="flex items-center gap-2 mt-1">
          <PublishBadge publishedAt={publishedAt} />
          <SaveBadge status={saveStatus} />
        </div>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-1 mb-1">
          Pages
        </div>

        {pages.map(page => (
          <div key={page.id} className="relative">
            {renamingId === page.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => handleRenameCommit(page.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameCommit(page.id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                className="w-full px-3 py-1.5 text-sm border border-blue-400 rounded-md outline-none bg-white"
              />
            ) : (
              <div
                onClick={() => onSelectPage?.(page.id)}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm cursor-pointer group ${
                  selectedPageId === page.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex-1 truncate">{page.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
                  className={`ml-1 opacity-0 group-hover:opacity-100 px-1 ${selectedPageId === page.id ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  ···
                </button>
              </div>
            )}

            {menuOpenId === page.id && (
              <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 w-32">
                <button
                  onClick={() => handleRenameStart(page)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Rename
                </button>
                <button
                  onClick={() => { setMenuOpenId(null); handleDelete(page.id) }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleAddPage}
          className="flex items-center w-full px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md mt-1"
        >
          <span className="mr-2">+</span> Add Page
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0 space-y-1">
        <button
          onClick={handlePublishToggle}
          className={`w-full py-1.5 rounded-md text-sm font-medium transition-colors ${
            publishedAt
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {publishedAt ? 'Unpublish' : 'Publish'}
        </button>
        <div className="flex items-center px-3 py-1.5 text-sm text-gray-400 rounded-md">
          <span className="flex-1">Theme: Minimal Light</span>
        </div>
        <button
          onClick={onSignOut}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded-md"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
