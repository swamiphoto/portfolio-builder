export default function AlbumSidebar({ counts, selectedAlbum, onSelect, onUploadClick }) {
  // counts shape: { all: N, landscapes: N, portraits: N, ..., arizona: N, ... }
  // selectedAlbum shape: { type: 'all' | 'portfolio' | 'gallery', key: string }

  const portfolioKeys = ["landscapes", "portraits", "bollywood", "tennis", "headshots"];
  const galleryKeys = Object.keys(counts).filter(
    (k) => k !== "all" && !portfolioKeys.includes(k)
  );

  const isSelected = (type, key) =>
    selectedAlbum.type === type && selectedAlbum.key === key;

  const itemClass = (active) =>
    `flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm ${
      active
        ? "bg-gray-900 text-white font-medium"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="font-bold text-gray-900 text-base">Photo Library</div>
        <div className="text-xs text-gray-400 mt-0.5">swamiphoto bucket</div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All Photos */}
        <button
          onClick={() => onSelect({ type: "all", key: "all" })}
          className={`${itemClass(isSelected("all", "all"))} w-full mb-2`}
        >
          <span className="flex-1 text-left">All Photos</span>
          <span className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full">
            {counts.all ?? 0}
          </span>
        </button>

        {/* Portfolios */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-1 mt-1">
          Portfolios
        </div>
        {portfolioKeys.map((key) => (
          <button
            key={key}
            onClick={() => onSelect({ type: "portfolio", key })}
            className={`${itemClass(isSelected("portfolio", key))} w-full capitalize`}
          >
            <span className="flex-1 text-left capitalize">{key}</span>
            <span className="text-xs text-gray-400">{counts[key] ?? 0}</span>
          </button>
        ))}

        {/* Galleries */}
        {galleryKeys.length > 0 && (
          <>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-1 mt-3">
              Galleries
            </div>
            {galleryKeys.map((key) => (
              <button
                key={key}
                onClick={() => onSelect({ type: "gallery", key })}
                className={`${itemClass(isSelected("gallery", key))} w-full`}
              >
                <span className="flex-1 text-left">{key}</span>
                <span className="text-xs text-gray-400">{counts[key] ?? 0}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Upload button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onUploadClick}
          className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ↑ Upload Photos
        </button>
      </div>
    </div>
  );
}
