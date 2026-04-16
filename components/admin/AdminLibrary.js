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
  const [filters, setFilters] = useState({
    source: "all",
    orientation: "all",
    usage: "all",
  });
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

  const getFallbackAsset = useCallback((imageUrl) => {
    if (!imageUrl) return null;

    const meta = libraryData?.metadata?.[imageUrl] || {};

    return {
      assetId: meta.assetId || imageUrl,
      publicUrl: imageUrl,
      originalFilename: meta.name || imageUrl.split("/").pop() || imageUrl,
      bytes: meta.size || 0,
      width: meta.width || null,
      height: meta.height || null,
      orientation: meta.orientation || "unknown",
      caption: "",
      tags: [],
      source: meta.source || { provider: "manual", type: "upload" },
      usage: { usageCount: meta.usageCount || 0 },
      createdAt: meta.timeCreated || null,
      updatedAt: meta.updated || null,
    };
  }, [libraryData]);

  const getAssetByUrl = useCallback((imageUrl) => {
    if (!imageUrl) return null;

    const assetId = libraryData?.assetIdByUrl?.[imageUrl];
    if (assetId && libraryData?.assets?.[assetId]) {
      return libraryData.assets[assetId];
    }

    return getFallbackAsset(imageUrl);
  }, [libraryData, getFallbackAsset]);

  const applyFilters = useCallback((assets) => {
    return assets.filter((asset) => {
      if (filters.source !== "all" && asset.source?.provider !== filters.source) {
        return false;
      }

      if (filters.orientation !== "all" && asset.orientation !== filters.orientation) {
        return false;
      }

      const usageCount = asset.usage?.usageCount || 0;
      if (filters.usage === "unused" && usageCount > 0) {
        return false;
      }
      if (filters.usage === "used" && usageCount === 0) {
        return false;
      }

      return true;
    });
  }, [filters]);

  // Get assets for the currently selected album
  const currentAssets = () => {
    if (!libraryData) return [];

    if (selectedAlbum.type === "all") {
      return applyFilters(libraryData.images || []);
    }

    if (selectedAlbum.type === "portfolio") {
      const urls = libraryData.portfolios[selectedAlbum.key] || []
      return applyFilters(urls.map(getAssetByUrl).filter(Boolean))
    }

    // Gallery rollup: own + all descendants, deduped
    const galleries = libraryData.galleries || {}
    const prefix = selectedAlbum.key + '/'
    const matchingKeys = Object.keys(galleries).filter(
      (k) => k === selectedAlbum.key || k.startsWith(prefix)
    )
    const urls = [...new Set(matchingKeys.flatMap((k) => galleries[k] || []))]
    return applyFilters(urls.map(getAssetByUrl).filter(Boolean))
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
  }, [selectedAlbum, saveConfig]);

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
  }, [selectedAlbum, saveConfig, fetchLibrary]);

  const handleCreateCollection = useCallback(async (name, parentKey = null) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    if (!slug) return
    const key = parentKey ? `${parentKey}/${slug}` : slug
    const config = currentConfig()
    if (config.galleries[key]) return
    const updated = { ...config, galleries: { ...config.galleries, [key]: [] } }
    await saveConfig(updated)
    setSelectedAlbum({ type: "gallery", key })
  }, [saveConfig]);

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
  }, [selectedAlbum, addLibraryTarget, saveConfig]);

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

  const assets = currentAssets();
  const allAssets = (libraryData?.images || []).map((asset) => asset || null).filter(Boolean);
  const counts = libraryData?.counts || {};
  const sourceCounts = allAssets.reduce((acc, asset) => {
    const source = asset.source?.provider || "manual";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
  const orientationCounts = allAssets.reduce((acc, asset) => {
    const orientation = asset.orientation || "unknown";
    acc[orientation] = (acc[orientation] || 0) + 1;
    return acc;
  }, {});
  const usageCounts = allAssets.reduce((acc, asset) => {
    if ((asset.usage?.usageCount || 0) > 0) acc.used += 1;
    else acc.unused += 1;
    return acc;
  }, { used: 0, unused: 0 });

  return (
    <div className="flex h-full overflow-hidden font-sans bg-white">
      <AlbumSidebar
        counts={counts}
        selectedAlbum={selectedAlbum}
        onSelect={setSelectedAlbum}
        onCreateCollection={handleCreateCollection}
        onUploadClick={() => setUploadOpen(true)}
        sourceCounts={sourceCounts}
        orientationCounts={orientationCounts}
        usageCounts={usageCounts}
        filters={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      />
      <PhotoGrid
        assets={assets}
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
          allAssets={allAssets}
          currentAlbumAssets={addLibraryTarget ? [] : assets}
          onClose={() => setAddLibraryOpen(false)}
          onAdd={handleAddConfirm}
        />
      )}
    </div>
  );
}
