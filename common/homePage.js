// Pure home-page resolution + first-page assignment. Client- and server-safe
// (no GCS imports). Replaces the duplicated `id:'home'` fallback ladders that
// existed while a hidden seeded "home" page was created for every new site.

export function resolveHomePage(config) {
  const pages = config?.pages || []
  if (!pages.length) return null
  return pages.find(p => p.id === config.homePageId)
    || pages.find(p => p.showInNav && p.type !== 'link')
    || pages.find(p => p.type !== 'link')
    || pages[0]
    || null
}

// When the first *visible* page is created and no home is pinned yet, pin it.
// Later pages, hidden pages, and external links never change an existing home.
export function assignHomeOnCreate(config, newPage) {
  if (config.homePageId) return config
  if (!newPage || newPage.showInNav === false || newPage.type === 'link') return config
  return { ...config, homePageId: newPage.id }
}
