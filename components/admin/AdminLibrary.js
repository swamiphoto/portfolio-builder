import { useState, useEffect, useCallback } from "react";
import AlbumSidebar from "./AlbumSidebar";
import PhotoGrid from "./PhotoGrid";
import UploadModal from "./UploadModal";
import AddFromLibraryModal from "./AddFromLibraryModal";

export default function AdminLibrary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [libraryData, setLibraryData] = useState(null);
  // { allImages, portfolios, galleries, counts }

  const [selectedAlbum, setSelectedAlbum] = useState({ type: "all", key: "all" });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addLibraryOpen, setAddLibraryOpen] = useState(false);
  const [addLibraryTarget, setAddLibraryTarget] = useState(null);
  // addLibraryTarget: null (add to current album) | { imageUrl } (add single image to album)

  const fetchLibrary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/library");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setLibraryData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const saveConfig = useCallback(async (newConfig) => {
    const res = await fetch("/api/admin/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
    if (!res.ok) throw new Error(`Save failed ${res.status}`);
    // Refresh local state: update counts
    await fetchLibrary();
  }, [fetchLibrary]);

  // Get images for the currently selected album
  const currentImages = () => {
    if (!libraryData) return [];
    if (selectedAlbum.type === "all") return libraryData.allImages;
    if (selectedAlbum.type === "portfolio") return libraryData.portfolios[selectedAlbum.key] || [];
    if (selectedAlbum.type === "gallery") return libraryData.galleries[selectedAlbum.key] || [];
    return [];
  };

  const currentConfig = () => ({
    portfolios: libraryData?.portfolios || {},
    galleries: libraryData?.galleries || {},
  });

  // Default upload folder based on selected album
  const defaultUploadFolder = () => {
    if (!selectedAlbum || selectedAlbum.type === "all") return "";
    const folderMap = {
      landscapes: "photos/landscapes",
      portraits: "photos/portraits",
      bollywood: "photos/bollywood",
      tennis: "photos/tennis",
      headshots: "photos/headshots",
    };
    return folderMap[selectedAlbum.key] || "";
  };

  const handleRemove = useCallback(async (imageUrl) => {
    if (selectedAlbum.type === "all") return;
    const config = currentConfig();
    const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
    const updated = {
      ...config,
      [section]: {
        ...config[section],
        [selectedAlbum.key]: (config[section][selectedAlbum.key] || []).filter((u) => u !== imageUrl),
      },
    };
    await saveConfig(updated);
  }, [selectedAlbum, libraryData, saveConfig]);

  const handleDelete = useCallback(async (imageUrl) => {
    const res = await fetch("/api/admin/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    await fetchLibrary();
  }, [fetchLibrary]);

  const handleUploaded = useCallback(async (uploadedUrls) => {
    setUploadOpen(false);
    if (selectedAlbum.type !== "all") {
      const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
      const config = currentConfig();
      const updated = {
        ...config,
        [section]: {
          ...config[section],
          [selectedAlbum.key]: [...new Set([...(config[section][selectedAlbum.key] || []), ...uploadedUrls])],
        },
      };
      await saveConfig(updated);
    } else {
      await fetchLibrary();
    }
  }, [selectedAlbum, libraryData, saveConfig, fetchLibrary]);

  // "Add to another album" from PhotoTile ⋯ menu
  const handleAddToAlbum = useCallback((imageUrl) => {
    setAddLibraryTarget({ imageUrl });
    setAddLibraryOpen(true);
  }, []);

  // "Add from Library" button in header — adds to current album
  const handleAddFromLibrary = useCallback(() => {
    setAddLibraryTarget(null);
    setAddLibraryOpen(true);
  }, []);

  const handleAddConfirm = useCallback(async (selectedUrls) => {
    setAddLibraryOpen(false);
    const config = currentConfig();

    if (addLibraryTarget) {
      // Single image → user must pick which album — for now add to current album
      if (selectedAlbum.type === "all") return;
      const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
      const updated = {
        ...config,
        [section]: {
          ...config[section],
          [selectedAlbum.key]: [...new Set([...(config[section][selectedAlbum.key] || []), addLibraryTarget.imageUrl])],
        },
      };
      await saveConfig(updated);
    } else {
      if (selectedAlbum.type === "all") return;
      const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
      const updated = {
        ...config,
        [section]: {
          ...config[section],
          [selectedAlbum.key]: [...new Set([...(config[section][selectedAlbum.key] || []), ...selectedUrls])],
        },
      };
      await saveConfig(updated);
    }
  }, [selectedAlbum, libraryData, addLibraryTarget, saveConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading library…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500 text-sm font-medium">Error: {error}</div>
        <div className="text-xs text-gray-400 max-w-sm text-center">
          Make sure GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_CLIENT_EMAIL, and GOOGLE_CLOUD_PRIVATE_KEY are set in .env.local
        </div>
        <button onClick={fetchLibrary} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  const images = currentImages();
  const counts = libraryData?.counts || {};

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <AlbumSidebar
        counts={counts}
        selectedAlbum={selectedAlbum}
        onSelect={setSelectedAlbum}
        onUploadClick={() => setUploadOpen(true)}
      />
      <PhotoGrid
        images={images}
        metadata={libraryData?.metadata || {}}
        selectedAlbum={selectedAlbum}
        onRemove={handleRemove}
        onDelete={handleDelete}
        onAddToAlbum={handleAddToAlbum}
        onUploadClick={() => setUploadOpen(true)}
        onAddFromLibraryClick={handleAddFromLibrary}
      />

      {uploadOpen && (
        <UploadModal
          defaultFolder={defaultUploadFolder()}
          onClose={() => setUploadOpen(false)}
          onUploaded={handleUploaded}
        />
      )}

      {addLibraryOpen && (
        <AddFromLibraryModal
          allImages={libraryData?.allImages || []}
          currentAlbumImages={addLibraryTarget ? [] : images}
          onClose={() => setAddLibraryOpen(false)}
          onAdd={handleAddConfirm}
        />
      )}
    </div>
  );
}
