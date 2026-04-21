import { useState } from 'react'
import { slugify } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import PopoverShell from './PopoverShell'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start gap-2 cursor-pointer"
    >
      <div
        className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${
          checked ? 'bg-stone-700' : 'bg-stone-300'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
      <div>
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight mt-0.5">{hint}</div>}
      </div>
    </div>
  )
}

function FeatureBlock({ label, checked, onToggle, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-700">{label}</span>
        <button
          onClick={() => onToggle(!checked)}
          className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${
            checked ? 'bg-stone-700' : 'bg-stone-300'
          }`}
        >
          <div
            className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${
              checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
      </div>
      {checked && children && (
        <div className="pl-3 space-y-2 border-l border-stone-100">
          {children}
        </div>
      )}
    </div>
  )
}

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
  const [slugDraft, setSlugDraft] = useState(null)
  const displayValue = slugDraft !== null ? slugDraft : displaySlug

  function update(patch) {
    onUpdate({ ...page, ...patch })
  }

  function updateCf(key, patch) {
    const cf = page.clientFeatures || {}
    update({
      clientFeatures: {
        ...cf,
        [key]: { ...(cf[key] || {}), ...patch },
      },
    })
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
            value={displayValue}
            onChange={(e) => setSlugDraft(e.target.value)}
            onBlur={() => {
              const sanitized = slugify(slugDraft ?? displaySlug)
              setSlugDraft(null)
              update({ slug: sanitized })
            }}
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

      {/* ── Client Features ── */}
      <Section label="Client Features">
        {(() => {
          const cf = page.clientFeatures || {}
          return (
            <>
              <Toggle
                checked={cf.enabled || false}
                onChange={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
                label="Enable client features"
              />

              {cf.enabled && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">

                  <FeatureBlock
                    label="Downloads"
                    checked={cf.downloads?.enabled || false}
                    onToggle={(v) => updateCf('downloads', { enabled: v })}
                  >
                    <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Quality</div>
                    {['web', 'print', 'original'].map((q) => (
                      <label key={q} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(cf.downloads?.quality || ['web']).includes(q)}
                          onChange={(e) => {
                            const cur = cf.downloads?.quality || ['web']
                            const next = e.target.checked
                              ? [...new Set([...cur, q])]
                              : cur.filter((x) => x !== q)
                            updateCf('downloads', { quality: next })
                          }}
                          className="rounded border-stone-300 text-stone-700 focus:ring-stone-500"
                        />
                        <span className="text-xs text-stone-600 capitalize">{q}</span>
                      </label>
                    ))}
                    <Toggle
                      checked={cf.downloads?.requireEmail || false}
                      onChange={(v) => updateCf('downloads', { requireEmail: v })}
                      label="Require email to download"
                    />
                    <Toggle
                      checked={cf.downloads?.watermarkEnabled || false}
                      onChange={(v) => updateCf('downloads', { watermarkEnabled: v })}
                      label="Watermark"
                    />
                  </FeatureBlock>

                  <FeatureBlock
                    label="Favorites"
                    checked={cf.favorites?.enabled || false}
                    onToggle={(v) => updateCf('favorites', { enabled: v })}
                  >
                    <Toggle
                      checked={cf.favorites?.requireEmail || false}
                      onChange={(v) => updateCf('favorites', { requireEmail: v })}
                      label="Require email"
                    />
                    <Toggle
                      checked={cf.favorites?.submitWorkflow || false}
                      onChange={(v) => updateCf('favorites', { submitWorkflow: v })}
                      label="Submit workflow"
                      hint="Client clicks 'Submit selection' when done; you're notified"
                    />
                  </FeatureBlock>

                  <FeatureBlock
                    label="Comments"
                    checked={cf.comments?.enabled || false}
                    onToggle={(v) => updateCf('comments', { enabled: v })}
                  >
                    <Toggle
                      checked={cf.comments?.requireEmail || false}
                      onChange={(v) => updateCf('comments', { requireEmail: v })}
                      label="Require email"
                    />
                  </FeatureBlock>

                  <FeatureBlock
                    label="Purchase"
                    checked={cf.purchase?.enabled || false}
                    onToggle={(v) => updateCf('purchase', { enabled: v })}
                  >
                    <div>
                      <div className="text-[10px] text-stone-400 mb-1">Default price per photo</div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-stone-400">{cf.purchase?.currency || 'USD'}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 bg-transparent"
                          placeholder="0.00"
                          value={cf.purchase?.defaultPrice ?? ''}
                          onChange={(e) =>
                            updateCf('purchase', {
                              defaultPrice: e.target.value === '' ? null : parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 mb-1">Currency</div>
                      <select
                        className="w-full text-xs text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
                        value={cf.purchase?.currency || 'USD'}
                        onChange={(e) => updateCf('purchase', { currency: e.target.value })}
                      >
                        {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-stone-400">
                      Override pricing per photo in the photo block inspector.
                    </p>
                  </FeatureBlock>

                </div>
              )}
            </>
          )
        })()}
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
