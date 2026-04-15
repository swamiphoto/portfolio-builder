export const bucketUrl = "https://storage.googleapis.com/swamiphoto"; // Base URL for your bucket
// Use environment variable if available, otherwise fall back to hardcoded key
const apiKey = process.env.GOOGLE_CLOUD_STORAGE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_CLOUD_STORAGE_API_KEY || "AIzaSyB0Avp_4ydF9e0NFwE3qg8lbX2H0tQhCvs"; // Your Google Cloud API key

if (!apiKey) {
  console.error("WARNING: Google Cloud Storage API key is not configured. Image fetching may fail.");
}
// Get the base URL for API routes (works in both client and server)
const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side: use relative URL
    return "";
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_BASE_URL || "";
};

const IMAGES = {
  landscapes: {
    fog: `${bucketUrl}/photos/landscapes/fog.jpg`,
    fuzzyfall: `${bucketUrl}/photos/landscapes/fuzzyfall.jpg`,
    astro: `${bucketUrl}/photos/landscapes/astro.jpg`,
    bbridge: `${bucketUrl}/photos/landscapes/bbridge.jpg`,
    falltrees: `${bucketUrl}/photos/landscapes/falltrees.jpg`,
    kerala: `${bucketUrl}/photos/landscapes/kerala.jpg`,
    kerala2: `${bucketUrl}/photos/landscapes/kerala2.jpg`,
    mac: `${bucketUrl}/photos/landscapes/mac.jpg`,
    pastel: `${bucketUrl}/photos/landscapes/pastel.jpg`,
    ghost: `${bucketUrl}/photos/landscapes/ghost.jpg`,
    paris: `${bucketUrl}/photos/landscapes/paris.jpeg`,
    comet: `${bucketUrl}/photos/landscapes/comet.jpeg`,
    esierra: `${bucketUrl}/photos/landscapes/esierra.jpeg`,
    hotcreek: `${bucketUrl}/photos/landscapes/hotcreek.jpeg`,
    walton: `${bucketUrl}/photos/landscapes/walton.jpeg`,
    alviso: `${bucketUrl}/photos/landscapes/alviso.jpeg`,
    alviso2: `${bucketUrl}/photos/landscapes/alviso2.jpeg`,
    gateway: `${bucketUrl}/photos/landscapes/gatewayofindia.jpg`,
  },
  portraits: {
    amrita: `${bucketUrl}/photos/portraits/amrita.jpeg`,
    amrita2: `${bucketUrl}/photos/portraits/amrita2.jpeg`,
    mala: `${bucketUrl}/photos/portraits/mala.jpeg`,
    mala2: `${bucketUrl}/photos/portraits/mala2.jpeg`,
    mala3: `${bucketUrl}/photos/portraits/mala3.jpeg`,
    naga: `${bucketUrl}/photos/portraits/naga.jpeg`,
    naga2: `${bucketUrl}/photos/portraits/naga2.jpg`,
    suma: `${bucketUrl}/photos/portraits/suma.jpeg`,
    suma2: `${bucketUrl}/photos/portraits/suma2.jpeg`,
  },
  bollywood: {
    alia: `${bucketUrl}/photos/bollywood/alia.jpg`,
    atif: `${bucketUrl}/photos/bollywood/atif.jpeg`,
    bollywood: `${bucketUrl}/photos/bollywood/bollywood.jpeg`,
    dance: `${bucketUrl}/photos/bollywood/dance.jpeg`,
    glamour: `${bucketUrl}/photos/bollywood/glamour.jpeg`,
    katrina: `${bucketUrl}/photos/bollywood/katrina.jpeg`,
    katrina2: `${bucketUrl}/photos/bollywood/katrina2.jpeg`,
    nargis: `${bucketUrl}/photos/bollywood/nargis.jpeg`,
    nargis2: `${bucketUrl}/photos/bollywood/nargis2.jpeg`,
    nargis3: `${bucketUrl}/photos/bollywood/nargis3.jpeg`,
    prabhu: `${bucketUrl}/photos/bollywood/prabhu.jpeg`,
    shreya: `${bucketUrl}/photos/bollywood/shreya.jpeg`,
  },
  tennis: {
    federer: {
      fed1: `${bucketUrl}/photos/tennis/federer/fed1.jpg`,
      fed2: `${bucketUrl}/photos/tennis/federer/fed2.jpg`,
      fed3: `${bucketUrl}/photos/tennis/federer/fed3.jpg`,
      fed4: `${bucketUrl}/photos/tennis/federer/fed4.jpg`,
      fed5: `${bucketUrl}/photos/tennis/federer/fed5.jpg`,
      fed6: `${bucketUrl}/photos/tennis/federer/fed6.jpeg`,
      fed7: `${bucketUrl}/photos/tennis/federer/fed7.jpeg`,
      fed8: `${bucketUrl}/photos/tennis/federer/fed8.jpeg`,
      fed9: `${bucketUrl}/photos/tennis/federer/fed9.jpeg`,
      fed10: `${bucketUrl}/photos/tennis/federer/fed10.jpeg`,
      fed11: `${bucketUrl}/photos/tennis/federer/fed11.jpeg`,
      fed12: `${bucketUrl}/photos/tennis/federer/fed12.jpeg`,
      fed13: `${bucketUrl}/photos/tennis/federer/fed13.jpeg`,
      fed14: `${bucketUrl}/photos/tennis/federer/fed14.jpeg`,
    },
    novak: `${bucketUrl}/photos/tennis/novak.jpeg`,
    osaka: `${bucketUrl}/photos/tennis/osaka.jpeg`,
    dimitrov: `${bucketUrl}/photos/tennis/dimitrov.jpeg`,
    grateful: `${bucketUrl}/photos/tennis/grateful.jpeg`,
    venus: `${bucketUrl}/photos/tennis/venus.jpeg`,
  },
  headshots: {
    naga: `${bucketUrl}/photos/headshots/naga.jpg`,
    naga2: `${bucketUrl}/photos/headshots/naga2.jpg`,
    naga3: `${bucketUrl}/photos/headshots/naga3.jpg`,
    mala: `${bucketUrl}/photos/headshots/mala.jpg`,
    mala2: `${bucketUrl}/photos/headshots/mala2.jpg`,
    sudha: `${bucketUrl}/photos/headshots/sudha.jpg`,
    sudha2: `${bucketUrl}/photos/headshots/sudha2.jpg`,
    sudha3: `${bucketUrl}/photos/headshots/sudha3.jpg`,
    ashwini: `${bucketUrl}/photos/headshots/ashwini.jpg`,
    ashwini2: `${bucketUrl}/photos/headshots/ashwini2.jpeg`,
    vijay: `${bucketUrl}/photos/headshots/vijay.jpg`,
    vmirpuri: `${bucketUrl}/photos/headshots/vmirpuri.jpg`,
    raj: `${bucketUrl}/photos/headshots/raj.jpg`,
    searce1: `${bucketUrl}/photos/headshots/searce1.jpg`,
    searce2: `${bucketUrl}/photos/headshots/searce2.jpg`,
    searce3: `${bucketUrl}/photos/headshots/searce3.jpg`,
    searce4: `${bucketUrl}/photos/headshots/searce4.jpg`,
    searce5: `${bucketUrl}/photos/headshots/searce5.jpg`,
    searce6: `${bucketUrl}/photos/headshots/searce6.jpg`,
    searce7: `${bucketUrl}/photos/headshots/searce7.jpg`,
  },
  me: `${bucketUrl}/photos/me.jpeg`,
};

const getCloudimageUrl = (imageUrl, params = {}) => {
  // TEMPORARILY DISABLED: Return original URL without resizing to test if resizing is causing issues
  // Clean up imageUrl - remove cloudimg.io prefix if present (for migration)
  let cleanImageUrl = imageUrl.replace(/^https?:\/\/[^\/]+\.cloudimg\.io\//, "");

  // If it doesn't start with http, ensure it's a full URL
  if (!cleanImageUrl.startsWith("http")) {
    cleanImageUrl = cleanImageUrl.startsWith("/") ? cleanImageUrl : `https://${cleanImageUrl}`;
  }

  // Validate the URL is properly formatted
  if (!cleanImageUrl || cleanImageUrl.trim() === "") {
    console.error("getCloudimageUrl: Empty or invalid imageUrl provided:", imageUrl);
    return imageUrl; // Return original as fallback
  }

  // Log in development to help debug
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log("getCloudimageUrl processed:", { original: imageUrl, processed: cleanImageUrl, params });
    }
  }

  // TEMPORARY: Return original URL directly
  return cleanImageUrl;

  // ORIGINAL CODE (commented out for testing):
  // // Build query parameters for the resize API
  // const queryParams = new URLSearchParams({
  //   url: cleanImageUrl,
  //   ...(params.width && { width: params.width.toString() }),
  //   ...(params.quality && { quality: params.quality.toString() }),
  // });

  // // Use the new resize-image API endpoint
  // const apiBaseUrl = getApiBaseUrl();
  // return `${apiBaseUrl}/api/resize-image?${queryParams.toString()}`;
};

// Helper function to encode Base64 (URL-safe)
export const base64Encode = (str) => {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// Helper function to decode Base64 (URL-safe)
export const base64Decode = (str) => {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
};

// Common function to handle photo clicks and navigate to the lightbox
export const handleImageClick = (imageUrl, allPhotos, router) => {
  const currentIndex = allPhotos.indexOf(imageUrl); // Find the index of the clicked photo
  const previousImageUrls = allPhotos.slice(0, currentIndex); // Get previous images
  const nextImageUrls = allPhotos.slice(currentIndex + 1); // Get next images

  const uniqueId = base64Encode(imageUrl); // Base64 encode the image URL

  // Store the current page (parent page) in localStorage
  localStorage.setItem("parentPage", router.asPath); // Store the current route as the parent page

  if (uniqueId) {
    localStorage.setItem(
      "imageNavigation",
      JSON.stringify({
        previousImageUrls,
        nextImageUrls,
        currentImage: imageUrl,
      })
    );

    router.push(`/image/${uniqueId}`);
  }
};

// Generate a deterministic unique ID for each image based on its key and category
const generateUniqueId = (key) => {
  return key; // Simply return the key as the unique ID
};

// Generate a mapping of unique IDs to image URLs
const generateImageMapping = (images) => {
  const mapping = {};

  const createMapping = (imageObj) => {
    Object.keys(imageObj).forEach((key) => {
      if (typeof imageObj[key] === "string") {
        const uniqueId = generateUniqueId(key); // Use the key directly
        mapping[uniqueId] = imageObj[key];
      } else {
        createMapping(imageObj[key]);
      }
    });
  };

  Object.keys(images).forEach((category) => {
    createMapping(images[category]);
  });

  return mapping;
};
const imageMapping = generateImageMapping(IMAGES);

// Server-side compatible image URL fetcher
// Works in both Node.js (build time) and browser (client-side)
const fetchImageUrls = async (folder, retries = 2, abortSignal = null) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Check if aborted before starting (only relevant for client-side)
    if (abortSignal && abortSignal.aborted) {
      throw new Error("Request aborted");
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Combine abort signals if provided (client-side only)
      let signal = controller.signal;
      if (abortSignal && typeof abortSignal.addEventListener === "function") {
        // If external abort signal triggers, abort our controller too
        abortSignal.addEventListener("abort", () => controller.abort());
        signal = controller.signal;
      }

      const response = await fetch(`https://storage.googleapis.com/storage/v1/b/swamiphoto/o?prefix=photos/${folder}/&key=${apiKey}`, {
        signal: signal,
      });

      clearTimeout(timeoutId);

      // Check if aborted after fetch (client-side only)
      if (abortSignal && abortSignal.aborted) {
        throw new Error("Request aborted");
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`HTTP error for folder ${folder}: status ${response.status}, body: ${errorText.substring(0, 500)}`);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();

      // Check if aborted after parsing (client-side only)
      if (abortSignal && abortSignal.aborted) {
        throw new Error("Request aborted");
      }

      // Validate response structure
      if (!data) {
        console.error(`Invalid response for folder ${folder}:`, data);
        throw new Error("Invalid response: no data");
      }

      // Check for API errors in response
      if (data.error) {
        console.error(`Google Cloud Storage API error for folder ${folder}:`, data.error);
        throw new Error(`API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (!Array.isArray(data.items)) {
        console.error(`Invalid response structure for folder ${folder}. Expected items array, got:`, typeof data.items, data);
        throw new Error(`Invalid response structure: items is not an array. Response: ${JSON.stringify(data).substring(0, 200)}`);
      }

      const urls = data.items
        .filter((item) => item && item.name && item.name.match(/\.(jpg|jpeg|png|gif)$/i)) // Filter out non-image URLs
        .map((item) => `${bucketUrl}/${item.name}`);

      if (urls.length === 0) {
        console.warn(`No images found in folder ${folder} (found ${data.items.length} items total)`);
        if (attempt < retries) {
          // If no URLs found and we have retries left, try again
          continue;
        }
      } else {
        console.log(`Successfully fetched ${urls.length} images from folder ${folder}`);
      }

      return urls;
    } catch (error) {
      // Don't retry if aborted
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        throw error;
      }

      if (error.name === "AbortError") {
        console.error(`Timeout fetching image URLs for ${folder} (attempt ${attempt + 1}/${retries + 1})`);
      } else {
        console.error(`Error fetching image URLs for ${folder} (attempt ${attempt + 1}/${retries + 1}):`, error.message || error);
        // Log full error in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Full error:', error);
        }
      }

      // If this was the last attempt, log final failure and return empty array
      if (attempt === retries) {
        console.error(`Failed to fetch images for folder ${folder} after ${retries + 1} attempts. Returning empty array.`);
        return [];
      }

      // Wait before retrying (exponential backoff), but check for abort during wait (client-side only)
      for (let i = 0; i < 1000 * (attempt + 1); i += 100) {
        if (abortSignal && abortSignal.aborted) {
          throw new Error("Request aborted");
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
  return [];
};

const getImageResolution = () => {
  const screenWidth = window.innerWidth;

  if (screenWidth <= 768) {
    // Mobile screens
    return { width: screenWidth, quality: 50 }; // Use the actual screen width for mobile
  } else if (screenWidth > 768 && screenWidth <= 1440) {
    // Standard desktop screens
    return { width: screenWidth, quality: 70 }; // Use the screen width for desktop
  } else {
    // Very large screens (4K, ultra-wide, etc.)
    return { width: screenWidth, quality: 90 }; // Use the screen width for large screens
  }
};

export default IMAGES;
export { imageMapping, fetchImageUrls, generateUniqueId, getCloudimageUrl, getImageResolution };
