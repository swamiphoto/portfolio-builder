import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useOnboarding } from '@/components/admin/onboarding/useOnboarding'

function Probe() {
  const { onboarding, loading, markSeen } = useOnboarding()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="tourDone">{String(!!onboarding.tourDone)}</span>
      <button onClick={() => markSeen('tourDone')}>mark</button>
    </div>
  )
}

describe('useOnboarding', () => {
  beforeEach(() => { if (!global.fetch) global.fetch = jest.fn() })
  afterEach(() => { jest.restoreAllMocks() })

  it('loads flags from the profile then marks one seen with a PATCH', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url, opts) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ onboarding: { welcomed: true } }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('tourDone').textContent).toBe('false')

    fireEvent.click(screen.getByText('mark'))
    expect(screen.getByTestId('tourDone').textContent).toBe('true') // optimistic
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(c => c[1] && c[1].method === 'PATCH')
      expect(patchCall).toBeTruthy()
      expect(JSON.parse(patchCall[1].body)).toEqual({ onboarding: { tourDone: true } })
    })
  })
})
