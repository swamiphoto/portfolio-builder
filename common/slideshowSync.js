export const MUSIC_POOL = [
  { id: 'IvoAT-5HKwM', label: 'Richard Clayderman — Eléana' },
  { id: 'PYujyluMxMU', label: 'Monica Bellucci — Oceo' },
  { id: 'ZTmF2v59CtI', label: 'Sheila Ki Jawani — Katrina Kaif' },
  { id: 'JkfSV51U-64', label: 'Richard Clayderman — Yesterday' },
  { id: 'puOnVzlkrQM', label: 'Jab Koi Baat Bigad Jaye — Ash King' },
  { id: 'qj4RiKoARPk', label: 'Fuyu no Hana — 冬の華' },
  { id: 'BciS5krYL80', label: 'Hotel California — Eagles' },
  { id: '_iktURk0X-A', label: 'Phir Bhi Tumko Chaahunga — Arijit Singh' },
  { id: 'BeUSuSXBqMQ', label: 'Richard Clayderman — Murmures' },
  { id: 'hzGHrQBq_i4', label: 'Denean — To the Children' },
  { id: '6P5zx_rxlhI', label: 'La Playa' },
  { id: 'qmBW9-fUvag', label: 'Tajdar-e-Haram' },
  { id: 'S61L1fpqFXE', label: 'Chikku Bukku Rayile — AR Rahman' },
  { id: 'LD5W8W7-0II', label: 'U. Shrinivas — Parjanya' },
  { id: 'U1FZVpcKhGg', label: 'Richard Clayderman — Souvenirs D\'Enfance' },
]

export function musicIdToUrl(id) {
  return id ? `https://www.youtube.com/watch?v=${id}` : ''
}

export function musicUrlToId(url) {
  if (!url) return ''
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/embed\/([^?]+)/)
  return m ? m[1] : ''
}

export function randomMusicUrl() {
  const track = MUSIC_POOL[Math.floor(Math.random() * MUSIC_POOL.length)]
  return musicIdToUrl(track.id)
}

// Build the actual slide sequence for the public slideshow player.
// Text blocks always included; images excluded if their URL is in the excluded set.
export function buildSlideSequence(blocks, excluded = []) {
  const excludedSet = new Set(excluded)
  const sequence = []
  for (const b of blocks || []) {
    if (b.type === 'text' && b.content) {
      sequence.push({ type: 'text', content: b.content })
    } else if (b.type === 'photo' && b.imageUrl) {
      if (!excludedSet.has(b.imageUrl)) sequence.push({ type: 'image', url: b.imageUrl, caption: b.caption || '' })
    } else if (b.type === 'photos' || b.type === 'stacked' || b.type === 'masonry') {
      const images = (b.images || []).length ? b.images : (b.imageUrls || []).map(url => ({ url }))
      for (const img of images) {
        if (img?.url && !excludedSet.has(img.url)) sequence.push({ type: 'image', url: img.url, caption: img.caption || '' })
      }
    }
  }
  return sequence
}

// Build the preview sequence for the config popup.
// Same ordering as buildSlideSequence but includes excluded images with excluded: true
// so they can be shown dimmed in their correct position.
export function buildPreviewSequence(blocks, excluded = []) {
  const excludedSet = new Set(excluded)
  const sequence = []
  for (const b of blocks || []) {
    if (b.type === 'text' && b.content) {
      sequence.push({ type: 'text', content: b.content })
    } else if (b.type === 'photo' && b.imageUrl) {
      sequence.push({ type: 'image', url: b.imageUrl, caption: b.caption, excluded: excludedSet.has(b.imageUrl) })
    } else if (b.type === 'photos' || b.type === 'stacked' || b.type === 'masonry') {
      const images = (b.images || []).length ? b.images : (b.imageUrls || []).map(url => ({ url }))
      for (const img of images) {
        if (img?.url) sequence.push({ type: 'image', url: img.url, caption: img.caption, excluded: excludedSet.has(img.url) })
      }
    }
  }
  return sequence
}
