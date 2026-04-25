// components/admin/platform/PlatformSidebar.js
import { useState, useEffect, useRef } from 'react'
import { useDrag } from '../../../common/dragContext'
import SidebarSection from './SidebarSection'
import { buildNavTree, flattenForOtherPages, movePage } from '../../../common/pagesTree'
import { defaultPage, defaultLink } from '../../../common/siteConfig'
import SiteSettingsPopover from './SiteSettingsPopover'
import PageSettingsPopover from './PageSettingsPopover'
import AccountPopover from './AccountPopover'

function SaveBadge({ status }) {
  if (status === 'saving') return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving…</span>
  if (status === 'saved') return <span className="text-xs" style={{ color: 'var(--sepia-accent)' }}>Saved</span>
  if (status === 'error') return <span className="text-xs text-red-500">Save failed</span>
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
  email,
  onDropImagesToPage,
  onPickThumbnail,
  assetsByUrl,
  onPickLogo,
  onPickFavicon,
  onPickCoverImage,
  onPickShareLarge,
  onPickShareSquare,
  onViewCover,
  onDisableCover,
}) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [linkEditId, setLinkEditId] = useState(null)
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false)
  const siteSettingsGearRef = useRef(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountAvatarRef = useRef(null)
  const [pageSettingsId, setPageSettingsId] = useState(null)
  const [pageSettingsAnchorEl, setPageSettingsAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const addMenuRef = useRef(null)
  const { drag, dropTargetPageId, setDropTargetPageId } = useDrag()

  // Custom page drag state
  const [pageDrag, setPageDrag] = useState(null) // { pageId, title }
  const [pageDropTarget, setPageDropTarget] = useState(null) // { type: 'nest'|'root'|'other', pageId? }
  const [ghostPos, setGhostPos] = useState(null)
  const pageDragRef = useRef(null)
  const pageDropTargetRef = useRef(null)
  const didDragRef = useRef(false)

  useEffect(() => {
    if (!menuOpenId && !addMenuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null)
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId, addMenuOpen])

  useEffect(() => {
    if (pageDrag) {
      document.body.style.cursor = 'grabbing'
      return () => { document.body.style.cursor = '' }
    }
  }, [pageDrag])

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
    onConfigChange(prev => {
      const pages = prev.pages.filter(p => p.id !== pageId)
      let homePageId = prev.homePageId
      if (homePageId === pageId) {
        homePageId = pages.find(p => p.showInNav && p.type !== 'link')?.id || null
      }
      return { ...prev, pages, homePageId }
    })
  }

  function nextAvailableId(base, existingIds) {
    let id = base; let n = 2
    while (existingIds.has(id)) { id = `${base}-${n++}` }
    return id
  }

  function handleAddPage() {
    setAddMenuOpen(false)
    const base = 'new-page'
    onConfigChange(prev => {
      const existingIds = new Set(prev.pages.map(p => p.id))
      const id = nextAvailableId(base, existingIds)
      const sortOrder = Math.max(0, ...prev.pages.filter(p => p.showInNav).map(p => p.sortOrder ?? 0)) + 1
      return { ...prev, pages: [...prev.pages, defaultPage({ id, title: 'New Page', sortOrder, showInNav: true, parentId: null })] }
    })
    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    const id = nextAvailableId(base, existingIds)
    onSelectPage?.(id); setRenamingId(id); setRenameValue('New Page')
  }

  function handleAddLink() {
    setAddMenuOpen(false)
    const base = 'new-link'
    onConfigChange(prev => {
      const existingIds = new Set(prev.pages.map(p => p.id))
      const id = nextAvailableId(base, existingIds)
      const sortOrder = Math.max(0, ...prev.pages.filter(p => p.showInNav).map(p => p.sortOrder ?? 0)) + 1
      return { ...prev, pages: [...prev.pages, defaultLink({ id, title: 'New Link', sortOrder, showInNav: true, parentId: null })] }
    })
    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    const id = nextAvailableId(base, existingIds)
    onSelectPage?.(id); setRenamingId(id); setRenameValue('New Link')
  }

  function handlePageDragStart(page, e) {
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const dragInfo = { pageId: page.id, title: page.title }
    pageDragRef.current = dragInfo
    didDragRef.current = false

    function onMove(e) {
      if (!didDragRef.current) {
        const dx = e.clientX - startX, dy = e.clientY - startY
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
        didDragRef.current = true
        setPageDrag(dragInfo)
      }
      setGhostPos({ x: e.clientX, y: e.clientY })
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const pageRow = el?.closest('[data-page-id]')
      const inMainNav = !!el?.closest('[data-droppable="main-nav"]')
      const inOtherPages = !!el?.closest('[data-droppable="other-pages"]')

      let target = null
      if (pageRow && inMainNav) {
        const targetId = pageRow.dataset.pageId
        if (targetId !== pageDragRef.current?.pageId) {
          target = { type: 'nest', pageId: targetId }
        }
      } else if (inMainNav) {
        target = { type: 'root' }
      } else if (inOtherPages) {
        target = { type: 'other' }
      }

      pageDropTargetRef.current = target
      setPageDropTarget(target)
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      const currentDrag = pageDragRef.current
      const target = pageDropTargetRef.current
      const wasDrag = didDragRef.current
      pageDragRef.current = null
      pageDropTargetRef.current = null
      didDragRef.current = false
      setPageDrag(null)
      setGhostPos(null)
      setPageDropTarget(null)

      if (!currentDrag || !wasDrag) return

      if (target?.type === 'nest') {
        onConfigChange(prev => {
          const siblings = prev.pages.filter(p => p.parentId === target.pageId && p.showInNav)
          const sortOrder = Math.max(0, ...siblings.map(p => p.sortOrder ?? 0)) + 1
          return { ...prev, pages: movePage(prev.pages, currentDrag.pageId, { showInNav: true, parentId: target.pageId, sortOrder }) }
        })
      } else if (target?.type === 'root') {
        onConfigChange(prev => {
          const roots = prev.pages.filter(p => p.showInNav && !p.parentId)
          const sortOrder = Math.max(0, ...roots.map(p => p.sortOrder ?? 0)) + 1
          return { ...prev, pages: movePage(prev.pages, currentDrag.pageId, { showInNav: true, parentId: null, sortOrder }) }
        })
      } else if (target?.type === 'other') {
        onConfigChange(prev => {
          const others = prev.pages.filter(p => !p.showInNav)
          const sortOrder = Math.max(0, ...others.map(p => p.sortOrder ?? 0)) + 1
          return { ...prev, pages: movePage(prev.pages, currentDrag.pageId, { showInNav: false, sortOrder }) }
        })
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  function renderPageRow(page) {
    const isImageDropTarget = drag !== null && dropTargetPageId === page.id && page.id !== drag?.sourcePageId
    const isPageNestTarget = pageDropTarget?.type === 'nest' && pageDropTarget.pageId === page.id
    const isLink = page.type === 'link'

    return (
      <div
        className="relative flex items-start"
        data-page-id={page.id}
        onPointerEnter={() => drag && setDropTargetPageId(page.id)}
        onPointerLeave={() => drag && setDropTargetPageId(null)}
        onDragOver={(e) => { if (drag) { e.preventDefault(); setDropTargetPageId(page.id) } }}
        onDragLeave={(e) => { if (drag && !e.currentTarget.contains(e.relatedTarget)) setDropTargetPageId(null) }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation()
          setDropTargetPageId(null)
          if (!drag) return
          if (drag.type === 'images' && page.id !== drag.sourcePageId) {
            onDropImagesToPage?.(page.id, drag.imageRefs, drag.sourceBlockType, drag.sourcePageId, drag.sourceBlockIndex)
          }
        }}
      >
        <div
          className="flex-shrink-0 flex items-center justify-center w-5 pl-1 self-stretch cursor-grab active:cursor-grabbing transition-colors"
          onPointerDown={(e) => handlePageDragStart(page, e)}
          style={{ touchAction: 'none', color: 'var(--border)' }}
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
            <circle cx="1.5" cy="1.5" r="1" /><circle cx="4.5" cy="1.5" r="1" />
            <circle cx="1.5" cy="5" r="1" /><circle cx="4.5" cy="5" r="1" />
            <circle cx="1.5" cy="8.5" r="1" /><circle cx="4.5" cy="8.5" r="1" />
          </svg>
        </div>
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
              onClick={() => {
                if (didDragRef.current || pageDragRef.current) return
                if (!isLink) onSelectPage?.(page.id)
              }}
              className={`flex items-center px-3 py-1.5 rounded cursor-pointer group transition-colors ${
                isPageNestTarget
                  ? 'bg-blue-50 ring-1 ring-blue-400 text-blue-700'
                  : isImageDropTarget
                  ? 'bg-blue-50 ring-1 ring-blue-300 text-blue-700'
                  : selectedPageId === page.id
                  ? 'font-medium'
                  : 'hover:bg-[#ede8e0]'
              }`}
              style={
                isPageNestTarget || isImageDropTarget
                  ? undefined
                  : selectedPageId === page.id
                  ? { background: 'var(--panel-hover)', color: 'var(--text-primary)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <span className="flex-1 truncate">{page.title}</span>
              {siteConfig.homePageId === page.id && (
                <svg className="w-3 h-3 flex-shrink-0 mr-1" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              )}
              {isLink && <span className="text-[10px] flex-shrink-0 ml-1" style={{ color: 'var(--text-muted)' }}>↗</span>}
              {isPageNestTarget && <span className="text-[10px] text-blue-500 flex-shrink-0 ml-1">nest here</span>}
              {isImageDropTarget && !isPageNestTarget && <span className="text-[10px] text-blue-500 flex-shrink-0 ml-1">Drop</span>}
              {isLink && (
                <button
                  onClick={e => { e.stopPropagation(); setLinkEditId(linkEditId === page.id ? null : page.id) }}
                  className="ml-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  title="Edit link"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </button>
              )}
              {!isLink && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (pageSettingsId === page.id) { setPageSettingsId(null); setPageSettingsAnchorEl(null) }
                    else { setPageSettingsId(page.id); setPageSettingsAnchorEl(e.currentTarget) }
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  title="Page settings"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
                className="ml-1 opacity-0 group-hover:opacity-100 px-1 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              >
                ···
              </button>
            </div>
          )}

          {menuOpenId === page.id && (
            <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white rounded-lg shadow-popup py-1 w-40" style={{ border: '1px solid var(--border)' }}>
              <button onClick={() => handleRenameStart(page)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Rename</button>
              {page.showInNav && page.type !== 'link' && siteConfig.homePageId !== page.id && (
                <button
                  onClick={() => {
                    setMenuOpenId(null)
                    onConfigChange(prev => ({ ...prev, homePageId: page.id }))
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Set as home page
                </button>
              )}
              <button onClick={() => { setMenuOpenId(null); handleDelete(page.id) }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
            </div>
          )}

          {isLink && linkEditId === page.id && (
            <div className="mx-2 mb-2 p-2.5 bg-white rounded-lg shadow-popup space-y-2" style={{ border: '1px solid var(--border)' }}>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Label</div>
                <input
                  autoFocus
                  className="w-full text-sm pb-1 outline-none bg-transparent focus:border-[#8b6f47]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  value={page.title || ''}
                  onChange={e => onConfigChange(prev => ({ ...prev, pages: prev.pages.map(p => p.id === page.id ? { ...p, title: e.target.value } : p) }))}
                />
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>URL</div>
                <input
                  type="url"
                  className="w-full text-sm pb-1 outline-none bg-transparent focus:border-[#8b6f47]"
                  style={{ borderBottom: '1px solid var(--border)', '--tw-placeholder-opacity': '1' }}
                  placeholder="https://…"
                  value={page.url || ''}
                  onChange={e => onConfigChange(prev => ({ ...prev, pages: prev.pages.map(p => p.id === page.id ? { ...p, url: e.target.value } : p) }))}
                />
              </div>
              <button onClick={() => setLinkEditId(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Done</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full select-none text-sm">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{siteName || 'My Portfolio'}</div>
          {username && (
            <a
              href={`http://${username}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs truncate block mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {username}.{(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')} ↗
            </a>
          )}
          <SaveBadge status={saveStatus} />
        </div>
        <button
          ref={siteSettingsGearRef}
          onClick={() => setSiteSettingsOpen(v => !v)}
          title="Site settings"
          className="w-6 h-6 flex items-center justify-center transition-colors flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          ref={accountAvatarRef}
          onClick={() => setAccountOpen(v => !v)}
          title="Account"
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-colors flex-shrink-0"
          style={{ background: 'var(--sepia-accent)' }}
        >
          {(username || 'U')[0].toUpperCase()}
        </button>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-y-auto">
        <SidebarSection
          label="Main Nav"
          pages={buildNavTree(pages)}
          renderRow={renderPageRow}
          droppableId="main-nav"
        />
        <SidebarSection
          label="Other Pages"
          pages={flattenForOtherPages(pages).filter(p => p.id !== 'home')}
          renderRow={renderPageRow}
          droppableId="other-pages"
        />

        {/* Add menu */}
        <div className="relative mx-2 mt-1" ref={addMenuRef}>
          <button
            onClick={() => setAddMenuOpen(v => !v)}
            className="flex items-center w-full px-3 py-1.5 text-sm rounded hover:bg-[#ede8e0]"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="mr-1.5">+</span> Add
          </button>
          {addMenuOpen && (
            <div className="absolute left-0 bottom-full mb-1 bg-white rounded-lg shadow-popup z-20 py-1 w-36" style={{ border: '1px solid var(--border)' }}>
              <button onClick={handleAddPage} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Page</button>
              <button onClick={handleAddLink} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Link ↗</button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)' }} className="flex-shrink-0">
        <button
          onClick={onShowLibrary}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="font-mono text-[11px] uppercase tracking-[0.06em]">Library</span>
        </button>
      </div>

      {/* Drag ghost */}
      {pageDrag && ghostPos && (
        <div
          className="fixed pointer-events-none z-[9999] bg-white shadow-lg px-3 py-1.5 rounded text-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          style={{ left: ghostPos.x + 14, top: ghostPos.y - 10 }}
        >
          {pageDrag.title}
        </div>
      )}

      {siteSettingsOpen && (
        <SiteSettingsPopover
          siteConfig={siteConfig}
          anchorEl={siteSettingsGearRef.current}
          onUpdate={onConfigChange}
          onClose={() => setSiteSettingsOpen(false)}
          onPickLogo={onPickLogo}
          onPickFavicon={onPickFavicon}
          onPickCoverImage={onPickCoverImage}
          onPickShareLarge={onPickShareLarge}
          onPickShareSquare={onPickShareSquare}
          onViewCover={onViewCover}
          onDisableCover={onDisableCover}
        />
      )}

      {accountOpen && (
        <AccountPopover
          siteConfig={siteConfig}
          username={username}
          email={email}
          anchorEl={accountAvatarRef.current}
          onUpdate={onConfigChange}
          onClose={() => setAccountOpen(false)}
          onSignOut={onSignOut}
        />
      )}

      {pageSettingsId && pageSettingsAnchorEl && (() => {
        const settingsPage = pages.find(p => p.id === pageSettingsId)
        if (!settingsPage) return null
        return (
          <PageSettingsPopover
            page={settingsPage}
            anchorEl={pageSettingsAnchorEl}
            onUpdate={(updatedPage) => {
              onConfigChange(prev => ({
                ...prev,
                pages: prev.pages.map(p => p.id === pageSettingsId ? updatedPage : p),
              }))
            }}
            onClose={() => { setPageSettingsId(null); setPageSettingsAnchorEl(null) }}
            username={username}
            onPickThumbnail={onPickThumbnail ? () => onPickThumbnail(pageSettingsId) : undefined}
            siteConfig={siteConfig}
            assetsByUrl={assetsByUrl}
          />
        )
      })()}
    </div>
  )
}
