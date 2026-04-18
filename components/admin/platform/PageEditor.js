// components/admin/platform/PageEditor.js
import BlockPageEditor from './BlockPageEditor'

export default function PageEditor({ page, siteConfig, saveStatus, onPageChange }) {
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
        Select a page to edit
      </div>
    )
  }

  return (
    <BlockPageEditor
      page={page}
      siteConfig={siteConfig}
      saveStatus={saveStatus}
      onPageChange={onPageChange}
    />
  )
}
