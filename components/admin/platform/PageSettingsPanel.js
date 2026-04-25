// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

export default function PageSettingsPanel({ page, onChange }) {
  const [expanded, setExpanded] = useState(true)
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  const isLink = page.type === 'link'

  // ── Link page ──────────────────────────────────────────────────────────────
  if (isLink) {
    return (
      <div className="rounded-xl overflow-hidden mb-1.5" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#ede8e0]"
        >
          <span className="text-xs font-semibold flex-1 text-left tracking-wide" style={{ color: 'var(--text-secondary)' }}>Link Settings</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {expanded && (
          <div className="px-3 pb-3 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Label</div>
              <input
                className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug w-full"
                placeholder="Link label"
                value={page.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>URL</div>
              <input
                type="url"
                autoFocus={!page.url}
                className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug w-full"
                placeholder="https://…"
                value={page.url || ''}
                onChange={(e) => update({ url: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Page: hero editor ──────────────────────────────────────────────────────
  return (
    <div className="rounded-xl overflow-hidden mb-1.5" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="text-white text-sm leading-none select-none flex-shrink-0" aria-hidden>⠿</span>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold tracking-wide flex-1 text-left transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {page.title || 'Page Hero'}
        </button>

        <button
          ref={brushRef}
          onClick={() => setDesignOpen(v => !v)}
          title="Page design"
          className="w-6 h-6 flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>

        <button
          onClick={() => setExpanded(v => !v)}
          className="transition-colors flex-shrink-0"
          style={{ color: 'var(--border)' }}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Title */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Title</div>
            <input
              className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug w-full"
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Description</div>
            <textarea
              className="border-b border-[rgba(160,140,110,0.3)] pt-1.5 pb-1 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug w-full resize-none"
              placeholder="Optional"
              rows={2}
              value={page.description || ''}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

        </div>
      )}

      {designOpen && (
        <PageDesignPopover
          page={page}
          onUpdate={onChange}
          onClose={() => setDesignOpen(false)}
          anchorEl={brushRef.current}
        />
      )}
    </div>
  )
}
