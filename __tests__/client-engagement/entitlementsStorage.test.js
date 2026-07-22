import { emptyEngagement } from '@/common/clientEngagement'

describe('engagement storage carries entitlements', () => {
  it('emptyEngagement includes an empty entitlements map', () => {
    expect(emptyEngagement().entitlements).toEqual({})
  })
})
