import { useState, useRef } from "react";

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

export default function UploadModal({ defaultFolder, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState(defaultFolder || "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({}); // filename → 'pending' | 'done' | 'error'
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter((f) =>
      /\.(jpg|jpeg|png|gif)$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...arr]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "pending" }));
      try {
        // 1. Get signed policy from our API
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            folder: folder || undefined,
          }),
        });
        const { signedUrl, gcsUrl } = await res.json();

        // 2. POST file directly to GCS using the signed policy
        const formData = new FormData();
        Object.entries(signedUrl.fields).forEach(([k, v]) => formData.append(k, v));
        formData.append("file", file);

        const uploadRes = await fetch(signedUrl.url, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

        setProgress((p) => ({ ...p, [file.name]: "done" }));
        uploadedUrls.push(gcsUrl);
      } catch (err) {
        console.error("Upload error for", file.name, err);
        setProgress((p) => ({ ...p, [file.name]: "error" }));
      }
    }

    setUploading(false);
    if (uploadedUrls.length > 0) onUploaded(uploadedUrls);
  };

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

        {/* Folder picker */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            GCS folder <span className="text-gray-400 font-normal">(optional — blank = photos/library)</span>
          </label>
          <input
            list="folder-options"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="photos/landscapes"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
          <datalist id="folder-options">
            {KNOWN_FOLDERS.map((f) => <option key={f} value={f} />)}
          </datalist>
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
            disabled={files.length === 0 || uploading}
            className="flex-1 bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
