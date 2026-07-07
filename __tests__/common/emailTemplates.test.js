import { photographerSaleEmail, buyerShippedEmail } from '../../common/email/templates'

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
})
