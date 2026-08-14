// One-off icon generator. Renders the Sepia "S" mark (brown square + cream-gold
// serif S) into every raster size the site needs, plus a real multi-size .ico.
// Run: node scripts/gen-favicons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// Rounded variant — used for the browser tab (favicon.svg / .ico / small PNGs).
const rounded = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2614"/><stop offset="1" stop-color="#201209"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7dfb0"/><stop offset="0.45" stop-color="#ebc88a"/>
      <stop offset="0.85" stop-color="#c89968"/><stop offset="1" stop-color="#9d7849"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="112" fill="url(#bg)"/>
  <text x="256" y="386" font-family="Georgia, 'Times New Roman', 'Times', serif" font-size="380" font-weight="600" fill="url(#s)" text-anchor="middle">S</text>
</svg>`

// Full-bleed variant — used for app / apple-touch icons the OS masks itself.
const square = rounded.replace('rx="112"', 'rx="0"')

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
}

async function writePng(svg, size, name) {
  writeFileSync(join(pub, name), await png(svg, size))
  console.log('wrote', name)
}

// ICO container that embeds PNG entries (valid since Vista; tiny + crisp).
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = 6 + dir.length
  entries.forEach((e, i) => {
    const b = i * 16
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 0)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1)
    dir.writeUInt8(0, b + 2)
    dir.writeUInt8(0, b + 3)
    dir.writeUInt16LE(1, b + 4)
    dir.writeUInt16LE(32, b + 6)
    dir.writeUInt32LE(e.data.length, b + 8)
    dir.writeUInt32LE(offset, b + 12)
    offset += e.data.length
  })
  return Buffer.concat([header, dir, ...entries.map(e => e.data)])
}

const icoSizes = [16, 32, 48]
const icoEntries = []
for (const s of icoSizes) icoEntries.push({ size: s, data: await png(rounded, s) })
writeFileSync(join(pub, 'favicon.ico'), buildIco(icoEntries))
console.log('wrote favicon.ico')

await writePng(rounded, 16, 'favicon-16x16.png')
await writePng(rounded, 32, 'favicon-32x32.png')
await writePng(square, 180, 'apple-touch-icon.png')
await writePng(square, 192, 'logo192.png')
await writePng(square, 512, 'logo512.png')
await writePng(rounded, 512, 'logo.png')

// Social-share (Open Graph) card — 1200x630, brown ground + wordmark.
const og = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ob" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2e1e12"/><stop offset="1" stop-color="#160d06"/>
    </linearGradient>
    <linearGradient id="os" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7dfb0"/><stop offset="0.5" stop-color="#ebc88a"/>
      <stop offset="1" stop-color="#c89968"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="630" fill="url(#ob)"/>
  <text x="600" y="330" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="150" font-weight="500" fill="url(#os)" text-anchor="middle">Sepia</text>
  <text x="600" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="8" fill="#c9ab7e" text-anchor="middle">A PLATFORM FOR PHOTOGRAPHERS</text>
</svg>`
writeFileSync(join(pub, 'og-image.png'), await sharp(Buffer.from(og)).png().toBuffer())
console.log('wrote og-image.png')
