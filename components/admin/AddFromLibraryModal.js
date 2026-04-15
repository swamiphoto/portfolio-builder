import { useState, useMemo } from "react";

export default function AddFromLibraryModal({ allImages, currentAlbumImages, onClose, onAdd }) {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");

  const currentSet = useMemo(() => new Set(currentAlbumImages), [currentAlbumImages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allImages.filter((url) => !currentSet.has(url) && url.toLowerCase().includes(q));
  }, [allImages, currentSet, search]);

  const toggle = (url) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd([...selected]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add from Library</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
          {selected.size > 0 && (
            <div className="text-xs text-blue-600 mt-1">{selected.size} selected</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              {search ? "No images match your search" : "All library images are already in this album"}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((url) => {
                const isSelected = selected.has(url);
                return (
                  <button
                    key={url}
                    onClick={() => toggle(url)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                      isSelected ? "border-blue-500" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={url.split("/").pop()}
                      className="w-full aspect-square object-cover bg-gray-100"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    )}
                    <div className="text-xs text-gray-400 px-1 py-0.5 bg-white truncate text-left">
                      {url.split("/").pop()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="flex-1 bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selected.size > 0 ? selected.size : ""} photo{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
