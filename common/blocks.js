/**
 * Default shapes for block types. Pure data — safe to import from any context
 * (server, client, tests).
 */
export function defaultBlock(type) {
  switch (type) {
    case "photo":
      return { type: "photo", imageUrl: "", caption: "", variant: 1 };
    case "photos":
      return { type: "photos", images: [], imageUrls: [], layout: "stacked" };
    case "stacked":
      return { type: "photos", images: [], imageUrls: [], layout: "stacked" };
    case "masonry":
      return { type: "photos", images: [], imageUrls: [], layout: "masonry" };
    case "text":
      return { type: "text", content: "", variant: 1 };
    case "video":
      return { type: "video", url: "", caption: "", variant: 1 };
    case "page-gallery":
      return { type: "page-gallery", source: "manual", pageIds: [] };
    case "contact":
      return { type: "contact", heading: "", subheading: "" };
    default:
      return { type };
  }
}
