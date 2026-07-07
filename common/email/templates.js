// Pure transactional email builders -> { subject, html, text }.

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function dollars(cents, currency = 'USD') {
  const v = (cents / 100).toFixed(2)
  return currency === 'USD' ? `$${v}` : `${v} ${currency}`
}

function specLine(spec) {
  const frame = spec.frame && spec.frame !== 'none' ? `, ${spec.frame} frame` : ''
  return `${spec.size} ${spec.finish}${frame}`
}

export function photographerSaleEmail({ order, siteName }) {
  const profit = dollars(order.amounts.profit, order.amounts.currency)
  const line = specLine(order.spec)
  const subject = `You sold a print (+${profit})`
  const text = `Great news — someone bought a print from ${siteName}.\n\n` +
    `Print: ${line}\nYour profit: ${profit}\n\n` +
    `Prodigi prints and ships it automatically. Track it in your Orders view.`
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;color:#1a1410;line-height:1.6;">` +
    `<p>Great news — <strong>${esc(order.buyer.name)}</strong> bought a print from <strong>${esc(siteName)}</strong>.</p>` +
    `<p><strong>Print:</strong> ${esc(line)}<br><strong>Your profit:</strong> ${esc(profit)}</p>` +
    `<p>Prodigi prints and ships it automatically. Track it in your Orders view.</p></div>`
  return { subject, html, text }
}

export function buyerShippedEmail({ order, tracking, siteName }) {
  const line = specLine(order.spec)
  const subject = `Your print has shipped`
  let trackText, trackHtml
  if (tracking && tracking.number) {
    const carrier = tracking.carrier || 'the carrier'
    trackText = `Carrier: ${carrier}\nTracking: ${tracking.number}` +
      (tracking.url ? `\nTrack it: ${tracking.url}` : '')
    trackHtml = `<p><strong>Carrier:</strong> ${esc(carrier)}<br><strong>Tracking:</strong> ${esc(tracking.number)}` +
      (tracking.url ? `<br><a href="${esc(tracking.url)}">Track your package</a>` : '') + `</p>`
  } else {
    trackText = `Your order is on its way; tracking details will follow.`
    trackHtml = `<p>Your order is on its way; tracking details will follow.</p>`
  }
  const text = `Your print from ${siteName} has shipped.\n\nPrint: ${line}\n\n${trackText}`
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;color:#1a1410;line-height:1.6;">` +
    `<p>Your print from <strong>${esc(siteName)}</strong> has shipped.</p>` +
    `<p><strong>Print:</strong> ${esc(line)}</p>${trackHtml}</div>`
  return { subject, html, text }
}
