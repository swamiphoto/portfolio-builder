export const PROVIDER_ID = 'generic'
const generic = {
  id: PROVIDER_ID,
  label: 'Website',
  icon: 'globe',
  enabled: true,
  detect() {
    return true // universal fallback — matches anything
  },
  async discover() {
    throw new Error('generic.discover not implemented yet')
  },
}
export default generic
