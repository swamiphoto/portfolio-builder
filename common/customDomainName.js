// Read the display name of a site's custom domain, tolerating both shapes the
// shared site config can hold:
//   - legacy string: "photos.example.com"
//   - object (written by the domain-connection flow): { name, status, verification, ... }
// Rendering the object directly as a React child throws
// "Objects are not valid as a React child", so all UI reads must go through this.
export function customDomainName(customDomain) {
  if (!customDomain) return ''
  if (typeof customDomain === 'string') return customDomain
  if (typeof customDomain === 'object') return customDomain.name || ''
  return ''
}
