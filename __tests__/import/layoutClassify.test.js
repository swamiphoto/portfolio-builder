/** @jest-environment node */
import { classifyLayout } from '@/common/import/composer'

const img = (n) => ({ kind: 'image', ref: `img-${n}`, src: `s${n}`, caption: '' })

it('classifies an images-only outline as gallery', () => {
  expect(classifyLayout([img(1), img(2), img(3), img(4)])).toBe('gallery')
})
it('classifies images + a single lead-in blurb as gallery', () => {
  expect(classifyLayout([{ kind: 'paragraph', text: 'A short intro.' }, img(1), img(2)])).toBe('gallery')
})
it('classifies an outline with a quote as designed', () => {
  expect(classifyLayout([img(1), { kind: 'quote', text: 'q', attribution: '' }, img(2)])).toBe('designed')
})
it('classifies an outline with link cards as designed', () => {
  expect(classifyLayout([img(1), { kind: 'linkcards', items: [{ href: 'a', label: 'A' }] }])).toBe('designed')
})
it('classifies interleaved prose between images as designed', () => {
  expect(classifyLayout([img(1), { kind: 'paragraph', text: 'x' }, img(2), { kind: 'paragraph', text: 'y' }])).toBe('designed')
})
it('classifies an empty outline as gallery', () => {
  expect(classifyLayout([])).toBe('gallery')
})
