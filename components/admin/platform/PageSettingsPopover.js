import { slugify } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import PopoverShell from './PopoverShell'

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">{label}</div>
      {children}
    </div>
  )
}

export default function PageSettingsPopover({ page, anchorEl, onUpdate, onClose, username }) {
  const pagePhotos = getPagePhotos(page)
  const autoSlug = slugify(page.title || '')
  const displaySlug = page.slug || autoSlug

  function update(patch) {
    onUpdate({ ...page, ...patch })
  }

  const rootDomain =
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const protocol =
    rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
  const publicUrl = `${protocol}://${username}.${rootDomain}/${displaySlug}`

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Page Settings">

      {/* ── URL ── */}
      <Section label="URL">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-stone-400 flex-shrink-0 font-mono">{username}/</span>
          <input
            className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs font-mono text-stone-700 outline-none focus:border-stone-500 bg-transparent min-w-0"
            value={displaySlug}
            onChange={(e) => update({ slug: e.target.value })}
            placeholder={autoSlug || 'page-url'}
            spellCheck={false}
          />
        </div>
      </Section>

      {/* ── Thumbnail ── */}
      <Section label="Thumbnail">
        {pagePhotos.length > 0 ? (
          <div>
            <div className="grid grid-cols-4 gap-1">
              {pagePhotos.slice(0, 8).map((url) => {
                const isSelected = !page.thumbnail?.useCover && page.thumbnail?.imageUrl === url
                return (
                  <button
                    key={url}
                    onClick={() => update({ thumbnail: { imageUrl: url, useCover: false } })}
                    className={`aspect-square overflow-hidden border-2 transition-colors ${
                      isSelected
                        ? 'border-stone-900'
                        : 'border-transparent hover:border-stone-300'
                    }`}
                    title="Set as thumbnail"
                  >
                    <img
                      src={getSizedUrl(url, 'thumbnail')}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
            {page.thumbnail?.imageUrl && !page.thumbnail?.useCover && (
              <button
                onClick={() => update({ thumbnail: { imageUrl: '', useCover: true } })}
                className="text-[10px] text-stone-400 hover:text-stone-700 mt-1.5"
              >
                Reset to first photo
              </button>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-stone-400">
            Add photos to this page to set a thumbnail.
          </p>
        )}
      </Section>

      {/* ── Password ── */}
      <Section label="Password">
        <input
          type="text"
          className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
          placeholder="Leave blank for public access"
          value={page.password || ''}
          onChange={(e) => update({ password: e.target.value })}
          autoComplete="off"
        />
        {page.password && (
          <>
            <textarea
              className="w-full mt-2 border-b border-stone-200 p-0 pb-1 text-xs text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent resize-none"
              placeholder="Gate message (optional)"
              rows={2}
              value={page.passwordGateMessage || ''}
              onChange={(e) => update({ passwordGateMessage: e.target.value })}
            />
            <p className="text-[10px] text-stone-400 mt-1.5">
              Password-protected pages are not indexed by search engines.
            </p>
          </>
        )}
      </Section>

      {/* ── Footer ── */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigator.clipboard.writeText(publicUrl)}
          className="text-[10px] text-stone-400 hover:text-stone-700 transition-colors"
        >
          Copy link
        </button>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1 bg-stone-900 text-white hover:bg-stone-700 transition-colors"
        >
          Done
        </button>
      </div>

    </PopoverShell>
  )
}
