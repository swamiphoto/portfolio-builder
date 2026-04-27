// components/admin/platform/PageSettingsPanel.js
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'
import Tip from '../Tip'

function AutoGrowTextarea({ className, value, onChange, placeholder, maxHeight, style: styleProp, ...props }) {
  const ref = useRef(null);
  const adjust = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.height = '0';
    const sh = ref.current.scrollHeight;
    ref.current.style.height = Math.min(sh, maxHeight || sh) + 'px';
    ref.current.style.overflowY = maxHeight && sh > maxHeight ? 'auto' : 'hidden';
  }, [maxHeight]);
  useLayoutEffect(() => { adjust(); }, [value, adjust]);
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ resize: 'none', overflow: 'hidden', ...styleProp }}
      {...props}
    />
  );
}

export default function PageSettingsPanel({ page, onChange, onPageSettings, onAddBlockBelow }) {
  const [expanded, setExpanded] = useState(true)
  const [designOpen, setDesignOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const brushRef = useRef(null)
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) && menuBtnRef.current && !menuBtnRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

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
      <div className="overflow-hidden mb-1.5" style={{ background: '#f6f3ec', borderRadius: 4, boxShadow: '0 1px 3px rgba(26,18,10,0.07), 0 0 0 1px rgba(26,18,10,0.05)' }}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5"
        >
          <span className="text-xs font-semibold flex-1 text-left tracking-wide" style={{ color: 'var(--text-secondary)' }}>Link Settings</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {expanded && (
          <div className="px-3 pb-3 pt-0 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-0.5" style={{ color: 'var(--text-muted)' }}>Label</div>
              <input
                className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
                placeholder="Link label"
                value={page.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-0.5" style={{ color: 'var(--text-muted)' }}>URL</div>
              <input
                type="url"
                autoFocus={!page.url}
                className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
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
    <div className="group/card overflow-hidden mb-1.5" style={{ background: '#f6f3ec', borderRadius: 4, boxShadow: '0 1px 3px rgba(26,18,10,0.07), 0 0 0 1px rgba(26,18,10,0.05)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 14l5-5a2 2 0 012.8 0l3 3 2.2-2.2a2 2 0 012.8 0L22 13" />
          </svg>
        </span>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold tracking-wide flex-1 text-left transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          Hero
        </button>

        {/* Right side: toolbar pill (hover) */}
        <div className="relative flex items-center">
          <div
            className={`flex items-center gap-0.5 transition-opacity duration-150 ${designOpen || menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto'}`}
            style={{
              background: 'rgba(235,228,216,0.7)',
              boxShadow: '0 1px 4px rgba(26,18,10,0.12)',
              borderRadius: 5,
              padding: '2px 3px',
            }}
          >
            <Tip label="Design">
              <button
                ref={brushRef}
                onClick={() => setDesignOpen(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/[0.06]"
                style={{ color: designOpen ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </button>
            </Tip>

            <div ref={menuRef}>
              <button
                ref={menuBtnRef}
                onClick={() => {
                  if (!menuOpen && menuBtnRef.current) {
                    const rect = menuBtnRef.current.getBoundingClientRect()
                    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                  }
                  setMenuOpen(v => !v)
                }}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/[0.06] text-sm leading-none"
                style={{ color: 'var(--text-muted)' }}
              >
                ⋯
              </button>
              {menuOpen && menuPos && (
                <div
                  className="fixed z-[9999] rounded-md overflow-hidden whitespace-nowrap"
                  style={{
                    top: menuPos.top,
                    right: menuPos.right,
                    minWidth: 160,
                    background: 'var(--popover)',
                    boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
                    padding: '4px 0',
                  }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); onAddBlockBelow?.(menuBtnRef.current.getBoundingClientRect()); }}
                    disabled={!onAddBlockBelow}
                    className="w-full text-left flex items-center gap-2 transition-colors"
                    style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, opacity: onAddBlockBelow ? 1 : 0.35, cursor: onAddBlockBelow ? 'pointer' : 'default' }}
                    onMouseEnter={e => { if (onAddBlockBelow) e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 13V7M5 10l3 3 3-3"/><path d="M2 5h12" strokeOpacity="0.5"/>
                    </svg>
                    Add block below
                  </button>
                </div>
              )}
            </div>

            <Tip label={expanded ? "Collapse" : "Expand"}>
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/[0.06] flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </Tip>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-4">
          {/* Title */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Title</div>
            <input
              className="border-b border-[rgba(160,140,110,0.3)] pt-0 pb-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Description</div>
            <AutoGrowTextarea
              className="border-b border-[rgba(160,140,110,0.3)] pt-0 pb-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
              placeholder="A few words about this page…"
              maxHeight={160}
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
