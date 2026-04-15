// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col h-full overflow-hidden">
        {sidebar}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
