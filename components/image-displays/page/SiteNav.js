// components/image-displays/page/SiteNav.js
import { useRouter } from 'next/router'
import { buildNavTree } from '../../../common/pagesTree'
import { resolveNavStyle } from '../../../common/navStyles'

function NavList({ items, basePath, depth = 0, dark = false, currentPath = '', onPageClick }) {
  return (
    <ul className={depth === 0 ? 'flex gap-8' : 'flex flex-col gap-1'}>
      {items.map(item => {
        const isLink = item.type === 'link'
        const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
        const target = isLink ? '_blank' : undefined
        const rel = isLink ? 'noopener noreferrer' : undefined
        const isActive = !isLink && currentPath === href

        const linkClass = dark
          ? `font-serif text-base font-medium transition-colors ${isActive ? 'text-white underline' : 'text-white/70 hover:text-white'}`
          : `font-serif text-base font-medium transition-colors ${isActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`

        return (
          <li key={item.id}>
            {onPageClick && !isLink ? (
              <button onClick={() => onPageClick(item.id)} className={linkClass}>{item.title}</button>
            ) : (
              <a href={href} target={target} rel={rel} className={linkClass}>{item.title}</a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function SiteNav({ siteConfig, username, variant, onPageClick }) {
  const router = useRouter()
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.theme)
  const basePath = `/sites/${username}`
  const currentPath = router.asPath.split('?')[0]

  if (style === 'header-dropdown') {
    return (
      <header className="px-8 py-5 flex items-center justify-between">
        {onPageClick ? (
          <button className="font-serif2 text-2xl text-gray-900 tracking-wide">{siteConfig.siteName || username}</button>
        ) : (
          <a href={basePath} className="font-serif2 text-2xl text-gray-900 tracking-wide">{siteConfig.siteName || username}</a>
        )}
        <NavList items={tree} basePath={basePath} currentPath={currentPath} onPageClick={onPageClick} />
      </header>
    )
  }

  return (
    <nav className="absolute top-6 right-8 z-10">
      <NavList items={tree} basePath={basePath} dark currentPath={currentPath} onPageClick={onPageClick} />
    </nav>
  )
}
