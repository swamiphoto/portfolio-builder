export const PROVIDER_ID = 'smugmug'
const smugmug = {
  id: PROVIDER_ID,
  label: 'SmugMug',
  icon: 'smugmug',
  enabled: true,
  detect(input) {
    try {
      return /(^|\.)smugmug\.com$/i.test(new URL(normalize(input)).hostname)
    } catch {
      return false
    }
  },
  async discover() {
    throw new Error('smugmug.discover not implemented yet')
  },
}
function normalize(input) {
  const s = String(input || '').trim()
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}
export default smugmug
