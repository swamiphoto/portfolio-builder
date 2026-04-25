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
  onPublish,
  hasUnpublishedChanges,
  username,
  displayName,
  avatarImage,
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

  function PageTypeIcon({ page }) {
    const isHome = siteConfig.homePageId === page.id
    if (isHome) return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )
    if (page.type === 'link') return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    )
    if (page.type === 'text') return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )
    // gallery / default
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )
  }

  function renderPageRow(page, depth = 0) {
    const isImageDropTarget = drag !== null && dropTargetPageId === page.id && page.id !== drag?.sourcePageId
    const isPageNestTarget = pageDropTarget?.type === 'nest' && pageDropTarget.pageId === page.id
    const isLink = page.type === 'link'
    const isSelected = selectedPageId === page.id
    const isHome = siteConfig.homePageId === page.id

    return (
      <div
        className="relative"
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
            className="w-full px-3 py-1.5 text-sm border border-purple-400 rounded outline-none bg-transparent mx-1"
          />
        ) : (
          <div
            onClick={() => {
              if (didDragRef.current || pageDragRef.current) return
              if (!isLink) onSelectPage?.(page.id)
            }}
            className={`group relative flex items-center gap-[10px] py-[5px] mx-2 cursor-pointer transition-colors duration-[120ms] ${
              isPageNestTarget
                ? 'ring-1 ring-blue-400 bg-blue-50'
                : isImageDropTarget
                ? 'ring-1 ring-blue-300 bg-blue-50'
                : ''
            }`}
            style={{
              borderRadius: 3,
              paddingLeft: 10 + depth * 12,
              paddingRight: 10,
              background: isSelected ? '#f6f3ec' : undefined,
              boxShadow: isSelected ? '0 1px 4px rgba(26,18,10,0.10), 0 0 0 1px rgba(26,18,10,0.05)' : undefined,
            }}
            onMouseEnter={e => { if (!isSelected && !isPageNestTarget && !isImageDropTarget) e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
          >
            {/* Icon — page type normally, drag handle on hover */}
            <div
              className="flex-shrink-0 flex items-center justify-center"
              onPointerDown={(e) => handlePageDragStart(page, e)}
              style={{ touchAction: 'none', width: 14, color: '#6e685c' }}
            >
              <span className="group-hover:hidden flex items-center">
                <PageTypeIcon page={page} />
              </span>
              <span className="hidden group-hover:flex items-center cursor-grab active:cursor-grabbing">
                <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
                  <circle cx="1.5" cy="1.5" r="1" /><circle cx="4.5" cy="1.5" r="1" />
                  <circle cx="1.5" cy="5" r="1" /><circle cx="4.5" cy="5" r="1" />
                  <circle cx="1.5" cy="8.5" r="1" /><circle cx="4.5" cy="8.5" r="1" />
                </svg>
              </span>
            </div>

            {/* Page title */}
            <span
              className="flex-1 truncate"
              style={{ fontSize: 13, color: '#3a362f' }}
            >
              {page.title}
            </span>

            {/* Right side badges */}
            {isPageNestTarget && <span className="text-[10px] text-blue-500 flex-shrink-0">nest</span>}
            {isImageDropTarget && !isPageNestTarget && <span className="text-[10px] text-blue-500 flex-shrink-0">Drop</span>}

            {/* ... menu — appears on hover */}
            <button
              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-opacity duration-[120ms] text-sm leading-none"
              style={{ color: '#9e9788' }}
            >
              ···
            </button>
          </div>
        )}

        {menuOpenId === page.id && (
          <div ref={menuRef} className="absolute right-2 top-7 z-10 rounded-lg shadow-popup py-1 w-40" style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}>
            <button onClick={() => handleRenameStart(page)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Rename</button>
            {page.showInNav && page.type !== 'link' && siteConfig.homePageId !== page.id && (
              <button
                onClick={() => { setMenuOpenId(null); onConfigChange(prev => ({ ...prev, homePageId: page.id })) }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]"
                style={{ color: 'var(--text-primary)' }}
              >
                Set as home
              </button>
            )}
            <button onClick={() => { setMenuOpenId(null); handleDelete(page.id) }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
          </div>
        )}

        {isLink && linkEditId === page.id && (
          <div className="mx-2 mb-2 p-2.5 rounded-lg shadow-popup space-y-2" style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Label</div>
              <input
                autoFocus
                className="w-full text-sm pb-1 outline-none bg-transparent focus:border-[#8b6f47]"
                style={{ borderBottom: '1px solid var(--border)' }}
                value={page.title || ''}
                onChange={e => onConfigChange(prev => ({ ...prev, pages: prev.pages.map(p => p.id === page.id ? { ...p, title: e.target.value } : p) }))}
              />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>URL</div>
              <input
                type="url"
                className="w-full text-sm pb-1 outline-none bg-transparent focus:border-[#8b6f47]"
                style={{ borderBottom: '1px solid var(--border)' }}
                placeholder="https://…"
                value={page.url || ''}
                onChange={e => onConfigChange(prev => ({ ...prev, pages: prev.pages.map(p => p.id === page.id ? { ...p, url: e.target.value } : p) }))}
              />
            </div>
            <button onClick={() => setLinkEditId(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Done</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full select-none text-sm">
      {/* Header — Site switcher + Preview / Publish */}
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid #d8d2c3' }}>
        {/* Site switcher card */}
        <button
          ref={accountAvatarRef}
          onClick={() => setAccountOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 8px', background: '#f6f3ec', border: '1px solid #d8d2c3', borderRadius: 3, cursor: 'pointer' }}
          title="Account"
        >
          {avatarImage ? (
            <img src={avatarImage} alt="" style={{ width: 26, height: 26, flexShrink: 0, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 26, height: 26, flexShrink: 0, background: '#1d1b17', color: '#f6f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 14, fontWeight: 500, fontStyle: 'italic' }}>
              {(displayName || username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13.5, fontWeight: 500, color: '#1d1b17', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName || username || 'My Portfolio'}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6e685c', letterSpacing: '0.06em', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {username ? `${username}.sepia.photo` : ''}
            </div>
          </div>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9e9788" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Preview + Publish buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', border: '1px solid #9e9788', borderRadius: 2, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3a362f', background: 'transparent', cursor: 'pointer' }}
          >
            Preview
          </button>
          <button
            onClick={hasUnpublishedChanges ? onPublish : undefined}
            disabled={!hasUnpublishedChanges}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', background: '#1d1b17', color: '#f6f3ec', border: 0, borderRadius: 2, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: hasUnpublishedChanges ? 'pointer' : 'default', opacity: hasUnpublishedChanges ? 1 : 0.45 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasUnpublishedChanges ? '#e8925a' : '#b4c49f', flexShrink: 0, display: 'inline-block', transition: 'background 0.3s' }} />
            Publish
          </button>
        </div>

        {/* Published · Autosave status — spec: 9.5px mono centered, gap 6 */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'monospace', fontSize: 9.5, letterSpacing: '0.06em', color: '#9e9788' }}>
          {saveStatus === 'saving' ? (
            <span style={{ color: '#9e9788' }}>Saving…</span>
          ) : saveStatus === 'error' ? (
            <span style={{ color: '#c0392b' }}>Save failed</span>
          ) : (
            <>
              <span style={{ color: '#6e685c' }}>Published</span>
              <span>·</span>
              <span>Autosaved 2m ago</span>
            </>
          )}
        </div>
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

      {/* Footer — Library · Settings */}
      <div
        className="flex-shrink-0 flex items-stretch"
        style={{ borderTop: '1px solid var(--card-border)', background: '#e6e0d4' }}
      >
        <button
          onClick={onShowLibrary}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          style={{ color: '#6e685c' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,10,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
          title="Library"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ opacity: 0.75 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em]">Library</span>
        </button>

        <button
          ref={siteSettingsGearRef}
          onClick={() => setSiteSettingsOpen(v => !v)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          style={{ color: '#6e685c' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,10,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
          title="Site settings"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ opacity: 0.75 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em]">Settings</span>
        </button>
      </div>

      {/* Drag ghost */}
      {pageDrag && ghostPos && (
        <div
          className="fixed pointer-events-none z-[9999] bg-white shadow-lg px-3 py-1.5 rounded text-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', left: ghostPos.x + 14, top: ghostPos.y - 10 }}
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
