import { photographerSaleEmail, buyerShippedEmail, fulfillmentFailedEmail } from '../../common/email/templates'

const order = {
  id: 'ord_1',
  spec: { size: '16x20', finish: 'lustre', frame: 'wood' },
  buyer: { name: 'Ada <b>', email: 'ada@example.com' },
  amounts: { profit: 10500, currency: 'USD' },
}

describe('photographerSaleEmail', () => {
  it('states the profit in dollars and the print size', () => {
    const m = photographerSaleEmail({ order, siteName: 'Ada Photo' })
    expect(m.subject).toMatch(/sold a print/i)
    expect(m.text).toMatch(/\$105\.00/)
    expect(m.text).toMatch(/16x20/)
  })
  it('escapes buyer name in HTML', () => {
    const m = photographerSaleEmail({ order, siteName: 'Ada Photo' })
    expect(m.html).toContain('Ada &lt;b&gt;')
    expect(m.html).not.toContain('Ada <b>')
  })
})

describe('buyerShippedEmail', () => {
  it('includes carrier, tracking number and a link', () => {
    const m = buyerShippedEmail({
      order, siteName: 'Ada Photo',
      tracking: { carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' },
    })
    expect(m.subject).toMatch(/shipped/i)
    expect(m.text).toMatch(/DHL/)
    expect(m.text).toMatch(/TRK1/)
    expect(m.html).toContain('https://track/TRK1')
  })
  it('handles missing tracking gracefully', () => {
    const m = buyerShippedEmail({ order, siteName: 'Ada Photo', tracking: null })
    expect(m.subject).toMatch(/shipped/i)
    expect(m.text).toMatch(/on its way/i)
  })
  it('escapes quotes in the tracking URL to prevent attribute injection', () => {
    const m = buyerShippedEmail({
      order, siteName: 'Ada Photo',
      tracking: { carrier: 'DHL', number: 'TRK1', url: 'https://track/"><script>' },
    })
    expect(m.html).toContain('&quot;')
    expect(m.html).not.toContain('href="https://track/"><script>"')
  })
})

describe('fulfillmentFailedEmail', () => {
  it('includes the order id, print spec, and action-needed subject', () => {
    const m = fulfillmentFailedEmail({ order, siteName: 'Ada Photo' })
    expect(m.subject).toMatch(/action needed/i)
    expect(m.text).toMatch(/ord_1/)
    expect(m.text).toMatch(/16x20/)
    expect(m.text).toMatch(/Ada Photo/)
  })
  it('escapes site name in HTML', () => {
    const m = fulfillmentFailedEmail({ order, siteName: '<Bad Site>' })
    expect(m.html).toContain('&lt;Bad Site&gt;')
    expect(m.html).not.toContain('<Bad Site>')
  })
})
