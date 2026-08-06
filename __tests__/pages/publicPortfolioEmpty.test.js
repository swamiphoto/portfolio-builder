import { render, screen } from '@testing-library/react'
import PublicPortfolio from '@/pages/sites/[username]/index'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/jane' }) }))
// SiteNav's OverflowNav uses ResizeObserver, absent in jsdom:
beforeAll(() => { global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} } })

const base = { assetsByUrl: {}, printStore: { paymentsReady: false, currency: 'USD' }, username: 'jane', basePath: '/sites/jane' }

describe('PublicPortfolio with zero pages', () => {
  it('renders the cover (with its button) when cover is on and there are no pages', () => {
    render(<PublicPortfolio {...base} siteConfig={{ siteName: 'Jane', hasCoverPage: true, cover: { buttonText: 'Enter' }, pages: [] }} />)
    expect(screen.getByText('Enter')).toBeInTheDocument()
  })

  it('renders an under-construction message when cover is off and there are no pages', () => {
    render(<PublicPortfolio {...base} siteConfig={{ siteName: 'Jane', hasCoverPage: false, cover: {}, design: { theme: 'kyoto' }, pages: [] }} />)
    expect(screen.getByText(/under construction/i)).toBeInTheDocument()
  })
})
