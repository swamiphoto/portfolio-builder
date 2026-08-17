// Height-aware masonry packing.
//
// react-masonry-css distributes items round-robin by index (i % columnCount),
// which is blind to image heights: in a 2-column layout every odd image lands
// in the same column regardless of how lopsided the columns already are. That
// leaves tall-portrait + short-landscape sets badly unbalanced.
//
// This packs greedily instead: each image goes into whichever column is
// currently shortest, so the columns stay level. `heightFactors[i]` is the
// image's rendered height per unit of (equal) column width — i.e. 1/aspectRatio
// where aspectRatio = width/height. Ties go to the leftmost column so reading
// order stays natural.
//
// Returns an array of length `columnCount`; each entry is an array of the
// original image indices assigned to that column, in source order.
export function packColumns(heightFactors, columnCount) {
  const count = Math.max(1, Math.floor(columnCount) || 1);
  const columns = Array.from({ length: count }, () => []);
  const columnHeights = new Array(count).fill(0);

  heightFactors.forEach((factor, index) => {
    const h = Number.isFinite(factor) && factor > 0 ? factor : 1;
    let shortest = 0;
    for (let c = 1; c < count; c++) {
      // Strictly-less keeps ties on the leftmost column.
      if (columnHeights[c] < columnHeights[shortest] - 1e-9) shortest = c;
    }
    columns[shortest].push(index);
    columnHeights[shortest] += h;
  });

  return columns;
}
