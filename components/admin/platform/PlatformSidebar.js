// components/admin/platform/PlatformSidebar.js
import { useState, useEffect, useRef } from 'react'
import Tip from '../Tip'
import { useDrag } from '../../../common/dragContext'
import SidebarSection from './SidebarSection'
import { buildNavTree, flattenForOtherPages, movePage } from '../../../common/pagesTree'
import { defaultPage, defaultLink } from '../../../common/siteConfig'
import SiteSettingsPopover from './SiteSettingsPopover'
import PageSettingsPopover from './PageSettingsPopover'
import AccountPopover from './AccountPopover'

function countPagePhotos(page) {
  if (!page.blocks) return 0
  return page.blocks.reduce((sum, block) => {
    if (block.type === 'photo') return sum + (block.imageUrl ? 1 : 0)
    if (['photos', 'stacked', 'masonry'].includes(block.type)) {
      const imgs = block.images || block.imageUrls || []
      return sum + imgs.length
    }
    return sum
  }, 0)
}

function relativeTime(ts) {
  if (!ts) return null
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

function StatusLine({ saveStatus, hasUnpublishedChanges, lastSavedAt, lastPublishedAt }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const base = { fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.04em', textAlign: 'center', marginBottom: 7 }

  if (saveStatus === 'saving') return <div style={{ ...base, color: '#9e9788' }}>Saving…</div>
  if (saveStatus === 'error') return <div style={{ ...base, color: '#c0392b' }}>Save failed</div>
  if (saveStatus === 'saved') return <div style={{ ...base, color: '#7a9e7e' }}>Saved</div>
  if (hasUnpublishedChanges && lastSavedAt) return <div style={{ ...base, color: '#9e9788' }}>Changes saved {relativeTime(lastSavedAt)}</div>
  if (!hasUnpublishedChanges && lastPublishedAt) return <div style={{ ...base, color: '#7a9e7e' }}>Published {relativeTime(lastPublishedAt)}</div>
  if (lastSavedAt) return <div style={{ ...base, color: '#9e9788' }}>Auto-saved {relativeTime(lastSavedAt)}</div>
  return <div style={{ ...base, color: 'transparent' }}>·</div>
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
  onCollapse,
  lastSavedAt,
  lastPublishedAt,
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
              boxShadow: isSelected ? '0 1px 3px rgba(26,18,10,0.06)' : undefined,
            }}
            onMouseEnter={e => { if (!isSelected && !isPageNestTarget && !isImageDropTarget) e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
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

            {/* Right side: gear + count/menu */}
            <div className="flex-shrink-0 flex items-center gap-0.5">
              {/* Settings gear — visible on hover */}
              <button
                onClick={e => { e.stopPropagation(); setPageSettingsId(page.id); setPageSettingsAnchorEl(e.currentTarget) }}
                className="w-5 h-5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity duration-[120ms] hover:bg-black/5"
                style={{ color: '#9e9788' }}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" y1="4" x2="14" y2="4"/>
                  <line x1="2" y1="8" x2="14" y2="8"/>
                  <line x1="2" y1="12" x2="14" y2="12"/>
                  <circle cx="5" cy="4" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="10" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="6.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              </button>

              {/* Count + menu share the same slot */}
              <div className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
                {!isLink && !isPageNestTarget && !isImageDropTarget && (() => {
                  const count = countPagePhotos(page)
                  return count > 0 ? (
                    <span
                      className="absolute group-hover:opacity-0 transition-opacity duration-[120ms]"
                      style={{ fontFamily: 'monospace', fontSize: 10, color: '#b0a490' }}
                    >
                      {count}
                    </span>
                  ) : null
                })()}
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity duration-[120ms] text-sm leading-none"
                  style={{ color: '#9e9788' }}
                >
                  ···
                </button>
              </div>
            </div>
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
            <button
              onClick={() => { setMenuOpenId(null); handleDelete(page.id) }}
              className="w-full text-left px-3 py-1.5 text-sm transition-colors"
              style={{ color: '#c14a4a', fontWeight: 500 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(193,74,74,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              Delete
            </button>
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
      {/* Header */}
      <div style={{ padding: '12px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* Avatar — click for account dropdown */}
          <Tip label="Account" side="right">
          <button
            ref={accountAvatarRef}
            onClick={() => setAccountOpen(v => !v)}
            style={{ flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', alignSelf: 'center' }}
          >
            {avatarImage ? (
              <img src={avatarImage} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1d1b17', color: '#f6f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, fontWeight: 400 }}>
                {(displayName || username || 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
          </Tip>

          {/* Name + username stacked */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 400, color: '#1d1b17', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName || username || 'My Portfolio'}
            </div>
            {username && (
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9e9788', letterSpacing: '0.04em', marginTop: 3, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                @{username}
              </div>
            )}
          </div>

          {/* Settings + Notifications + Collapse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Tip label="Notifications">
            <button
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, color: '#9e9788' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
            </Tip>
            <Tip label="Site settings">
            <button
              ref={siteSettingsGearRef}
              onClick={() => setSiteSettingsOpen(v => !v)}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, color: '#9e9788' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            </Tip>
            {onCollapse && (
              <Tip label="Collapse panel">
              <button
                onClick={onCollapse}
                style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, color: '#9e9788' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19L4 12l7-7" />
                </svg>
              </button>
              </Tip>
            )}
          </div>
        </div>
      </div>

      {/* Library — top of content */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #d8d2c3' }}>
        <button
          onClick={onShowLibrary}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 transition-colors"
          style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.05em', borderRadius: 5, border: '1px solid rgba(160,140,110,0.35)', background: 'transparent', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span>View Library</span>
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
          label="Not in nav"
          pages={flattenForOtherPages(pages).filter(p => p.id !== 'home')}
          renderRow={renderPageRow}
          droppableId="other-pages"
        />

        {/* Add menu */}
        <div className="relative mx-2 mt-1" ref={addMenuRef}>
          <button
            onClick={() => setAddMenuOpen(v => !v)}
            className="w-full py-2 transition-colors"
            style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.05em', borderRadius: 4, border: '1px dashed rgba(160,140,110,0.4)', background: 'transparent', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            + Add Page
          </button>
          {addMenuOpen && (
            <div className="absolute left-0 bottom-full mb-1 bg-white rounded-lg shadow-popup z-20 py-1 w-36" style={{ border: '1px solid var(--border)' }}>
              <button onClick={handleAddPage} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Page</button>
              <button onClick={handleAddLink} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Link ↗</button>
            </div>
          )}
        </div>
      </div>

      {/* Footer — Preview · Publish */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid var(--card-border)', background: '#ede8e0', padding: '10px 12px 12px' }}
      >
        <StatusLine saveStatus={saveStatus} hasUnpublishedChanges={hasUnpublishedChanges} lastSavedAt={lastSavedAt} lastPublishedAt={lastPublishedAt} />
        <div className="flex items-center gap-2">
          <Tip label="Preview site" side="top">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors"
            style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.05em', borderRadius: 5, border: '1px solid rgba(160,140,110,0.35)', background: 'transparent', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            onClick={() => { if (username) window.open(`/sites/${username}`, '_blank') }}
          >
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 16 16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 8a6 6 0 1012 0A6 6 0 002 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 2c-1.5 2-2.5 3.8-2.5 6s1 4 2.5 6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 2c1.5 2 2.5 3.8 2.5 6S9.5 12 8 14" />
              <path strokeLinecap="round" d="M2.5 6.5h11M2.5 9.5h11" />
            </svg>
            Preview
          </button>
          </Tip>

          {onPublish && (
            <Tip label={hasUnpublishedChanges ? 'Publish changes' : 'No unpublished changes'} side="top">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors"
              style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.05em', borderRadius: 5, border: 'none', background: hasUnpublishedChanges ? '#2c2416' : 'rgba(44,36,22,0.12)', color: hasUnpublishedChanges ? '#f6f3ec' : 'var(--text-muted)', cursor: hasUnpublishedChanges ? 'pointer' : 'default' }}
              onMouseEnter={e => { if (hasUnpublishedChanges) e.currentTarget.style.background = '#3d3020' }}
              onMouseLeave={e => { if (hasUnpublishedChanges) e.currentTarget.style.background = '#2c2416' }}
              onClick={hasUnpublishedChanges ? onPublish : undefined}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 16 16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V3M5 6l3-3 3 3" />
                <path strokeLinecap="round" d="M3 13h10" />
              </svg>
              Publish
            </button>
            </Tip>
          )}
        </div>

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
          username={username}
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
