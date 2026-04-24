// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

const cardStyle = {
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  boxShadow: 'var(--pane-shadow)',
}

const overlineStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-4)',
}

const sectionHeadingStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
}

const inputStyle = {
  background: 'transparent',
  borderBottom: '1px solid var(--rule)',
  color: 'var(--ink-2)',
  outline: 'none',
}

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

  if (isLink) {
    return (
      <div className="mb-1.5" style={cardStyle}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5"
          style={{ background: 'transparent' }}
        >
          <span className="flex-1 text-left" style={sectionHeadingStyle}>Link Settings</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ink-4)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {expanded && (
          <div className="px-3 pb-3 pt-3 space-y-4" style={{ borderTop: '1px solid var(--rule)' }}>
            <div>
              <div style={overlineStyle}>Label</div>
              <input
                className="w-full p-0 pb-1 text-sm font-medium mt-1"
                style={inputStyle}
                placeholder="Link label"
                value={page.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <div style={overlineStyle}>URL</div>
              <input
                type="url"
                autoFocus={!page.url}
                className="w-full p-0 pb-1 text-sm mt-1"
                style={{ ...inputStyle, color: 'var(--ink-3)' }}
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

  return (
    <div className="mb-1.5" style={cardStyle}>
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 text-left"
          style={{ ...sectionHeadingStyle, background: 'transparent' }}
        >
          {page.title ? (
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 14, color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>
              {page.title}
            </span>
          ) : 'Page Hero'}
        </button>

        <button
          ref={brushRef}
          onClick={() => setDesignOpen(v => !v)}
          title="Page design"
          className="w-6 h-6 flex items-center justify-center transition-colors"
          style={{ color: 'var(--ink-4)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-4)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>

        <button
          onClick={() => setExpanded(v => !v)}
          className="transition-colors flex-shrink-0"
          style={{ color: 'var(--ink-4)' }}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-3 space-y-4" style={{ borderTop: '1px solid var(--rule)' }}>
          <div>
            <div style={overlineStyle}>Title</div>
            <input
              className="w-full p-0 pb-1 text-sm font-medium mt-1"
              style={inputStyle}
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>

          <div>
            <div style={overlineStyle}>Description</div>
            <textarea
              className="w-full p-0 pb-1 text-sm mt-1"
              style={{ ...inputStyle, color: 'var(--ink-3)' }}
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
