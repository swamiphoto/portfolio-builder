import { useState, useRef } from "react";

function readImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null }) }
    img.src = url
  })
}

async function generateThumbnail(file, maxWidth = 600) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxWidth / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  } catch {
    return null
  }
}

async function uploadToSignedUrl(signedUrl, blob, contentType) {
  const formData = new FormData()
  Object.entries(signedUrl.fields).forEach(([k, v]) => formData.append(k, v))
  formData.append('file', blob)
  const res = await fetch(signedUrl.url, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
}

function deriveSlug(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function UploadModal({ collections = [], defaultCollection = null, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(defaultCollection || "");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const sortedCollections = [...collections].sort();

  const getTargetCollection = () => {
    if (creating) {
      const slug = deriveSlug(newName);
      if (!slug) return null;
      return newParent ? `${newParent}/${slug}` : slug;
    }
    return selectedCollection || null;
  };

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name));
    setFiles((prev) => [...prev, ...arr]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    const targetCollection = getTargetCollection();
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
          body: JSON.stringify({ filename: file.name, contentType: file.type, folder: targetCollection || undefined }),
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

  const previewSlug = creating && newName.trim() ? deriveSlug(newName) : null;
  const previewKey = previewSlug ? (newParent ? `${newParent}/${previewSlug}` : previewSlug) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload Photos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="text-3xl mb-2">📁</div>
          <div className="text-sm font-medium text-gray-700">Drop photos here or click to browse</div>
          <div className="text-xs text-gray-400 mt-1">JPG, PNG · Multiple files supported</div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto space-y-1">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex-1 truncate">{f.name}</span>
                <span className={
                  progress[f.name] === "done" ? "text-green-500" :
                  progress[f.name] === "error" ? "text-red-500" :
                  progress[f.name] === "pending" ? "text-blue-400" : "text-gray-300"
                }>
                  {progress[f.name] === "done" ? "✓" :
                   progress[f.name] === "error" ? "✗" :
                   progress[f.name] === "pending" ? "↑" : "·"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Collection picker */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Add to collection</label>
          {!creating ? (
            <div className="flex gap-2">
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500 bg-white text-gray-700"
              >
                <option value="">Library only (no collection)</option>
                {sortedCollections.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={() => setCreating(true)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
              >
                + New
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={newParent}
                  onChange={(e) => setNewParent(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500 bg-white text-gray-700"
                  style={{ width: '45%' }}
                >
                  <option value="">Top level</option>
                  {sortedCollections.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  autoFocus
                  placeholder="Collection name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500"
                />
              </div>
              {previewKey && (
                <div className="text-xs text-gray-400">
                  Will create: <span className="font-mono text-gray-600">{previewKey}</span>
                </div>
              )}
              <button
                onClick={() => { setCreating(false); setNewName(""); setNewParent(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ← Pick existing instead
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading || (creating && !previewKey)}
            className="flex-1 bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
