// components/image-displays/page/SiteNav.js
import { buildNavTree } from '../../../common/pagesTree'
import { resolveNavStyle } from '../../../common/navStyles'

function NavList({ items, basePath, depth = 0 }) {
  return (
    <ul className={depth === 0 ? 'flex gap-6' : 'pl-4'}>
      {items.map(item => (
        <li key={item.id} className="relative group">
          <a href={`${basePath}/${item.slug || item.id}`} className="text-sm hover:underline">{item.title}</a>
          {item.children?.length > 0 && (
            <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-md p-2 min-w-[160px]">
              <NavList items={item.children} basePath={basePath} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function SiteNav({ siteConfig, username, variant }) {
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.theme)
  const basePath = `/sites/${username}`
  if (style === 'header-dropdown') {
    return (
      <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-900">{siteConfig.siteName || username}</h1>
        <NavList items={tree} basePath={basePath} />
      </header>
    )
  }
  // cover-embedded — caller (PageCover overlay) handles placement; we expose the list as a small flat component too.
  return (
    <nav className="absolute top-6 right-6 text-white">
      <NavList items={tree} basePath={basePath} />
    </nav>
  )
}
