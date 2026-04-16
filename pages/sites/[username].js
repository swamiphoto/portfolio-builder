import { lookupUserByUsername } from '../../common/userProfile'
import { readSiteConfig } from '../../common/siteConfig'
import Gallery from '../../components/image-displays/gallery/Gallery'

export async function getServerSideProps({ params }) {
  const { username } = params

  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }

  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return { notFound: true }

  return {
    props: {
      siteConfig: JSON.parse(JSON.stringify(siteConfig)),
      username,
    },
  }
}

export default function PublicPortfolio({ siteConfig, username }) {
  const homePage = siteConfig.pages?.find((p) => p.id === 'home') || siteConfig.pages?.[0]

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="px-6 py-4 border-b border-gray-100">
        <h1 className="text-sm font-semibold text-gray-900">{siteConfig.siteName || username}</h1>
      </header>
      <main>
        {homePage ? (
          <Gallery
            blocks={homePage.blocks || []}
            pages={siteConfig.pages}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            No content yet.
          </div>
        )}
      </main>
    </div>
  )
}
