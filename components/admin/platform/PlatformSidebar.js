// components/admin/platform/PlatformSidebar.js
import { useState, useEffect, useRef } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { useDrag } from '../../../common/dragContext'
import SidebarSection from './SidebarSection'
import { buildNavTree, flattenForOtherPages, movePage } from '../../../common/pagesTree'
import { defaultPage } from '../../../common/siteConfig'

function SaveBadge({ status }) {
  if (status === 'saving') return <span className="text-xs text-gray-400">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Saved</span>
  if (status === 'error') return <span className="text-xs text-red-600">Save failed</span>
  return null
}

export default function PlatformSidebar({
  siteConfig,
  saveStatus,
  onConfigChange,
  onSignOut,
  selectedPageId,
  onSelectPage,
  onShowLibrary,
  username,
  onDropImagesToPage,
}) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [siteMenuOpen, setSiteMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const siteMenuRef = useRef(null)
  const { drag, dropTargetPageId, setDropTargetPageId } = useDrag()

  useEffect(() => {
    if (!menuOpenId && !siteMenuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null)
      if (siteMenuRef.current && !siteMenuRef.current.contains(e.target)) setSiteMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId, siteMenuOpen])

  if (!siteConfig) return null

  const { pages = [], siteName } = siteConfig

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
      const sortOrder = Math.max(0, ...prev.pages.filter(p => p.showInNav).map(p => p.sortOrder ?? 0)) + 1
      const newPage = defaultPage({ id, title, sortOrder, showInNav: true, parentId: null })
      return { ...prev, pages: [...prev.pages, newPage] }
    })

    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    let id = baseId
    let n = 2
    while (existingIds.has(id)) { id = `${baseId}-${n++}` }
    onSelectPage?.(id)
    setRenamingId(id)
    setRenameValue(title)
  }

  function handlePageDragEnd(result) {
    if (!result.destination) return
    const { draggableId: pageId, destination } = result
    const dest = destination.droppableId

    let patch
    if (dest === 'other-pages') {
      patch = { showInNav: false, sortOrder: destination.index }
    } else if (dest === 'main-nav') {
      patch = { showInNav: true, parentId: null, sortOrder: destination.index }
    } else {
      // dest is a page id (nesting under that parent)
      patch = { showInNav: true, parentId: dest, sortOrder: destination.index }
    }
    onConfigChange(prev => ({ ...prev, pages: movePage(prev.pages, pageId, patch) }))
  }

  function renderPageRow(page, dragHandleProps) {
    const isDropTarget = drag !== null && dropTargetPageId === page.id && page.id !== drag.sourcePageId
    return (
      <div
        className="relative flex items-start"
        onPointerEnter={() => drag && setDropTargetPageId(page.id)}
        onPointerLeave={() => drag && setDropTargetPageId(null)}
        onDragOver={(e) => { if (drag) { e.preventDefault(); setDropTargetPageId(page.id) } }}
        onDragLeave={(e) => { if (drag && !e.currentTarget.contains(e.relatedTarget)) setDropTargetPageId(null) }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDropTargetPageId(null)
          if (!drag) return
          if (drag.type === 'images') {
            if (page.id === drag.sourcePageId) return
            onDropImagesToPage?.(page.id, drag.imageRefs, drag.sourceBlockType, drag.sourcePageId, drag.sourceBlockIndex)
          }
        }}
      >
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="flex-shrink-0 flex items-center justify-center w-3 self-stretch cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 transition-colors"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
              <circle cx="1.5" cy="1.5" r="1" />
              <circle cx="4.5" cy="1.5" r="1" />
              <circle cx="1.5" cy="5" r="1" />
              <circle cx="4.5" cy="5" r="1" />
              <circle cx="1.5" cy="8.5" r="1" />
              <circle cx="4.5" cy="8.5" r="1" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
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
            className="w-full px-3 py-1.5 text-sm border border-purple-400 rounded outline-none bg-white"
          />
        ) : (
          <div
            onClick={() => onSelectPage?.(page.id)}
            className={`flex items-center px-3 py-1.5 rounded cursor-pointer group transition-colors ${
              isDropTarget
                ? 'bg-blue-50 ring-1 ring-blue-300 text-blue-700'
                : selectedPageId === page.id
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex-1 truncate">{page.title}</span>
            {isDropTarget && <span className="text-[10px] text-blue-500 flex-shrink-0 ml-1">Drop</span>}
            <button
              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
              className="ml-1 opacity-0 group-hover:opacity-100 px-1 text-gray-400 transition-opacity"
            >
              ···
            </button>
          </div>
        )}

        {menuOpenId === page.id && (
          <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-lg shadow-popup py-1 w-32">
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
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full select-none text-sm">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{siteName || 'My Portfolio'}</div>
          {username && (
            <a
              href={`http://${username}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 truncate block mt-0.5"
            >
              {username}.{(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')} ↗
            </a>
          )}
          <SaveBadge status={saveStatus} />
        </div>
        <div className="relative" ref={siteMenuRef}>
          <button
            onClick={() => setSiteMenuOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors"
          >
            ···
          </button>
          {siteMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-popup z-20 py-1 w-40">
              <button
                onClick={() => { setSiteMenuOpen(false); onSignOut?.() }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="px-4 py-2.5 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-500 mb-1">Theme</div>
        <select
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-purple-500 bg-white"
          value={siteConfig.theme || 'minimal-light'}
          onChange={e => onConfigChange(prev => ({ ...prev, theme: e.target.value }))}
        >
          <option value="minimal-light">Minimal Light</option>
          <option value="minimal-dark">Minimal Dark</option>
          <option value="editorial">Editorial</option>
        </select>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-y-auto">
        <DragDropContext onDragEnd={handlePageDragEnd}>
          <SidebarSection
            label="Main Nav"
            pages={buildNavTree(pages)}
            renderRow={renderPageRow}
            droppableId="main-nav"
            nestable={true}
          />
          <SidebarSection
            label="Other Pages"
            pages={flattenForOtherPages(pages)}
            renderRow={renderPageRow}
            droppableId="other-pages"
          />
        </DragDropContext>
        <button
          onClick={handleAddPage}
          className="flex items-center w-full px-3 py-1.5 text-sm text-gray-400 rounded hover:bg-gray-50 mt-1 mx-2"
        >
          <span className="mr-1.5">+</span> Add Page
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <button
          onClick={onShowLibrary}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Library
        </button>
      </div>
    </div>
  )
}
