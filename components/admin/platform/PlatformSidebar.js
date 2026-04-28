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

// Design tokens
const C = {
  text: '#1d1b17',
  textBody: '#3a362f',
  textMuted: '#9e9788',
  textFaint: '#b0a490',
  accent: '#8b6f47',
  ink: '#2c2416',
  inkText: '#f6f3ec',
  selected: '#f6f3ec',
  borderSoft: 'rgba(26,18,10,0.07)',
  borderStrong: 'rgba(26,18,10,0.14)',
}
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"

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

  const base = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.04em', textAlign: 'center', marginBottom: 10 }

  if (saveStatus === 'saving') return <div style={{ ...base, color: C.textFaint }}>Saving…</div>
  if (saveStatus === 'error') return <div style={{ ...base, color: '#c0392b' }}>Save failed</div>
  if (saveStatus === 'saved') return <div style={{ ...base, color: '#7a9e7e' }}>Saved</div>
  if (hasUnpublishedChanges && lastSavedAt) return <div style={{ ...base, color: C.textFaint }}>Saved {relativeTime(lastSavedAt)}</div>
  if (!hasUnpublishedChanges && lastPublishedAt) return <div style={{ ...base, color: '#7a9e7e' }}>Published {relativeTime(lastPublishedAt)}</div>
  if (lastSavedAt) return <div style={{ ...base, color: C.textFaint }}>Auto-saved {relativeTime(lastSavedAt)}</div>
  return <div style={{ ...base, color: 'transparent' }}>·</div>
}

// Icons — page type icons match the Sepia spec (Heroicons outline, strokeWidth 1.5, rounded).
function IconHome(p) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"/></svg>
}
function IconGallery(p) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
}
function IconText(p) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
}
function IconLink(p) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
}
function IconLibrary(p) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="4" height="16" rx="0.5"/><rect x="9" y="4" width="4" height="16" rx="0.5"/><path d="M16 5l3.5-1 2 14.5-3.5 1z"/></svg>
}
function IconSettings(p) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}
function IconBell(p) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>
}
function IconCollapse(p) {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 13L5 8l5-5"/></svg>
}
function IconPreview(p) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
}
function IconPublish(p) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
}
function IconPlus(p) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>
}
function IconDots(p) {
  return <svg width="11" height="3" viewBox="0 0 11 3" fill="currentColor" {...p}><circle cx="1.5" cy="1.5" r="1"/><circle cx="5.5" cy="1.5" r="1"/><circle cx="9.5" cy="1.5" r="1"/></svg>
}
function IconDragHandle(p) {
  return <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" {...p}><circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/><circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/><circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/></svg>
}

function IconButton({ children, onClick, label }) {
  return (
    <Tip label={label}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: C.textMuted,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        {children}
      </button>
    </Tip>
  )
}

function UtilityButton({ icon, label, active, onClick, btnRef }) {
  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        height: 32, padding: '0 8px', borderRadius: 5,
        background: active ? C.selected : 'transparent',
        border: 'none',
        color: active ? C.accent : C.textBody,
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
        cursor: 'pointer', transition: 'background 120ms',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}{label}
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
  const [dotsAnchorEl, setDotsAnchorEl] = useState(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [linkEditId, setLinkEditId] = useState(null)
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false)
  const siteSettingsRef = useRef(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountAvatarRef = useRef(null)
  const [pageSettingsId, setPageSettingsId] = useState(null)
  const [pageSettingsAnchorEl, setPageSettingsAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const addMenuRef = useRef(null)
  const { drag, dropTargetPageId, setDropTargetPageId } = useDrag()

  // Custom page drag state
  const [pageDrag, setPageDrag] = useState(null)
  const [pageDropTarget, setPageDropTarget] = useState(null)
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
      const sortOrder = Math.max(0, ...prev.pages.filter(p => !p.showInNav).map(p => p.sortOrder ?? 0)) + 1
      return { ...prev, pages: [...prev.pages, defaultPage({ id, title: 'New Page', sortOrder, showInNav: false, parentId: null })] }
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
      const sortOrder = Math.max(0, ...prev.pages.filter(p => !p.showInNav).map(p => p.sortOrder ?? 0)) + 1
      return { ...prev, pages: [...prev.pages, defaultLink({ id, title: 'New Link', sortOrder, showInNav: false, parentId: null })] }
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
    if (isHome) return <IconHome />
    if (page.type === 'link') return <IconLink />
    if (page.type === 'text') return <IconText />
    return <IconGallery />
  }

  function renderPageRow(page, depth = 0) {
    const isImageDropTarget = drag !== null && dropTargetPageId === page.id && page.id !== drag?.sourcePageId
    const isPageNestTarget = pageDropTarget?.type === 'nest' && pageDropTarget.pageId === page.id
    const isLink = page.type === 'link'
    const isSelected = selectedPageId === page.id
    const count = !isLink ? countPagePhotos(page) : null

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
            className="group relative"
            onClick={() => {
              if (didDragRef.current || pageDragRef.current) return
              if (!isLink) onSelectPage?.(page.id)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '0 8px', padding: `4px 10px`,
              paddingLeft: 10 + depth * 18,
              borderRadius: 5, cursor: 'pointer',
              background: isSelected
                ? C.selected
                : isPageNestTarget
                ? 'rgba(60,100,200,0.06)'
                : isImageDropTarget
                ? 'rgba(60,100,200,0.06)'
                : 'transparent',
              boxShadow: isSelected ? '0 1px 2px rgba(26,18,10,0.05), inset 0 0 0 1px rgba(139,111,71,0.12)' : undefined,
              transition: 'background 120ms',
              outline: (isPageNestTarget || isImageDropTarget) ? '1px solid rgba(60,100,200,0.3)' : undefined,
            }}
            onMouseEnter={e => { if (!isSelected && !isPageNestTarget && !isImageDropTarget) e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }}
            onMouseLeave={e => { if (!isSelected && !isPageNestTarget && !isImageDropTarget) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Icon / drag handle */}
            <div
              className="flex-shrink-0 flex items-center justify-center"
              onPointerDown={(e) => handlePageDragStart(page, e)}
              style={{ touchAction: 'none', width: 14, color: isSelected ? C.accent : C.textMuted }}
            >
              <span className="group-hover:hidden flex items-center">
                <PageTypeIcon page={page} />
              </span>
              <span className="hidden group-hover:flex items-center cursor-grab active:cursor-grabbing">
                <IconDragHandle />
              </span>
            </div>

            {/* Title */}
            <span
              className="flex-1 truncate"
              style={{ fontSize: 13, color: isSelected ? C.text : C.textBody, fontWeight: isSelected ? 600 : 400 }}
            >
              {page.title}
            </span>

            {/* Drop badges */}
            {isPageNestTarget && <span className="text-[10px] text-blue-500 flex-shrink-0">nest</span>}
            {isImageDropTarget && !isPageNestTarget && <span className="text-[10px] text-blue-500 flex-shrink-0">Drop</span>}

            {/* Right slot: count / dots */}
            {!isPageNestTarget && !isImageDropTarget && (
              <div className="relative flex-shrink-0" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {count != null && count > 0 && (
                  <span
                    className="absolute group-hover:opacity-0 transition-opacity duration-[120ms] flex items-center justify-center w-full h-full"
                    style={{ fontFamily: MONO, fontSize: 10, color: C.textFaint }}
                  >
                    {count}
                  </span>
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setDotsAnchorEl(e.currentTarget)
                    setMenuOpenId(menuOpenId === page.id ? null : page.id)
                  }}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity duration-[120ms]"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}
                >
                  <IconDots />
                </button>
              </div>
            )}
          </div>
        )}

        {menuOpenId === page.id && (
          <div ref={menuRef} className="absolute right-2 top-7 z-10 rounded-lg shadow-popup py-1 w-40" style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => {
                const anchor = dotsAnchorEl
                setMenuOpenId(null)
                setPageSettingsId(page.id)
                setPageSettingsAnchorEl(anchor)
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]"
              style={{ color: 'var(--text-primary)' }}
            >
              Settings
            </button>
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

  const navPages = buildNavTree(pages)
  const hiddenPages = flattenForOtherPages(pages).filter(p => p.id !== 'home')

  return (
    <div className="flex flex-col h-full select-none text-sm">

      {/* MASTHEAD */}
      <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${C.borderSoft}` }}>
        {/* Top utility row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textFaint }}>
            ◐ Sepia
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            <IconButton label="Notifications">
              <IconBell />
            </IconButton>
            {onCollapse && (
              <IconButton label="Collapse panel" onClick={onCollapse}>
                <IconCollapse />
              </IconButton>
            )}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontFamily: SERIF, fontSize: 22, color: C.text,
            lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.01em',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}
        >
          {displayName || username || 'My Portfolio'}
        </div>

        {/* URL */}
        {username && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textFaint, letterSpacing: '0.06em', marginTop: 4 }}>
            {username}.sepia.photo
          </div>
        )}

        {/* Preview / Publish */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <Tip label="Preview site" side="bottom">
            <button
              type="button"
              onClick={() => { if (username) window.open(`/sites/${username}`, '_blank') }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 28, padding: '0 10px', borderRadius: 5,
                background: 'transparent', border: `1px solid ${C.borderStrong}`,
                color: C.textBody, cursor: 'pointer',
                fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconPreview />
              Preview
            </button>
          </Tip>

          <Tip label={hasUnpublishedChanges ? 'Publish changes' : 'No unpublished changes'} side="bottom">
            <button
              type="button"
              onClick={hasUnpublishedChanges ? onPublish : undefined}
              disabled={!hasUnpublishedChanges}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 28, padding: '0 10px', borderRadius: 5, border: 'none',
                background: hasUnpublishedChanges ? C.ink : 'rgba(44,36,22,0.12)',
                color: hasUnpublishedChanges ? C.inkText : C.textMuted,
                cursor: hasUnpublishedChanges ? 'pointer' : 'default',
                fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { if (hasUnpublishedChanges) e.currentTarget.style.background = '#3d3020' }}
              onMouseLeave={e => { if (hasUnpublishedChanges) e.currentTarget.style.background = C.ink }}
            >
              <IconPublish style={{ color: hasUnpublishedChanges ? undefined : C.textMuted }} />
              Publish
            </button>
          </Tip>
        </div>
      </div>

      {/* PAGES LIST */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 2 }}>

        {/* Pages section label */}
        {navPages.length > 0 && (
          <div style={{ padding: '14px 14px 6px' }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>
              Pages
            </span>
          </div>
        )}
        <SidebarSection
          label=""
          pages={navPages}
          renderRow={renderPageRow}
          droppableId="main-nav"
        />

        {/* Hidden section — always rendered so it's a valid drop target and visible default for new pages */}
        <div style={{ padding: '14px 14px 6px' }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>
            Hidden
          </span>
        </div>
        <SidebarSection
          label=""
          pages={hiddenPages}
          renderRow={renderPageRow}
          droppableId="other-pages"
        />

        {/* Add Page button */}
        <div className="relative" ref={addMenuRef} style={{ margin: '2px 8px 0' }}>
          <button
            type="button"
            onClick={() => setAddMenuOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '4px 10px', borderRadius: 5,
              background: 'transparent', border: `1px dashed ${C.borderStrong}`,
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
              color: C.textMuted, cursor: 'pointer', transition: 'background 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconPlus />
            Add Page
          </button>
          {addMenuOpen && (
            <div className="absolute left-0 bottom-full mb-1 rounded-lg shadow-popup z-20 py-1 w-36" style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}>
              <button onClick={handleAddPage} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Page</button>
              <button onClick={handleAddLink} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#ede8e0]" style={{ color: 'var(--text-primary)' }}>Link ↗</button>
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div style={{ height: 8 }} />
      </div>

      {/* BOTTOM ROW — avatar + Library + Settings */}
      <div
        style={{
          borderTop: `1px solid ${C.borderSoft}`,
          padding: '8px 8px',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}
      >
        {/* Avatar */}
        <Tip label="Account" side="top">
          <div style={{ padding: '0 4px' }}>
            <button
              ref={accountAvatarRef}
              type="button"
              onClick={() => setAccountOpen(v => !v)}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: C.ink, color: C.inkText,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(26,18,10,0.08)',
                flexShrink: 0, padding: 0,
              }}
            >
              {avatarImage ? (
                <img src={avatarImage} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <span style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 400 }}>
                  {(displayName || username || 'U')[0].toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </Tip>

        <UtilityButton
          icon={<IconLibrary />}
          label="Library"
          onClick={onShowLibrary}
        />

        <UtilityButton
          icon={<IconSettings />}
          label="Settings"
          onClick={() => setSiteSettingsOpen(v => !v)}
          btnRef={siteSettingsRef}
        />
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
          anchorEl={siteSettingsRef.current}
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
