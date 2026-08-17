import { parseMarkdown } from '@/common/markdown'
import { renderInline } from '@/components/image-displays/MarkdownText'

// Sidebar face of a text block. Plain text edits inline; markdown blocks
// render a read-only snippet that hands editing to the slide-out panel.
export default function TextBlockField({ block, onUpdate, onOpenMarkdownEditor, AutoGrowTextarea, inputClass }) {
  if (block.format === 'markdown') {
    const ast = parseMarkdown(block.content).filter((b) => b.type !== 'image').slice(0, 3)
    return (
      <button
        type="button"
        onClick={onOpenMarkdownEditor}
        className="w-full text-left text-sm leading-snug text-neutral-600 hover:text-neutral-900"
        title="Edit in markdown editor"
      >
        <span className="block max-h-24 overflow-hidden">
          {ast.length
            ? ast.map((b, i) => <span key={i} className="block truncate">{renderInline(b.children || [])}</span>)
            : <span className="italic opacity-60">Empty — click to write</span>}
        </span>
        <span className="mt-1.5 inline-block rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
          Markdown
        </span>
      </button>
    )
  }
  return (
    <div>
      <AutoGrowTextarea
        className={inputClass}
        placeholder="Write something…"
        maxHeight={160}
        value={block.content || ''}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
      />
      <button type="button" onClick={onOpenMarkdownEditor} className="mt-1 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800">
        Open markdown editor
      </button>
    </div>
  )
}
