// Map a domain's nameservers to a known DNS provider + a deep link to its DNS panel.
// Pure — safe to import anywhere. The NS lookup itself happens server-side.

const PROVIDERS = [
  { id: 'godaddy',     match: ['domaincontrol.com'],                 name: 'GoDaddy',       url: (d) => `https://dcc.godaddy.com/control/dnsmanagement?domainName=${d}` },
  { id: 'namecheap',   match: ['registrar-servers.com'],            name: 'Namecheap',     url: (d) => `https://ap.www.namecheap.com/Domains/DomainControlPanel/${d}/advancedns` },
  { id: 'cloudflare',  match: ['cloudflare.com'],                    name: 'Cloudflare',    url: () => 'https://dash.cloudflare.com' },
  { id: 'squarespace', match: ['squarespacedns.com'],               name: 'Squarespace',   url: () => 'https://account.squarespace.com/domains' },
  { id: 'google',      match: ['googledomains.com', 'dns.google'],  name: 'Google Domains', url: () => 'https://domains.google.com/registrar' },
  { id: 'route53',     match: ['awsdns'],                            name: 'AWS Route 53',  url: () => 'https://console.aws.amazon.com/route53/v2/hostedzones' },
  { id: 'porkbun',     match: ['porkbun.com'],                       name: 'Porkbun',       url: () => 'https://porkbun.com/account/domainsSpeedy' },
  { id: 'namedotcom',  match: ['name.com'],                          name: 'Name.com',      url: (d) => `https://www.name.com/account/domain/details/${d}#dns` },
  { id: 'dnsimple',    match: ['dnsimple.com'],                      name: 'DNSimple',      url: () => 'https://dnsimple.com/dashboard' },
  { id: 'digitalocean',match: ['digitalocean.com'],                  name: 'DigitalOcean',  url: (d) => `https://cloud.digitalocean.com/networking/domains/${d}` },
  { id: 'hover',       match: ['hover.com'],                         name: 'Hover',         url: () => 'https://www.hover.com/control_panel/domains' },
  { id: 'ionos',       match: ['ui-dns.', '1and1.'],                 name: 'IONOS',         url: () => 'https://my.ionos.com/domains' },
  { id: 'wix',         match: ['wixdns.net'],                        name: 'Wix',           url: () => 'https://www.wix.com/my-account/domains' },
  { id: 'bluehost',    match: ['bluehost.com'],                      name: 'Bluehost',      url: () => 'https://my.bluehost.com' },
]

/**
 * @param {string[]} nameservers - NS hostnames for the domain
 * @param {string} domain - the registrable domain (used in deep links)
 * @returns {{ id: string, name: string|null, dnsUrl: string|null }}
 */
export function detectProvider(nameservers, domain) {
  const ns = (nameservers || []).map((s) => String(s).toLowerCase())
  for (const p of PROVIDERS) {
    if (ns.some((n) => p.match.some((m) => n.includes(m)))) {
      return { id: p.id, name: p.name, dnsUrl: p.url(domain) }
    }
  }
  return { id: 'unknown', name: null, dnsUrl: null }
}

/** The registrable (apex) domain for an NS lookup: photos.jane.com -> jane.com. */
export function registrableDomain(name) {
  const parts = String(name || '').split('.').filter(Boolean)
  return parts.length > 2 ? parts.slice(-2).join('.') : parts.join('.')
}
