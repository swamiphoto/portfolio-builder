// components/image-displays/page/MobileNavOverlay.js
// One shared full-screen mobile menu for every theme. Parent links are large;
// children sit indented under their parent on a hairline rail, generously spaced.
// The list scrolls when tall, with the close button pinned above it. It shows ONLY
// the page tree — no footer, no social links — so the menu layout reads identically
// across themes (each theme themes the background/text/fonts via `overlayStyle`).
import { useEffect } from 'react'
import { TfiClose } from 'react-icons/tfi'

// Is this nav item (or one of its children) the current page? Prefer an explicit
// id (preview mode where the route is /admin), else match the URL path.
function navItemActive(item, ctx) {
  if (item.type === 'link') return false
  const { currentPageId, currentPath, basePath } = ctx
  const selfActive = currentPageId != null
    ? item.id === currentPageId
    : currentPath === `${basePath}/${item.slug || item.id}`
  if (selfActive) return true
  return (item.children || []).some(child => navItemActive(child, ctx))
}

export default function MobileNavOverlay({ open, onClose, tree, basePath, currentPath, currentPageId, onPageClick, overlayStyle, linkClassName = 'font-serif' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null

  const renderItem = (item, cls) => {
    const isLink = item.type === 'link'
    const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
    if (onPageClick && !isLink) {
      return <button onClick={() => { onPageClick(item.id); onClose() }} className={cls}>{item.title}</button>
    }
    return <a href={href} target={isLink ? (item.linkNewTab === false ? '_self' : '_blank') : undefined} rel={isLink ? 'noopener noreferrer' : undefined} onClick={onClose} className={cls} style={{ textDecoration: 'none', color: 'inherit' }}>{item.title}</a>
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={overlayStyle} aria-label="Site navigation" role="dialog" aria-modal="true">
      <div className="flex items-center justify-end h-16 px-5 shrink-0">
        <button onClick={onClose} aria-label="Close menu" className="p-2 -mr-2 opacity-70 hover:opacity-100 transition-opacity"><TfiClose className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-7 pb-16">
        <ul className="flex flex-col">
          {tree.map(item => {
            const kids = item.children || []
            const active = navItemActive(item, { currentPageId, currentPath, basePath })
            const parentCls = `block py-2.5 ${linkClassName} text-[26px] leading-tight transition-opacity ${active ? 'opacity-100 font-medium' : 'opacity-80 hover:opacity-100'}`
            return (
              <li key={item.id} className="border-b border-current/10 last:border-b-0 py-1">
                {renderItem(item, parentCls)}
                {kids.length > 0 && (
                  <ul className="mt-1 mb-3 ml-1 pl-4 border-l border-current/20 flex flex-col gap-0.5">
                    {kids.map(child => {
                      const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
                      const childCls = `block py-1.5 ${linkClassName} text-lg transition-opacity ${cActive ? 'opacity-100 underline' : 'opacity-60 hover:opacity-90'}`
                      return <li key={child.id}>{renderItem(child, childCls)}</li>
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
