import React from 'react'
import { parseMarkdown } from '@/common/markdown'

export function renderInline(nodes, keyPrefix = 'i') {
  return (nodes || []).map((n, i) => {
    const key = `${keyPrefix}-${i}`
    if (n.type === 'bold') return <strong key={key}>{renderInline(n.children, key)}</strong>
    if (n.type === 'italic') return <em key={key}>{renderInline(n.children, key)}</em>
    if (n.type === 'link')
      return (
        <a key={key} href={n.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {renderInline(n.children, key)}
        </a>
      )
    return <React.Fragment key={key}>{n.value}</React.Fragment>
  })
}

// Layout-agnostic markdown body. The theme decides what heading/body/quote
// look like via variantClasses; this component only supplies structure.
export default function MarkdownText({ content, variantClasses }) {
  const ast = parseMarkdown(content)
  const vc = variantClasses || {}
  return (
    <div className="markdown-text space-y-5">
      {ast.map((b, i) => {
        if (b.type === 'heading') return <div key={i} className={vc.heading}>{renderInline(b.children)}</div>
        if (b.type === 'quote') return <div key={i} className={`${vc.quote || vc.body || ''} border-l-2 pl-4 opacity-90`}>{renderInline(b.children)}</div>
        if (b.type === 'list')
          return (
            <ul key={i} className={`${vc.body || ''} list-disc pl-5 space-y-1`}>
              {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          )
        if (b.type === 'image')
          return (
            <figure key={i} className="my-6">
              <img src={b.url} alt={b.caption || ''} className="w-full h-auto" loading="lazy" />
              {b.caption ? <figcaption className="mt-2 text-sm opacity-60">{b.caption}</figcaption> : null}
            </figure>
          )
        return <div key={i} className={`${vc.body || ''} whitespace-pre-line`}>{renderInline(b.children)}</div>
      })}
    </div>
  )
}
