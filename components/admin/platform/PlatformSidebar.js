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
  if (status === 'saving') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--ink-4)' }}>Saving…</span>
  if (status === 'saved') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--ink-4)' }}>Saved</span>
  if (status === 'error') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: '#a63232' }}>Save failed</span>
  return null
}

const iconBtnStyle = {
  width: 24, height: 24,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: 0, cursor: 'pointer',
  color: 'var(--ink-3)', borderRadius: 3,
}

const pageRowBaseStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '7px 10px',
  background: 'none', border: 0, cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)',
  borderRadius: 3,
  width: '100%',
  transition: 'background 120ms',
}

function PageRowInner({ page, isActive, isPageNestTarget, isImageDropTarget, isLink, typeIcon, onSelect, onSettings, onLinkEdit, onMenu }) {
  const [hover, setHover] = useState(false)

  let bg = 'none'
  let boxShadow = 'none'
  if (isPageNestTarget || isImageDropTarget) {
    bg = 'rgba(100,130,200,0.12)'
    boxShadow = 'inset 0 0 0 1px rgba(100,130,200,0.4)'
  } else if (isActive) {
    bg = 'var(--paper)'
    boxShadow = 'inset 2px 0 0 var(--ink)'
  } else if (hover) {
    bg = 'rgba(26,18,10,0.04)'
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...pageRowBaseStyle, background: bg, boxShadow, cursor: isLink ? 'default' : 'pointer' }}
    >
      <span style={{ color: 'var(--ink-3)', width: 14, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{typeIcon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</span>
      {(isPageNestTarget) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', flexShrink: 0 }}>nest</span>}
      {(isImageDropTarget && !isPageNestTarget) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', flexShrink: 0 }}>drop</span>}
      {/* Action buttons — visible on hover */}
      <span style={{ display: 'flex', gap: 2, opacity: hover ? 1 : 0, transition: 'opacity 120ms', flexShrink: 0 }}>
        {isLink ? (
          <button onClick={onLinkEdit} style={{ ...iconBtnStyle, width: 18, height: 18 }} title="Edit link">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        ) : (
          <button onClick={onSettings} style={{ ...iconBtnStyle, width: 18, height: 18 }} title="Page settings">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
        <button onClick={onMenu} style={{ ...iconBtnStyle, width: 18, height: 18 }} title="More">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>
      </span>
    </div>
  )
}

function SidebarFooterBtn({ icon, label, onClick, sub }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '8px 4px',
        background: hover ? 'rgba(26,18,10,0.05)' : 'none', border: 0, cursor: 'pointer',
        color: 'var(--ink-2)', borderRadius: 3, transition: 'background 120ms',
      }}
    >
      <span style={{ opacity: .75, color: 'var(--ink-3)' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--ink-4)' }}>{sub}</span>}
    </button>
  )
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
    const isHome = siteConfig.homePageId === page.id
    const isActive = selectedPageId === page.id

    const typeIcon = isHome
      ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ) : isLink ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )

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
          className="flex-shrink-0 flex items-center justify-center w-3 self-stretch cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePageDragStart(page, e)}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-4)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--rule-2)'}
          style={{ touchAction: 'none', color: 'var(--rule-2)' }}
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
              style={{
                width: '100%', padding: '6px 10px', margin: '2px 0',
                background: 'var(--paper)', border: '1px solid var(--accent)',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)',
                outline: 'none', borderRadius: 2, boxSizing: 'border-box',
              }}
            />
          ) : (
            <PageRowInner
              page={page}
              isActive={isActive}
              isPageNestTarget={isPageNestTarget}
              isImageDropTarget={isImageDropTarget}
              isLink={isLink}
              typeIcon={typeIcon}
              onSelect={() => {
                if (didDragRef.current || pageDragRef.current) return
                if (!isLink) onSelectPage?.(page.id)
              }}
              onSettings={(e) => {
                e.stopPropagation()
                if (pageSettingsId === page.id) { setPageSettingsId(null); setPageSettingsAnchorEl(null) }
                else { setPageSettingsId(page.id); setPageSettingsAnchorEl(e.currentTarget) }
              }}
              onLinkEdit={(e) => { e.stopPropagation(); setLinkEditId(linkEditId === page.id ? null : page.id) }}
              onMenu={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
            />
          )}

          {menuOpenId === page.id && (
            <div ref={menuRef} className="absolute right-2 top-7 z-10 py-1 w-40" style={{ background: 'var(--paper)', border: '1px solid var(--rule)', boxShadow: 'var(--pane-shadow)' }}>
              <button onClick={() => handleRenameStart(page)} className="w-full text-left px-3 py-1.5 text-xs" style={{ color: 'var(--ink-2)', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,10,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >Rename</button>
              {page.showInNav && page.type !== 'link' && siteConfig.homePageId !== page.id && (
                <button
                  onClick={() => {
                    setMenuOpenId(null)
                    onConfigChange(prev => ({ ...prev, homePageId: page.id }))
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs" style={{ color: 'var(--ink-2)', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,10,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Set as home page
                </button>
              )}
              <button onClick={() => { setMenuOpenId(null); handleDelete(page.id) }} className="w-full text-left px-3 py-1.5 text-xs" style={{ color: '#a63232', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(166,50,50,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >Delete</button>
            </div>
          )}

          {isLink && linkEditId === page.id && (
            <div className="mx-2 mb-2 p-2.5 space-y-2" style={{ background: 'var(--paper)', border: '1px solid var(--rule)', boxShadow: 'var(--pane-shadow)' }}>
              <div>
                <div className="text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em] mb-1">Label</div>
                <input
                  autoFocus
                  className="w-full text-sm border-b border-rule pb-1 outline-none focus:border-ink-3 text-ink-2 bg-transparent"
                  value={page.title || ''}
                  onChange={e => onConfigChange(prev => ({ ...prev, pages: prev.pages.map(p => p.id === page.id ? { ...p, title: e.target.value } : p) }))}
                />
              </div>
              <div>
                <div className="text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em] mb-1">URL</div>
                <input
                  type="url"
                  className="w-full text-sm border-b border-rule pb-1 outline-none focus:border-ink-3 text-ink-2 bg-transparent placeholder:text-ink-4"
                  placeholder="https://…"
                  value={page.url || ''}
                  onChange={e => onConfigChange(prev => ({ ...prev, pages: prev.pages.map(p => p.id === page.id ? { ...p, url: e.target.value } : p) }))}
                />
              </div>
              <button onClick={() => setLinkEditId(null)} className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-3 hover:text-ink">Done</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')
  const siteUrl = username ? `${username}.${rootDomain}` : rootDomain
  const initial = (siteName || username || 'P')[0].toUpperCase()

  return (
    <div className="flex flex-col h-full select-none" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>

      {/* App mark */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            Photohub
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', paddingTop: 1 }}>
            Edit
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            ref={siteSettingsGearRef}
            onClick={() => setSiteSettingsOpen(v => !v)}
            title="Site settings"
            style={iconBtnStyle}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            ref={accountAvatarRef}
            onClick={() => setAccountOpen(v => !v)}
            title="Account"
            style={{ ...iconBtnStyle, fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', fontWeight: 500, color: 'var(--paper)', background: 'var(--ink)', width: 24, height: 24 }}
          >
            {initial}
          </button>
        </div>
      </div>

      {/* Site switcher + publish */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--rule)' }}>
        <a
          href={`http://${siteUrl}`}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textDecoration: 'none',
            padding: '6px 8px',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 26, height: 26, flexShrink: 0,
            background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, fontStyle: 'italic',
            color: 'var(--paper)',
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {siteName || 'My Portfolio'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.06em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {siteUrl} ↗
            </div>
          </div>
        </a>

        <button style={{
          marginTop: 10, width: '100%',
          padding: '9px 10px',
          background: 'var(--ink)', color: 'var(--paper)',
          border: 0, borderRadius: 2,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b4c49f', flexShrink: 0 }} />
          Publish
        </button>

        <div style={{
          marginTop: 7,
          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em',
          color: 'var(--ink-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <SaveBadge status={saveStatus} />
          {saveStatus !== 'saving' && saveStatus !== 'error' && (
            <>
              {saveStatus === 'saved' && <span>·</span>}
              <span>Autosaved</span>
            </>
          )}
        </div>
      </div>

      {/* Pages — scrollable */}
      <div className="scroll-quiet" style={{ flex: 1, overflowY: 'auto' }}>
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
        <div style={{ position: 'relative', padding: '2px 10px 10px' }} ref={addMenuRef}>
          <button
            onClick={() => setAddMenuOpen(v => !v)}
            style={{ ...pageRowBaseStyle, color: 'var(--ink-4)', fontStyle: 'italic' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}
          >
            <span style={{ width: 14, display: 'flex', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </span>
            <span>Add page</span>
          </button>
          {addMenuOpen && (
            <div style={{ position: 'absolute', left: 10, bottom: '100%', marginBottom: 2, background: 'var(--paper)', border: '1px solid var(--rule)', boxShadow: 'var(--pane-shadow)', zIndex: 20, padding: '4px 0', minWidth: 140 }}>
              <button onClick={handleAddPage} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,10,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >Page</button>
              <button onClick={handleAddLink} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,10,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >Link ↗</button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--rule)', padding: '8px', background: 'var(--paper-3)', display: 'flex', gap: 2 }}>
        <SidebarFooterBtn icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
        } label="Library" onClick={onShowLibrary} />
        <SidebarFooterBtn icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg>
        } label="Theme" />
        <SidebarFooterBtn icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        } label="Settings" onClick={() => setSiteSettingsOpen(v => !v)} />
      </div>

      {/* Drag ghost */}
      {pageDrag && ghostPos && (
        <div
          className="fixed pointer-events-none z-[9999] px-3 py-1.5"
          style={{ left: ghostPos.x + 14, top: ghostPos.y - 10, background: 'var(--paper)', border: '1px solid var(--rule)', boxShadow: 'var(--pane-shadow)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)' }}
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
