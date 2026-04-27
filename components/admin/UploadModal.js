import { useState, useRef } from "react";
import CollectionPillsPicker from "./gallery-builder/CollectionPillsPicker";

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';

function readImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null }); };
    img.src = url;
  });
}

async function generateThumbnail(file, maxWidth = 600) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  } catch {
    return null;
  }
}

async function uploadToSignedUrl(signedUrl, blob, contentType) {
  const formData = new FormData();
  Object.entries(signedUrl.fields).forEach(([k, v]) => formData.append(k, v));
  formData.append('file', blob);
  const res = await fetch(signedUrl.url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

export default function UploadModal({ collections = [], defaultCollection = null, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(
    defaultCollection ? [defaultCollection] : []
  );
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
    const targetCollection = selectedCollections[0] || null;
    const folder = targetCollection ? `photos/${targetCollection}` : undefined;
    setUploading(true);
    const uploadedAssets = [];

    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "pending" }));
      try {
        const [{ width, height }, thumb] = await Promise.all([
          readImageDimensions(file),
          generateThumbnail(file),
        ]);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            folder,
            collections: selectedCollections,
          }),
        });
        const { signedUrl, thumbSignedUrl, gcsUrl } = await res.json();
        await Promise.all([
          uploadToSignedUrl(signedUrl, file, file.type),
          thumb && thumbSignedUrl ? uploadToSignedUrl(thumbSignedUrl, thumb, 'image/jpeg') : Promise.resolve(),
        ]);
        setProgress((p) => ({ ...p, [file.name]: "done" }));
        uploadedAssets.push({ url: gcsUrl, width, height });
      } catch (err) {
        console.error("Upload error for", file.name, err);
        setProgress((p) => ({ ...p, [file.name]: "error" }));
      }
    }

    setUploading(false);
    if (uploadedAssets.length > 0) onUploaded(uploadedAssets, targetCollection);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20,12,4,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 480,
          maxHeight: '85vh',
          background: 'var(--popover)',
          boxShadow: 'var(--popover-shadow)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{ height: 44, borderBottom: '1px solid rgba(160,140,110,0.22)' }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Upload Photos
          </span>
          <button
            onClick={onClose}
            className="ml-auto w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scroll-quiet" style={{ padding: '14px 14px 0' }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center text-center cursor-pointer transition-colors flex-shrink-0"
            style={{
              border: `1.5px dashed ${dragging ? 'rgba(120,90,60,0.65)' : 'rgba(160,140,110,0.32)'}`,
              background: dragging ? 'rgba(160,140,110,0.10)' : 'rgba(255,253,248,0.45)',
              borderRadius: 6,
              minHeight: files.length === 0 ? 180 : 100,
              padding: files.length === 0 ? '36px 16px' : '20px 16px',
              transition: 'all 0.18s ease',
            }}
          >
            <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <div
              className="rounded-full flex items-center justify-center mb-2"
              style={{ width: 44, height: 44, background: 'rgba(160,140,110,0.18)', color: '#8b6f47' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Drop photos here</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>or click to browse · JPG, PNG, GIF</div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1 scroll-quiet" style={{ marginTop: 10, paddingBottom: 4 }}>
              {files.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-2 group"
                  style={{ padding: '4px 8px', borderRadius: 3, background: 'rgba(160,140,110,0.08)' }}
                >
                  <span className="flex-1 truncate" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.name}</span>
                  <span style={{
                    fontSize: 10.5, fontFamily: MONO, fontWeight: 500,
                    color: progress[f.name] === "done" ? '#3b8a52'
                         : progress[f.name] === "error" ? '#c14a4a'
                         : progress[f.name] === "pending" ? 'var(--text-secondary)'
                         : 'var(--text-muted)',
                  }}>
                    {progress[f.name] === "done" ? "✓" : progress[f.name] === "error" ? "✗" : progress[f.name] === "pending" ? "…" : "·"}
                  </span>
                  {!progress[f.name] && (
                    <button
                      type="button"
                      onClick={() => setFiles(prev => prev.filter(x => x.name !== f.name))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#c14a4a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collections */}
        <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(160,140,110,0.18)', marginTop: 12, paddingTop: 10, paddingBottom: 10 }}>
          <CollectionPillsPicker
            existingSlugs={collections}
            selectedSlugs={selectedCollections}
            onAdd={(slug) => setSelectedCollections(prev => prev.includes(slug) ? prev : [...prev, slug])}
            onRemove={(slug) => setSelectedCollections(prev => prev.filter(s => s !== slug))}
            onCreate={(slug) => setSelectedCollections(prev => prev.includes(slug) ? prev : [...prev, slug])}
          />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0" style={{ padding: '10px 14px', borderTop: '1px solid rgba(160,140,110,0.18)' }}>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full"
            style={{
              background: files.length === 0 || uploading ? 'rgba(60,40,15,0.20)' : '#2c2416',
              color: '#f5ecd6',
              fontSize: 12,
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 4,
              cursor: files.length === 0 || uploading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              border: 'none',
            }}
          >
            {uploading ? "Uploading…" : files.length === 0 ? "Upload photos" : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
