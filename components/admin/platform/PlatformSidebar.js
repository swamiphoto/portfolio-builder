// components/admin/platform/PlatformSidebar.js
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Tip from '../Tip'
import { useDrag } from '../../../common/dragContext'
import SidebarSection from './SidebarSection'
import { buildNavTree, flattenForOtherPages, movePage, isDescendantOf } from '../../../common/pagesTree'
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
function IconImages(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="8" height="11" rx="1.5" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" />
      <rect x="13" y="12" width="8" height="9" rx="1.5" />
      <rect x="3" y="17" width="8" height="4" rx="1.5" />
    </svg>
  )
}
function IconGrid(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}
function IconDocument(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  )
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
  const [navAddMenuOpen, setNavAddMenuOpen] = useState(false)
  const navAddMenuRef = useRef(null)
  const [linkEditId, setLinkEditId] = useState(null)
  // Draft row for type-first page creation: { section: 'nav' | 'hidden' } or null
  const [draftRow, setDraftRow] = useState(null)
  const [draftValue, setDraftValue] = useState('')
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false)
  const siteSettingsRef = useRef(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountAvatarRef = useRef(null)
  const [pageSettingsId, setPageSettingsId] = useState(null)
  const [pageSettingsAnchorEl, setPageSettingsAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const addMenuRef = useRef(null)
  const addBtnRef = useRef(null)
  const navAddBtnRef = useRef(null)
  const { drag, dropTargetPageId, setDropTargetPageId } = useDrag()

  // Custom page drag state
  const [pageDrag, setPageDrag] = useState(null)
  const [pageDropTarget, setPageDropTarget] = useState(null)
  const [ghostPos, setGhostPos] = useState(null)
  const pageDragRef = useRef(null)
  const pageDropTargetRef = useRef(null)
  const didDragRef = useRef(false)

  useEffect(() => {
    if (!menuOpenId && !addMenuOpen && !navAddMenuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null)
      if (addMenuRef.current && !addMenuRef.current.contains(e.target) && addBtnRef.current && !addBtnRef.current.contains(e.target)) setAddMenuOpen(false)
      if (navAddMenuRef.current && !navAddMenuRef.current.contains(e.target) && navAddBtnRef.current && !navAddBtnRef.current.contains(e.target)) setNavAddMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId, addMenuOpen, navAddMenuOpen])

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

  function startDraft(section, template = 'gallery') {
    setAddMenuOpen(false)
    setNavAddMenuOpen(false)
    setDraftRow({ section, template })
    setDraftValue('')
  }

  function handleDraftCommit() {
    const trimmed = draftValue.trim()
    if (!trimmed || !draftRow) { setDraftRow(null); setDraftValue(''); return }
    const inNav = draftRow.section === 'nav'
    const base = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    const id = nextAvailableId(base, existingIds)
    // Append at end of section; user can drag to reorder.
    onConfigChange(prev => {
      const sectionPeers = prev.pages.filter(p => (p.showInNav !== false) === inNav)
      const sortOrder = Math.max(0, ...sectionPeers.map(p => p.sortOrder ?? 0)) + 1
      return { ...prev, pages: [...prev.pages, defaultPage({ id, title: trimmed, sortOrder, showInNav: inNav, parentId: null, template: draftRow.template })] }
    })
    onSelectPage?.(id)
    setDraftRow(null)
    setDraftValue('')
  }

  function handleDraftCancel() {
    setDraftRow(null)
    setDraftValue('')
  }

  function handleAddLink(section = 'hidden') {
    setAddMenuOpen(false)
    setNavAddMenuOpen(false)
    const inNav = section === 'nav'
    const base = 'new-link'
    onConfigChange(prev => {
      const existingIds = new Set(prev.pages.map(p => p.id))
      const id = nextAvailableId(base, existingIds)
      const sortOrder = Math.max(0, ...prev.pages.filter(p => (p.showInNav !== false) === inNav).map(p => p.sortOrder ?? 0)) + 1
      return { ...prev, pages: [...prev.pages, defaultLink({ id, title: 'New Link', sortOrder, showInNav: inNav, parentId: null })] }
    })
    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    const id = nextAvailableId(base, existingIds)
    onSelectPage?.(id); setRenamingId(id); setRenameValue('New Link')
  }

  function handlePageDragStart(page, e) {
    if (e.button !== undefined && e.button !== 0) return
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
      const draggedId = pageDragRef.current?.pageId

      if (pageRow) {
        const targetId = pageRow.dataset.pageId
        const targetPage = pages.find(p => p.id === targetId)
        if (targetId && targetId !== draggedId && targetPage) {
          // Don't allow dropping onto a descendant of the dragged page (would create a cycle)
          const cyclical = isDescendantOf(pages, targetId, draggedId)
          if (!cyclical) {
            const rect = pageRow.getBoundingClientRect()
            const rel = (e.clientY - rect.top) / rect.height
            const sectionInNav = inMainNav

            // Top 28% = before, bottom 28% = after, middle 44% = nest
            if (rel < 0.28) {
              target = { type: 'before', pageId: targetId, parentId: targetPage.parentId ?? null, inNav: sectionInNav }
            } else if (rel > 0.72) {
              target = { type: 'after', pageId: targetId, parentId: targetPage.parentId ?? null, inNav: sectionInNav }
            } else if (sectionInNav && targetPage.type !== 'link') {
              target = { type: 'nest', pageId: targetId }
            } else {
              // Fallback for hidden or link rows: treat middle as 'after'
              target = { type: 'after', pageId: targetId, parentId: targetPage.parentId ?? null, inNav: sectionInNav }
            }
          }
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

      if (!currentDrag || !wasDrag || !target) return

      if (target.type === 'before' || target.type === 'after') {
        const inNav = target.inNav
        const parentId = inNav ? (target.parentId ?? null) : null
        onConfigChange(prev => ({
          ...prev,
          pages: movePage(prev.pages, currentDrag.pageId, {
            showInNav: inNav,
            parentId,
            ...(target.type === 'before' ? { beforeId: target.pageId } : { afterId: target.pageId }),
          }),
        }))
      } else if (target.type === 'nest') {
        onConfigChange(prev => ({
          ...prev,
          pages: movePage(prev.pages, currentDrag.pageId, { showInNav: true, parentId: target.pageId, position: 'end' }),
        }))
      } else if (target.type === 'root') {
        onConfigChange(prev => ({
          ...prev,
          pages: movePage(prev.pages, currentDrag.pageId, { showInNav: true, parentId: null, position: 'end' }),
        }))
      } else if (target.type === 'other') {
        onConfigChange(prev => ({
          ...prev,
          pages: movePage(prev.pages, currentDrag.pageId, { showInNav: false, position: 'end' }),
        }))
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

  function renderDraftRow() {
    return (
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            margin: '0 8px', padding: '4px 10px',
            borderRadius: 5,
            background: 'transparent',
            boxShadow: 'inset 0 0 0 1px rgba(139,111,71,0.22)',
          }}
        >
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 14, color: C.accent }}>
            <IconGallery />
          </div>
          <input
            autoFocus
            value={draftValue}
            onChange={e => setDraftValue(e.target.value)}
            onBlur={handleDraftCommit}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleDraftCommit() }
              if (e.key === 'Escape') { e.preventDefault(); handleDraftCancel() }
            }}
            placeholder="Untitled"
            style={{
              flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500,
              color: '#3a2e1f', background: 'transparent',
              border: 'none', outline: 'none', padding: 0,
            }}
          />
        </div>
      </div>
    )
  }

  function renderPageRow(page, depth = 0) {
    const isImageDropTarget = drag !== null && dropTargetPageId === page.id && page.id !== drag?.sourcePageId
    const isPageNestTarget = pageDropTarget?.type === 'nest' && pageDropTarget.pageId === page.id
    const isPageBeforeTarget = pageDropTarget?.type === 'before' && pageDropTarget.pageId === page.id
    const isPageAfterTarget = pageDropTarget?.type === 'after' && pageDropTarget.pageId === page.id
    const isLink = page.type === 'link'
    const isSelected = selectedPageId === page.id
    const count = !isLink ? countPagePhotos(page) : null
    const lineLeft = 8 + 10 + depth * 18 // outer margin + row padding + indent

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
        {/* Drop indicator lines for reorder */}
        {(isPageBeforeTarget || isPageAfterTarget) && (
          <div
            aria-hidden
            style={{
              position: 'absolute', left: lineLeft, right: 12,
              top: isPageBeforeTarget ? -1 : 'auto',
              bottom: isPageAfterTarget ? -1 : 'auto',
              height: 2, background: C.accent, borderRadius: 2, pointerEvents: 'none', zIndex: 2,
            }}
          />
        )}
        {renamingId === page.id ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '0 8px', padding: `4px 10px`,
              paddingLeft: 10 + depth * 18,
              borderRadius: 5,
              background: C.selected,
              boxShadow: 'inset 0 0 0 1px rgba(139,111,71,0.28)',
            }}
          >
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 14, color: C.accent }}>
              <PageTypeIcon page={page} />
            </div>
            <input
              autoFocus
              onFocus={e => e.target.select()}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => handleRenameCommit(page.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameCommit(page.id)
                if (e.key === 'Escape') setRenamingId(null)
              }}
              style={{
                flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500,
                color: '#3a2e1f', background: 'transparent',
                border: 'none', outline: 'none', padding: 0,
              }}
            />
          </div>
        ) : (
          <div
            className="group relative"
            onPointerDown={(e) => {
              // Ignore drag from buttons (dots menu, link edit, etc.)
              if (e.target.closest('button')) return
              handlePageDragStart(page, e)
            }}
            onClick={() => {
              if (didDragRef.current || pageDragRef.current) return
              if (!isLink) onSelectPage?.(page.id)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '0 8px', padding: `4px 10px`,
              paddingLeft: 10 + depth * 18,
              borderRadius: 5, cursor: 'pointer', touchAction: 'none',
              background: isSelected
                ? C.selected
                : isPageNestTarget
                ? 'rgba(139,111,71,0.10)'
                : isImageDropTarget
                ? 'rgba(60,100,200,0.06)'
                : 'transparent',
              boxShadow: isSelected ? '0 1px 2px rgba(26,18,10,0.05), inset 0 0 0 1px rgba(139,111,71,0.12)' : undefined,
              transition: 'background 120ms',
              outline: isImageDropTarget ? '1px solid rgba(60,100,200,0.3)' : isPageNestTarget ? `1px solid ${C.accent}` : undefined,
            }}
            onMouseEnter={e => { if (!isSelected && !isPageNestTarget && !isImageDropTarget) e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }}
            onMouseLeave={e => { if (!isSelected && !isPageNestTarget && !isImageDropTarget) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Icon / drag handle */}
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: 14, color: isSelected ? C.accent : C.textMuted }}
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
              style={{ fontSize: 13, color: isSelected ? '#3a2e1f' : C.textBody, fontWeight: isSelected ? 600 : 400 }}
            >
              {page.title}
            </span>

            {/* Drop badges */}
            {isPageNestTarget && <span className="text-[10px] flex-shrink-0" style={{ color: C.accent, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>nest</span>}
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
      <div className="flex-1 overflow-y-auto">

        {/* Pages section header */}
        <div style={{ padding: '14px 18px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textFaint, fontWeight: 500 }}>
              Pages
            </span>
            <div ref={navAddMenuRef}>
              <Tip label="Add page to nav" side="left">
                <button
                  ref={navAddBtnRef}
                  type="button"
                  onClick={() => setNavAddMenuOpen(v => !v)}
                  style={{
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', borderRadius: 3, cursor: 'pointer', color: C.textFaint,
                    transition: 'background 120ms, color 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)'; e.currentTarget.style.color = C.textBody }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textFaint }}
                >
                  <IconPlus width={14} height={14} />
                </button>
              </Tip>
            </div>
          </div>
        <SidebarSection
          label=""
          pages={navPages}
          renderRow={renderPageRow}
          droppableId="main-nav"
        />
        {draftRow?.section === 'nav' && renderDraftRow()}

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
        {draftRow?.section === 'hidden' && renderDraftRow()}

        {/* Add Page button */}
        <div ref={addMenuRef} style={{ margin: '10px 8px 0' }}>
          <button
            ref={addBtnRef}
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
      {pageDrag && ghostPos && (() => {
        const draggedPage = pages.find(p => p.id === pageDrag.pageId)
        return (
          <div
            className="fixed pointer-events-none z-[9999] text-sm"
            style={{
              left: ghostPos.x + 14, top: ghostPos.y - 10,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '5px 12px', borderRadius: 5,
              background: '#f9f6f1',
              color: C.text,
              fontWeight: 500,
              boxShadow: '0 0 0 1px rgba(100,75,40,0.12), 0 4px 14px rgba(40,25,8,0.14)',
            }}
          >
            {draggedPage && (
              <span style={{ display: 'flex', alignItems: 'center', color: C.accent }}>
                <PageTypeIcon page={draggedPage} />
              </span>
            )}
            <span>{pageDrag.title}</span>
          </div>
        )
      })()}

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

      {/* Page "..." menu — portalled to body to escape overflow-y:auto clipping */}
      {menuOpenId && dotsAnchorEl && typeof document !== 'undefined' && (() => {
        const menuPage = pages.find(p => p.id === menuOpenId)
        if (!menuPage) return null
        const rect = dotsAnchorEl.getBoundingClientRect()
        return createPortal(
          <div
            ref={menuRef}
            className="rounded-md overflow-hidden whitespace-nowrap"
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              right: window.innerWidth - rect.right - 4,
              minWidth: 128,
              background: 'var(--popover)',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
              padding: '4px 0',
              zIndex: 9999,
            }}
          >
            <button
              onClick={() => {
                const anchor = dotsAnchorEl
                setMenuOpenId(null)
                setPageSettingsId(menuPage.id)
                setPageSettingsAnchorEl(anchor)
              }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Settings
            </button>
            <button
              onClick={() => handleRenameStart(menuPage)}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Rename
            </button>
            {menuPage.showInNav && menuPage.type !== 'link' && siteConfig.homePageId !== menuPage.id && (
              <button
                onClick={() => { setMenuOpenId(null); onConfigChange(prev => ({ ...prev, homePageId: menuPage.id })) }}
                className="w-full text-left transition-colors"
                style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Set as home
              </button>
            )}
            <div style={{ height: 1, background: 'rgba(160,140,110,0.15)', margin: '4px 0' }} />
            <button
              onClick={() => { setMenuOpenId(null); handleDelete(menuPage.id) }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: '#c14a4a', background: 'transparent', border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(193,74,74,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Delete
            </button>
          </div>,
          document.body
        )
      })()}

      {/* Nav "+" add menu — portalled */}
      {navAddMenuOpen && navAddBtnRef.current && typeof document !== 'undefined' && (() => {
        const rect = navAddBtnRef.current.getBoundingClientRect()
        return createPortal(
          <div
            ref={navAddMenuRef}
            className="rounded-md overflow-hidden whitespace-nowrap"
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              right: window.innerWidth - rect.right,
              minWidth: 152,
              background: 'var(--popover)',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
              padding: '4px 0',
              zIndex: 9999,
            }}
          >
            <button
              onClick={() => { setNavAddMenuOpen(false); startDraft('nav', 'gallery') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconImages style={{ flexShrink: 0, color: C.textMuted }} />
              Gallery
            </button>
            <button
              onClick={() => { setNavAddMenuOpen(false); startDraft('nav', 'collection') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconGrid style={{ flexShrink: 0, color: C.textMuted }} />
              Collection
            </button>
            <button
              onClick={() => { setNavAddMenuOpen(false); startDraft('nav', 'about') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconDocument style={{ flexShrink: 0, color: C.textMuted }} />
              About
            </button>
            <div style={{ height: 1, background: 'rgba(160,140,110,0.18)', margin: '4px 8px' }} />
            <button
              onClick={() => { setNavAddMenuOpen(false); handleAddLink('nav') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconLink style={{ flexShrink: 0, color: C.textMuted }} />
              Link
            </button>
          </div>,
          document.body
        )
      })()}

      {/* Bottom "Add Page" menu — portalled, opens above the button */}
      {addMenuOpen && addBtnRef.current && typeof document !== 'undefined' && (() => {
        const rect = addBtnRef.current.getBoundingClientRect()
        return createPortal(
          <div
            ref={addMenuRef}
            className="rounded-md overflow-hidden whitespace-nowrap"
            style={{
              position: 'fixed',
              bottom: window.innerHeight - rect.top + 4,
              left: rect.left,
              minWidth: Math.max(rect.width, 152),
              background: 'var(--popover)',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
              padding: '4px 0',
              zIndex: 9999,
            }}
          >
            <button
              onClick={() => { setAddMenuOpen(false); startDraft('hidden', 'gallery') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconImages style={{ flexShrink: 0, color: C.textMuted }} />
              Gallery
            </button>
            <button
              onClick={() => { setAddMenuOpen(false); startDraft('hidden', 'collection') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconGrid style={{ flexShrink: 0, color: C.textMuted }} />
              Collection
            </button>
            <button
              onClick={() => { setAddMenuOpen(false); startDraft('hidden', 'about') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconDocument style={{ flexShrink: 0, color: C.textMuted }} />
              About
            </button>
            <div style={{ height: 1, background: 'rgba(160,140,110,0.18)', margin: '4px 8px' }} />
            <button
              onClick={() => { setAddMenuOpen(false); handleAddLink('hidden') }}
              className="w-full text-left transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconLink style={{ flexShrink: 0, color: C.textMuted }} />
              Link
            </button>
          </div>,
          document.body
        )
      })()}

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
