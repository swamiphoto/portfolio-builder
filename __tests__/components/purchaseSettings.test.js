import { addPackage, updatePackage, removePackage, dollarsToCents, centsToDollars } from '@/components/admin/platform/purchasePackages'

it('converts dollars to integer cents and back', () => {
  expect(dollarsToCents('40')).toBe(4000)
  expect(dollarsToCents('40.5')).toBe(4050)
  expect(dollarsToCents('')).toBe(0)
  expect(centsToDollars(15000)).toBe('150')
  expect(centsToDollars(4050)).toBe('40.5')
})

it('adds a package with a unique id and sensible defaults', () => {
  const list = addPackage([])
  expect(list).toHaveLength(1)
  expect(list[0]).toMatchObject({ label: '', credits: 10, price: 0 })
  expect(list[0].id).toMatch(/^pkg_/)
  expect(addPackage(list)[1].id).not.toBe(list[0].id)
})

it('updates a package field by id and removes by id', () => {
  let list = addPackage([])
  const id = list[0].id
  list = updatePackage(list, id, { label: 'Ten more', price: 4000 })
  expect(list[0]).toMatchObject({ label: 'Ten more', price: 4000 })
  list = updatePackage(list, id, { credits: 'all' })
  expect(list[0].credits).toBe('all')
  list = removePackage(list, id)
  expect(list).toHaveLength(0)
})
