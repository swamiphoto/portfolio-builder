import { useState, useEffect, useCallback, useMemo } from "react";
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
    camera: "all",
    lens: "all",
    focalLength: "all",
    iso: "all",
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
      if (filters.source !== "all" && asset.source?.provider !== filters.source) return false;
      if (filters.orientation !== "all" && asset.orientation !== filters.orientation) return false;

      const usageCount = asset.usage?.usageCount || 0;
      if (filters.usage === "unused" && usageCount > 0) return false;
      if (filters.usage === "used" && usageCount === 0) return false;

      if (filters.camera !== "all" && asset.capture?.cameraModel !== filters.camera) return false;
      if (filters.lens !== "all" && asset.capture?.lens !== filters.lens) return false;

      if (filters.focalLength !== "all") {
        const fl = asset.capture?.focalLengthMm;
        if (!fl) return false;
        if (filters.focalLength === "wide" && fl > 35) return false;
        if (filters.focalLength === "normal" && (fl <= 35 || fl > 85)) return false;
        if (filters.focalLength === "tele" && (fl <= 85 || fl > 200)) return false;
        if (filters.focalLength === "super" && fl <= 200) return false;
      }

      if (filters.iso !== "all") {
        const iso = asset.capture?.iso;
        if (!iso) return false;
        if (filters.iso === "low" && iso > 400) return false;
        if (filters.iso === "mid" && (iso <= 400 || iso > 1600)) return false;
        if (filters.iso === "high" && iso <= 1600) return false;
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

  const allCollections = useMemo(() => {
    const galleries = Object.keys(libraryData?.galleries || {}).map(slug => ({ slug, type: 'gallery' }));
    const portfolios = Object.keys(libraryData?.portfolios || {}).map(slug => ({ slug, type: 'portfolio' }));
    return [...galleries, ...portfolios].sort((a, b) => a.slug.localeCompare(b.slug));
  }, [libraryData]);

  const collectionsByUrl = useMemo(() => {
    if (!libraryData) return {};
    const map = {};
    Object.entries(libraryData.galleries || {}).forEach(([slug, urls]) => {
      (urls || []).forEach(url => {
        if (!map[url]) map[url] = [];
        map[url].push({ slug, type: 'gallery' });
      });
    });
    Object.entries(libraryData.portfolios || {}).forEach(([slug, urls]) => {
      (urls || []).forEach(url => {
        if (!map[url]) map[url] = [];
        map[url].push({ slug, type: 'portfolio' });
      });
    });
    return map;
  }, [libraryData]);

  const currentConfig = useCallback(() => ({
    portfolios: libraryData?.portfolios || {},
    galleries: libraryData?.galleries || {},
    assets: libraryData?.assets || {},
  }), [libraryData]);

  const handleToggleCollection = useCallback(async (imageUrl, slug, type, add) => {
    const section = type === 'portfolio' ? 'portfolios' : 'galleries';
    setLibraryData(prev => {
      if (!prev) return prev;
      const current = prev[section]?.[slug] || [];
      const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl);
      return { ...prev, [section]: { ...prev[section], [slug]: updated } };
    });
    const config = currentConfig();
    const current = config[section][slug] || [];
    const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl);
    await fetch("/api/admin/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, [section]: { ...config[section], [slug]: updated } }),
    });
  }, [currentConfig]);

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
  }, [selectedAlbum, saveConfig, currentConfig]);

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

  const handleUploaded = useCallback(async (uploadedAssets, targetCollection) => {
    // uploadedAssets: [{ url, width, height }], targetCollection: gallery key or null
    setUploadOpen(false);
    const uploadedUrls = uploadedAssets.map(a => a.url);

    const config = currentConfig();

    // Seed asset dimension metadata for newly uploaded files
    const assetUpdates = {};
    for (const { url, width, height } of uploadedAssets) {
      if (!width || !height) continue;
      const { createAssetIdFromUrl } = await import('../../common/adminConfig');
      const assetId = createAssetIdFromUrl(url);
      const ratio = width / height;
      assetUpdates[assetId] = {
        ...(libraryData?.assets?.[assetId] || {}),
        assetId,
        publicUrl: url,
        width,
        height,
        aspectRatio: Number(ratio.toFixed(4)),
        orientation: ratio === 1 ? 'square' : ratio > 1 ? 'landscape' : 'portrait',
      };
    }

    const updated = {
      ...config,
      assets: { ...config.assets, ...assetUpdates },
    };

    if (targetCollection) {
      updated.galleries = {
        ...config.galleries,
        [targetCollection]: [...new Set([...(config.galleries[targetCollection] || []), ...uploadedUrls])],
      };
      setSelectedAlbum({ type: 'gallery', key: targetCollection });
    }

    await saveConfig(updated);
  }, [saveConfig, fetchLibrary, currentConfig, libraryData]);

  const handleCaptionChange = useCallback(async (assetId, caption) => {
    if (!assetId) return;
    // Optimistic local update — patch both assets map and images array
    setLibraryData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), caption } },
        images: (prev.images || []).map(img => img.assetId === assetId ? { ...img, caption } : img),
      };
    });
    const config = currentConfig();
    const updated = {
      ...config,
      assets: { ...config.assets, [assetId]: { ...(config.assets[assetId] || {}), caption } },
    };
    await fetch("/api/admin/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }, [currentConfig]);

  const handleCreateCollection = useCallback(async (name, parentKey = null) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    if (!slug) return
    const key = parentKey ? `${parentKey}/${slug}` : slug
    const config = currentConfig()
    if (config.galleries[key]) return
    const updated = { ...config, galleries: { ...config.galleries, [key]: [] } }
    await saveConfig(updated)
    setSelectedAlbum({ type: "gallery", key })
  }, [saveConfig, currentConfig]);

  const handleDeleteCollection = useCallback(async (key) => {
    const config = currentConfig()
    const prefix = key + '/'
    const filtered = Object.fromEntries(
      Object.entries(config.galleries).filter(([k]) => k !== key && !k.startsWith(prefix))
    )
    const updated = { ...config, galleries: filtered }
    if (selectedAlbum.type === 'gallery' && (selectedAlbum.key === key || selectedAlbum.key.startsWith(prefix))) {
      setSelectedAlbum({ type: 'all', key: 'all' })
    }
    await saveConfig(updated)
  }, [saveConfig, currentConfig, selectedAlbum])

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
  }, [selectedAlbum, addLibraryTarget, saveConfig, currentConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-ink-4 text-sm bg-paper">
        Loading library…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-paper">
        <div className="text-red-500 text-sm font-medium">Error: {error}</div>
        <div className="text-xs text-ink-4 max-w-sm text-center">
          Make sure GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_CLIENT_EMAIL, and GOOGLE_CLOUD_PRIVATE_KEY are set in .env.local
        </div>
        <button onClick={fetchLibrary} className="text-sm bg-ink text-paper px-4 py-2">
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

  const cameraCounts = allAssets.reduce((acc, asset) => {
    const cam = asset.capture?.cameraModel;
    if (cam) acc[cam] = (acc[cam] || 0) + 1;
    return acc;
  }, {});

  const lensCounts = allAssets.reduce((acc, asset) => {
    const lens = asset.capture?.lens;
    if (lens) acc[lens] = (acc[lens] || 0) + 1;
    return acc;
  }, {});

  const focalLengthCounts = allAssets.reduce((acc, asset) => {
    const fl = asset.capture?.focalLengthMm;
    if (!fl) return acc;
    if (fl <= 35) acc.wide = (acc.wide || 0) + 1;
    else if (fl <= 85) acc.normal = (acc.normal || 0) + 1;
    else if (fl <= 200) acc.tele = (acc.tele || 0) + 1;
    else acc.super = (acc.super || 0) + 1;
    return acc;
  }, {});

  const isoCounts = allAssets.reduce((acc, asset) => {
    const iso = asset.capture?.iso;
    if (!iso) return acc;
    if (iso <= 400) acc.low = (acc.low || 0) + 1;
    else if (iso <= 1600) acc.mid = (acc.mid || 0) + 1;
    else acc.high = (acc.high || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full overflow-hidden font-sans bg-paper">
      <AlbumSidebar
        counts={counts}
        selectedAlbum={selectedAlbum}
        onSelect={setSelectedAlbum}
        onCreateCollection={handleCreateCollection}
        onDeleteCollection={handleDeleteCollection}
        onUploadClick={() => setUploadOpen(true)}
        sourceCounts={sourceCounts}
        orientationCounts={orientationCounts}
        usageCounts={usageCounts}
        cameraCounts={cameraCounts}
        lensCounts={lensCounts}
        focalLengthCounts={focalLengthCounts}
        isoCounts={isoCounts}
        filters={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      />
      <PhotoGrid
        assets={assets}
        selectedAlbum={selectedAlbum}
        collectionsByUrl={collectionsByUrl}
        allCollections={allCollections}
        onRemove={handleRemove}
        onDelete={handleDelete}
        onAddToAlbum={handleAddToAlbum}
        onCaptionChange={handleCaptionChange}
        onToggleCollection={handleToggleCollection}
        onUploadClick={() => setUploadOpen(true)}
        onAddFromLibraryClick={handleAddFromLibrary}
      />

      {uploadOpen && (
        <UploadModal
          collections={Object.keys(libraryData?.galleries || {})}
          defaultCollection={selectedAlbum.type === 'gallery' ? selectedAlbum.key : null}
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
