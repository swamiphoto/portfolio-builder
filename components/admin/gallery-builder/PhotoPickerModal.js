import { useState, useMemo, useRef, useEffect } from "react";

const KNOWN_FOLDERS = [
  "photos/library",
  "photos/landscapes",
  "photos/portraits",
  "photos/bollywood",
  "photos/tennis",
  "photos/headshots",
  "photos/landscapes/arizona",
  "photos/landscapes/california",
  "photos/portraits/sunol",
  "photos/portraits/naga-sunflowers",
];

function extractFolder(url) {
  const match = url.match(/\/photos\/(.+)\/[^/]+$/);
  return match ? match[1] : "other";
}

function LibraryTab({ images, loading, blockType, onConfirm, defaultFolder }) {
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState(defaultFolder || "all");
  const [selected, setSelected] = useState([]);
  const isMulti = blockType === "stacked" || blockType === "masonry";

  const folders = useMemo(() => {
    const set = new Set();
    images.forEach((url) => set.add(extractFolder(url)));
    return ["all", ...Array.from(set).sort()];
  }, [images]);

  const filtered = useMemo(() => {
    let result = images;
    if (folder !== "all") result = result.filter((url) => extractFolder(url) === folder);
    if (search.trim()) result = result.filter((url) => url.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [images, folder, search]);

  const toggle = (url) => {
    if (!isMulti) { onConfirm([url]); return; }
    setSelected((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-stone-100 space-y-2 flex-shrink-0">
        <input
          className="w-full border-b border-stone-200 pb-1.5 text-sm text-stone-800 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent"
          placeholder="Search photos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full border-b border-stone-200 pb-1.5 text-xs text-stone-600 outline-none bg-transparent focus:border-stone-500 transition-colors"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          {folders.map((f) => (
            <option key={f} value={f}>{f === "all" ? "All folders" : f}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-stone-400 text-xs py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-stone-400 text-xs py-12">No photos found</div>
        ) : (
          <div style={{ columns: "3", gap: "4px" }}>
            {filtered.map((url) => {
              const isSelected = selected.includes(url);
              return (
                <div
                  key={url}
                  className={`relative overflow-hidden cursor-pointer mb-1 break-inside-avoid ring-2 transition-all ${
                    isSelected ? "ring-stone-700" : "ring-transparent hover:ring-stone-300"
                  }`}
                  onClick={() => toggle(url)}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", url)}
                >
                  <img
                    src={`/_next/image?url=${encodeURIComponent(url)}&w=256&q=65`}
                    alt=""
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-stone-900 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isMulti && (
        <div className="px-3 py-2.5 border-t border-stone-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-stone-400">
            {selected.length > 0 ? `${selected.length} selected` : `${filtered.length} photos`}
          </span>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="bg-stone-900 text-white text-xs px-3 py-1.5 disabled:opacity-40 hover:bg-stone-700 transition-colors"
          >
            Add {selected.length > 0 ? selected.length : ""} photo{selected.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

function UploadTab({ onUploaded }) {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name));
    setFiles((prev) => [...prev, ...arr]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const uploadedUrls = [];
    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "pending" }));
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, folder: folder || undefined }),
        });
        const { signedUrl, gcsUrl } = await res.json();
        const formData = new FormData();
        Object.entries(signedUrl.fields).forEach(([k, v]) => formData.append(k, v));
        formData.append("file", file);
        const uploadRes = await fetch(signedUrl.url, { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        setProgress((p) => ({ ...p, [file.name]: "done" }));
        uploadedUrls.push(gcsUrl);
      } catch {
        setProgress((p) => ({ ...p, [file.name]: "error" }));
      }
    }
    setUploading(false);
    if (uploadedUrls.length > 0) onUploaded(uploadedUrls);
  };

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-stone-500 bg-stone-50" : "border-stone-200 hover:border-stone-400"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="text-xs font-medium text-stone-600 mb-0.5">Drop photos here</div>
        <div className="text-xs text-stone-400">or click to browse</div>
      </div>

      {files.length > 0 && (
        <div className="max-h-24 overflow-y-auto space-y-1">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <span className="flex-1 truncate text-xs text-stone-600">{f.name}</span>
              <span className={
                progress[f.name] === "done" ? "text-green-500 text-xs" :
                progress[f.name] === "error" ? "text-red-500 text-xs" :
                progress[f.name] === "pending" ? "text-stone-400 text-xs" : "text-stone-300 text-xs"
              }>
                {progress[f.name] === "done" ? "✓" : progress[f.name] === "error" ? "✗" : progress[f.name] === "pending" ? "↑" : "·"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="text-xs text-stone-400 mb-1">Folder <span className="text-stone-300">(optional)</span></div>
        <input
          list="upload-folder-options"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="photos/landscapes"
          className="w-full border-b border-stone-200 pb-1.5 text-sm text-stone-800 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent"
        />
        <datalist id="upload-folder-options">
          {KNOWN_FOLDERS.map((f) => <option key={f} value={f} />)}
        </datalist>
      </div>

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="w-full bg-stone-900 text-white text-xs font-medium py-2 disabled:opacity-40 hover:bg-stone-700 transition-colors"
      >
        {uploading ? "Uploading…" : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

export default function PhotoPickerModal({ images, loading, blockType, onConfirm, onClose, defaultFolder }) {
  const [tab, setTab] = useState("library");

  // Dragging state
  const panelRef = useRef(null);
  const dragState = useRef(null);
  const [pos, setPos] = useState({ x: 300, y: 60 }); // initial: just right of sidebar

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      setPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
    };
    const onUp = () => { dragState.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const startDrag = (e) => {
    if (e.target.closest("button,input,select,textarea,img")) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-white border border-stone-200 shadow-xl flex flex-col"
      style={{ left: pos.x, top: pos.y, width: 300, height: 520 }}
    >
      {/* Title bar — drag handle */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100 cursor-grab select-none flex-shrink-0"
        onMouseDown={startDrag}
      >
        {/* Tabs */}
        <button
          onClick={() => setTab("library")}
          className={`text-xs font-medium transition-colors ${tab === "library" ? "text-stone-900" : "text-stone-400 hover:text-stone-600"}`}
        >
          Library
        </button>
        <span className="text-stone-200 text-xs">|</span>
        <button
          onClick={() => setTab("upload")}
          className={`text-xs font-medium transition-colors ${tab === "upload" ? "text-stone-900" : "text-stone-400 hover:text-stone-600"}`}
        >
          Upload
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 transition-colors text-base leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === "library" ? (
          <LibraryTab images={images} loading={loading} blockType={blockType} onConfirm={onConfirm} defaultFolder={defaultFolder} />
        ) : (
          <UploadTab onUploaded={onConfirm} />
        )}
      </div>
    </div>
  );
}
