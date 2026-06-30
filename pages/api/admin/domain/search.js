import { withAuth } from '../../../../common/withAuth'
import { checkAvailability, getPrice } from '../../../../common/vercel'

const TLDS = ['com', 'photo', 'studio', 'gallery']
const REGISTRAR = () => process.env.REGISTRAR_SEARCH_URL
  || 'https://www.namecheap.com/domains/registration/results/?domain='

function candidates(q) {
  const clean = String(q || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '')
  if (!clean) return []
  const set = new Set()
  if (clean.includes('.')) set.add(clean)
  const base = clean.replace(/\..*$/, '')
  if (base) for (const tld of TLDS) set.add(`${base}.${tld}`)
  return [...set].slice(0, 6)
}

export async function handler(req, res) {
  const names = candidates(req.query.q)
  const results = await Promise.all(names.map(async (domain) => {
    const registrarUrl = `${REGISTRAR()}${encodeURIComponent(domain)}`
    try {
      const available = await checkAvailability(domain)
      const price = available ? (await getPrice(domain)).price : null
      return { domain, available, price, registrarUrl }
    } catch {
      return { domain, available: false, price: null, registrarUrl }
    }
  }))
  return res.status(200).json({ results })
}

export default withAuth(handler)
