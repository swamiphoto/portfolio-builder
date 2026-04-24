// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
      <div className="w-56 flex-shrink-0 flex flex-col h-full overflow-hidden bg-white border-r border-gray-200">
        {sidebar}
      </div>
      {panel && (
        <div className="w-64 flex-shrink-0 flex flex-col h-full overflow-hidden bg-stone-50 border-r border-stone-200">
          {panel}
        </div>
      )}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {children}
      </div>
    </div>
  )
}
