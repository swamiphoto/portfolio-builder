// Task 13: posterUrl helper — extract YouTube thumbnail URL from video URL
// react-player pulls in browser-only code; mock it so jsdom doesn't choke.
jest.mock('react-player', () => ({ __esModule: true, default: () => null }))

const { posterUrl } = require('../../components/image-displays/gallery/video-block/VideoBlock')

const YT_THUMB = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'

describe('posterUrl', () => {
  it('handles watch?v= form', () => {
    expect(posterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(YT_THUMB)
  })

  it('handles youtu.be/ short-link form', () => {
    expect(posterUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(YT_THUMB)
  })

  it('handles /embed/ form', () => {
    expect(posterUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(YT_THUMB)
  })

  it('returns null for non-YouTube URLs (e.g. Vimeo)', () => {
    expect(posterUrl('https://vimeo.com/123456789')).toBeNull()
  })

  it('returns null for empty/null input', () => {
    expect(posterUrl(null)).toBeNull()
    expect(posterUrl('')).toBeNull()
  })
})
