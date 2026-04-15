// components/admin/platform/PageEditor.js
import BlockPageEditor from './BlockPageEditor'
import GalleryPageEditor from './GalleryPageEditor'

export default function PageEditor({ page, siteConfig, saveStatus, onPageChange }) {
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 text-sm">
        Select a page to edit
      </div>
    )
  }

  if (page.type === 'gallery') {
    return (
      <GalleryPageEditor
        page={page}
        saveStatus={saveStatus}
        onPageChange={onPageChange}
      />
    )
  }

  // cover and single pages — block-based editing
  return (
    <BlockPageEditor
      page={page}
      saveStatus={saveStatus}
      onPageChange={onPageChange}
    />
  )
}
