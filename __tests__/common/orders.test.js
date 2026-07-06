import { newOrderId } from '../../common/orders'

describe('newOrderId', () => {
  it('newOrderId is prefixed and unique', () => {
    const a = newOrderId(), b = newOrderId()
    expect(a).toMatch(/^ord_[0-9a-f-]{36}$/)
    expect(a).not.toBe(b)
  })
})
