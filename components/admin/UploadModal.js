import { useState, useRef, useEffect } from "react";
import CollectionPillsPicker from "./gallery-builder/CollectionPillsPicker";

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';


function uploadFile(file, { folder, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ filename: file.name, contentType: file.type })
    if (folder) params.set('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject(new Error(data.error || `Upload failed: ${xhr.status}`))
      } catch { reject(new Error(`Upload failed: ${xhr.status}`)) }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.open('POST', `/api/admin/upload-file?${params}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

export default function UploadModal({ collections = [], defaultCollection = null, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(
    defaultCollection ? [defaultCollection] : []
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState({});
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name));
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => {
      const next = { ...prev };
      arr.forEach((f) => { if (!next[f.name]) next[f.name] = URL.createObjectURL(f); });
      return next;
    });
  };

  useEffect(() => {
    return () => { Object.values(previews).forEach(URL.revokeObjectURL); };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (files.length === 0) return;
    const targetCollection = selectedCollections[0] || null;
    const folder = targetCollection ? `photos/${targetCollection}` : undefined;
    setUploading(true);
    const uploadedAssets = [];

    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: 0 }));
      try {
        const { gcsUrl, width, height } = await uploadFile(file, {
          folder,
          onProgress: (pct) => setProgress((p) => ({ ...p, [file.name]: pct })),
        });
        setProgress((p) => ({ ...p, [file.name]: "done" }));
        uploadedAssets.push({ url: gcsUrl, width, height });
      } catch (err) {
        console.error("Upload error for", file.name, err);
        setProgress((p) => ({ ...p, [file.name]: { error: err.message || "Upload failed" } }));
      }
    }

    setUploading(false);
    if (uploadedAssets.length > 0) onUploaded(uploadedAssets, selectedCollections);
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
                  style={{ padding: '4px 8px', borderRadius: 3, background: progress[f.name]?.error ? 'rgba(193,74,74,0.08)' : 'rgba(160,140,110,0.08)' }}
                >
                  {previews[f.name] && (
                    <img
                      src={previews[f.name]}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, flexShrink: 0, opacity: 0.88 }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.name}</div>
                    {progress[f.name]?.error && (
                      <div className="truncate" style={{ fontSize: 10.5, color: '#c14a4a', marginTop: 1 }}>{progress[f.name].error}</div>
                    )}
                  </div>
                  {progress[f.name] === "done" ? (
                    <span style={{ fontSize: 12, color: '#3b8a52', flexShrink: 0 }}>✓</span>
                  ) : progress[f.name]?.error ? (
                    <span style={{ fontSize: 12, color: '#c14a4a', flexShrink: 0 }}>✗</span>
                  ) : typeof progress[f.name] === "number" ? (
                    <div style={{ width: 64, height: 3, borderRadius: 2, background: 'rgba(160,140,110,0.22)', flexShrink: 0, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress[f.name]}%`, background: '#8b6f47', borderRadius: 2, transition: 'width 0.1s ease' }} />
                    </div>
                  ) : null}
                  {(!progress[f.name] || progress[f.name]?.error) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiles(prev => prev.filter(x => x.name !== f.name));
                        setPreviews(prev => { const next = { ...prev }; if (next[f.name]) { URL.revokeObjectURL(next[f.name]); delete next[f.name]; } return next; });
                      }}
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
