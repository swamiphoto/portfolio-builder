import { amsterdamGroundPlan } from '@/common/themes/variants'

const B = (g) => (g ? { amsterdamGround: g } : {})

describe('amsterdamGroundPlan', () => {
  it('rotates black -> light -> red across auto blocks (title opener starts dark)', () => {
    const plan = amsterdamGroundPlan([B(), B(), B(), B()], { heroOpener: false })
    expect(plan.map((p) => p.ground)).toEqual(['dark', 'light', 'ink', 'dark'])
    expect(plan.map((p) => p.def)).toEqual(['dark', 'light', 'ink', 'dark'])
  })

  it('hero opener starts the rotation on light', () => {
    const plan = amsterdamGroundPlan([B(), B(), B()], { heroOpener: true })
    expect(plan.map((p) => p.ground)).toEqual(['light', 'ink', 'dark'])
  })

  it('pinned blocks keep their color and do not consume a rotation slot', () => {
    // Title opener autos would be dark, light, ink. Pinning block 1 to ink means it
    // still shows ink, its "default if auto" is light, and block 2 takes that light.
    const plan = amsterdamGroundPlan([B(), B('ink'), B()], { heroOpener: false })
    expect(plan.map((p) => p.ground)).toEqual(['dark', 'ink', 'light'])
    expect(plan[1].def).toBe('light')
  })
})
