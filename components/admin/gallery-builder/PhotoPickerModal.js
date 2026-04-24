import { useState, useMemo, useRef, useEffect } from "react";
import { normalizeImageRef } from "../../../common/assetRefs";
import { getSizedUrl } from "../../../common/imageUtils";

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

function normalizePickerAsset(image) {
  const ref = normalizeImageRef(image);
  if (typeof image === "string" && ref) {
    return {
      assetId: ref.assetId,
      publicUrl: ref.url,
      originalFilename: ref.url.split("/").pop() || ref.url,
      caption: "",
      tags: [],
      collectionIds: [],
      source: { provider: "manual", type: "upload" },
      orientation: "unknown",
      usage: { usageCount: 0 },
      createdAt: null,
      updatedAt: null,
    };
  }

  if (!image || typeof image !== "object" || !image.publicUrl) return null;

  return {
    assetId: image.assetId || image.publicUrl,
    publicUrl: image.publicUrl,
    originalFilename: image.originalFilename || image.publicUrl.split("/").pop() || image.publicUrl,
    caption: image.caption || "",
    tags: image.tags || [],
    collectionIds: image.collectionIds || [],
    source: image.source || { provider: "manual", type: "upload" },
    orientation: image.orientation || "unknown",
    usage: image.usage || { usageCount: 0 },
    createdAt: image.createdAt || null,
    updatedAt: image.updatedAt || null,
    width: image.width || null,
    height: image.height || null,
  };
}

function getSearchText(asset) {
  return [
    asset.originalFilename,
    asset.caption,
    asset.publicUrl,
    asset.source?.provider,
    ...(asset.tags || []),
    ...(asset.collectionIds || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getDateValue(value) {
  return value ? new Date(value).getTime() : 0;
}

function LibraryTab({ images, loading, blockType, onConfirm }) {
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const [source, setSource] = useState("all");
  const [orientation, setOrientation] = useState("all");
  const [selected, setSelected] = useState([]);
  const isMulti = blockType === "photos" || blockType === "stacked" || blockType === "masonry";

  const assets = useMemo(
    () => (images || []).map(normalizePickerAsset).filter(Boolean),
    [images]
  );

  const collections = useMemo(() => {
    const set = new Set();
    assets.forEach((asset) => {
      (asset.collectionIds || []).forEach((collectionId) => set.add(collectionId));
    });
    return ["all", ...Array.from(set).sort()];
  }, [assets]);

  const sources = useMemo(() => {
    const set = new Set();
    assets.forEach((asset) => {
      if (asset.source?.provider) set.add(asset.source.provider);
    });
    return ["all", ...Array.from(set).sort()];
  }, [assets]);

  const filtered = useMemo(() => {
    let result = assets;

    if (collection !== "all") {
      result = result.filter((asset) => (asset.collectionIds || []).includes(collection));
    }

    if (source !== "all") {
      result = result.filter((asset) => asset.source?.provider === source);
    }

    if (orientation !== "all") {
      result = result.filter((asset) => asset.orientation === orientation);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((asset) => getSearchText(asset).includes(query));
    }

    return [...result].sort(
      (a, b) => getDateValue(b.createdAt || b.updatedAt) - getDateValue(a.createdAt || a.updatedAt)
    );
  }, [assets, collection, source, orientation, search]);

  const toggle = (asset) => {
    const ref = normalizeImageRef({ assetId: asset.assetId, url: asset.publicUrl });
    const key = asset.assetId || asset.publicUrl;
    if (!isMulti) {
      onConfirm(ref ? [ref] : []);
      return;
    }

    setSelected((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const inputStyle = {
    background: 'transparent',
    borderBottom: '1px solid var(--rule)',
    color: 'var(--ink-2)',
    outline: 'none',
  };
  const selectStyle = {
    background: 'transparent',
    borderBottom: '1px solid var(--rule)',
    color: 'var(--ink-3)',
    outline: 'none',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 space-y-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--rule)' }}>
        <input
          className="w-full pb-1.5 text-sm transition-colors"
          style={inputStyle}
          placeholder="Search photos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <select
            className="pb-1.5 text-xs transition-colors"
            style={selectStyle}
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            <option value="all">All collections</option>
            {collections
              .filter((value) => value !== "all")
              .map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
          </select>
          <select
            className="pb-1.5 text-xs transition-colors"
            style={selectStyle}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">All sources</option>
            {sources
              .filter((value) => value !== "all")
              .map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
          </select>
          <select
            className="pb-1.5 text-xs transition-colors"
            style={selectStyle}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
          >
            <option value="all">All shapes</option>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
            <option value="square">Square</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scroll-quiet">
        {loading ? (
          <div className="text-center text-xs py-12" style={{ color: 'var(--ink-4)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs py-12" style={{ color: 'var(--ink-4)' }}>No photos found</div>
        ) : (
          <div style={{ columns: "3", gap: "4px" }}>
            {filtered.map((asset) => {
              const key = asset.assetId || asset.publicUrl;
              const isSelected = selected.includes(key);
              return (
                <div
                  key={key}
                  className="relative overflow-hidden cursor-pointer mb-1 break-inside-avoid transition-all"
                  style={{
                    boxShadow: isSelected
                      ? '0 0 0 2px var(--ink)'
                      : '0 0 0 1px var(--rule)',
                  }}
                  onClick={() => toggle(asset)}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", asset.publicUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getSizedUrl(asset.publicUrl, 'thumbnail')}
                    alt={asset.caption || asset.originalFilename}
                    className="w-full block"
                    style={{
                      background: 'var(--paper-2)',
                      aspectRatio: asset.width && asset.height ? `${asset.width} / ${asset.height}` : '3 / 2',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                    onError={(e) => { if (e.target.src !== asset.publicUrl) e.target.src = asset.publicUrl }}
                  />
                  <div className="px-1.5 py-1" style={{ background: 'var(--paper)' }}>
                    <div className="truncate text-[10px]" style={{ color: 'var(--ink-3)' }}>{asset.originalFilename}</div>
                    {asset.source?.provider && (
                      <div className="truncate text-[10px]" style={{ color: 'var(--ink-4)' }}>{asset.source.provider}</div>
                    )}
                  </div>
                  {isSelected && (
                    <div
                      className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--ink)' }}
                    >
                      <span className="text-[8px] font-bold" style={{ color: 'var(--paper)' }}>✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isMulti && (
        <div
          className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid var(--rule)' }}
        >
          <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
            {selected.length > 0 ? `${selected.length} selected` : `${filtered.length} photos`}
          </span>
          <button
            onClick={() => {
              const selectedAssets = filtered.filter((asset) => selected.includes(asset.assetId || asset.publicUrl));
              onConfirm(
                selectedAssets.map((asset) => normalizeImageRef({ assetId: asset.assetId, url: asset.publicUrl })).filter(Boolean)
              );
            }}
            disabled={selected.length === 0}
            className="px-3 py-1.5 disabled:opacity-40 transition-colors"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: 'var(--ink)',
              color: 'var(--paper)',
            }}
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
    if (uploadedUrls.length > 0) {
      onUploaded(uploadedUrls.map((url) => normalizeImageRef(url)).filter(Boolean));
    }
  };

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="p-6 text-center cursor-pointer transition-colors"
        style={{
          border: `1px dashed ${dragging ? 'var(--ink-3)' : 'var(--rule-2)'}`,
          background: dragging ? 'var(--paper-2)' : 'transparent',
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--ink-2)' }}>Drop photos here</div>
        <div className="text-xs" style={{ color: 'var(--ink-4)' }}>or click to browse</div>
      </div>

      {files.length > 0 && (
        <div className="max-h-24 overflow-y-auto space-y-1 scroll-quiet">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <span className="flex-1 truncate text-xs" style={{ color: 'var(--ink-2)' }}>{f.name}</span>
              <span
                className="text-xs"
                style={{
                  color:
                    progress[f.name] === "done" ? '#6a8d5a' :
                    progress[f.name] === "error" ? '#a85a4a' :
                    progress[f.name] === "pending" ? 'var(--ink-4)' : 'var(--ink-4)'
                }}
              >
                {progress[f.name] === "done" ? "✓" : progress[f.name] === "error" ? "✗" : progress[f.name] === "pending" ? "↑" : "·"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="text-xs mb-1" style={{ color: 'var(--ink-4)' }}>
          Folder <span style={{ color: 'var(--ink-4)', opacity: 0.7 }}>(advanced)</span>
        </div>
        <input
          list="upload-folder-options"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="photos/landscapes"
          className="w-full pb-1.5 text-sm outline-none transition-colors"
          style={{ background: 'transparent', borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}
        />
        <datalist id="upload-folder-options">
          {KNOWN_FOLDERS.map((f) => <option key={f} value={f} />)}
        </datalist>
      </div>

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="w-full py-2 disabled:opacity-40 transition-colors"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          background: 'var(--ink)',
          color: 'var(--paper)',
        }}
      >
        {uploading ? "Uploading…" : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

export default function PhotoPickerModal({ images, loading, blockType, onConfirm, onClose }) {
  const [tab, setTab] = useState("library");
  const panelRef = useRef(null);
  const dragState = useRef(null);
  const [pos, setPos] = useState({ x: 300, y: 60 });

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
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (e) => {
    if (e.target.closest("button,input,select,textarea,img")) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  const tabStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col"
      style={{
        left: pos.x,
        top: pos.y,
        width: 320,
        height: 560,
        background: 'var(--paper)',
        border: '1px solid var(--rule)',
        boxShadow: 'var(--pane-shadow-lift)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-grab select-none flex-shrink-0"
        style={{ borderBottom: '1px solid var(--rule)' }}
        onMouseDown={startDrag}
      >
        <button
          onClick={() => setTab("library")}
          className="transition-colors"
          style={{ ...tabStyle, color: tab === "library" ? 'var(--ink)' : 'var(--ink-4)' }}
        >
          Library
        </button>
        <span style={{ color: 'var(--rule-2)', fontSize: 10 }}>|</span>
        <button
          onClick={() => setTab("upload")}
          className="transition-colors"
          style={{ ...tabStyle, color: tab === "upload" ? 'var(--ink)' : 'var(--ink-4)' }}
        >
          Upload
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="transition-colors text-base leading-none"
          style={{ color: 'var(--ink-4)' }}
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === "library" ? (
          <LibraryTab images={images} loading={loading} blockType={blockType} onConfirm={onConfirm} />
        ) : (
          <UploadTab onUploaded={onConfirm} />
        )}
      </div>
    </div>
  );
}
